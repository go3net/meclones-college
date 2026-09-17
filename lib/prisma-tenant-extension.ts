/**
 * Prisma client extension that makes every query tenant-scoped.
 *
 * For each model carrying a `schoolId` column ("tenant models", derived
 * from the schema at load time), the current school's id is:
 *   - added to `where` on every read / update / delete operation
 *     (Prisma 5 lets extra filters ride along on unique lookups), and
 *   - stamped into `data` on create / createMany / upsert, including
 *     nested creates reached through relation fields, so
 *     `student.create({ data: { user: { create } } })` stamps both rows.
 *
 * Any `schoolId` a caller supplies in write data is discarded, so a row
 * can never be created for, or moved to, another tenant through the
 * scoped client. Deliberate cross-tenant work uses `prismaBase`.
 *
 * The current school comes from lib/tenant.ts (explicit context, host,
 * or session). When nothing resolves, TENANT_ENFORCEMENT decides:
 *   warn   (default) log once per model+operation and run unscoped
 *   strict          throw TenantContextError
 */

import { Prisma } from "@prisma/client";
import { getCurrentSchool } from "./tenant";

type AnyRecord = Record<string, unknown>;

interface RelationField {
  field: string;
  target: string;
}

const MODELS = Prisma.dmmf.datamodel.models;

/** Names of every model that has a `schoolId` scalar. */
export const TENANT_MODELS: ReadonlySet<string> = new Set(
  MODELS.filter(m => m.fields.some(f => f.name === "schoolId")).map(m => m.name),
);

/** model name -> its relation fields (name + target model). */
const RELATIONS = new Map<string, RelationField[]>(
  MODELS.map(m => [
    m.name,
    m.fields.filter(f => f.kind === "object").map(f => ({ field: f.name, target: f.type })),
  ]),
);

export class TenantContextError extends Error {
  constructor(model: string, operation: string) {
    super(`[tenant] ${model}.${operation} ran with no school context`);
    this.name = "TenantContextError";
  }
}

function enforcement(): "warn" | "strict" {
  return (process.env.TENANT_ENFORCEMENT ?? "warn").trim().toLowerCase() === "strict" ? "strict" : "warn";
}

// ─── Missing-context reporting ──────────────────────────────────────

const missing = new Map<string, number>();

function reportMissing(model: string, operation: string) {
  const key = `${model}.${operation}`;
  const n = (missing.get(key) ?? 0) + 1;
  missing.set(key, n);
  // First hit gets a stack so the call site is findable; then every 100th.
  if (n === 1 || n % 100 === 0) {
    const stack = (new Error().stack ?? "").split("\n").slice(3, 9).join("\n");
    console.warn(`[tenant] missing school context for ${key} (x${n}); running unscoped\n${stack}`);
  }
}

/** Snapshot of unscoped-query counters (surfaced by /api/health/host). */
export function missingContextStats(): Record<string, number> {
  return Object.fromEntries(missing);
}

// ─── Injection helpers ──────────────────────────────────────────────

function isRecord(v: unknown): v is AnyRecord {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function scope(where: unknown, schoolId: string): AnyRecord {
  return { ...(isRecord(where) ? where : {}), schoolId };
}

/** Stamp a create payload for `model` (and anything nested in it). */
function stamp(model: string, data: unknown, schoolId: string): unknown {
  if (!isRecord(data)) return data;
  const out = stampNested(model, data, schoolId) as AnyRecord;
  if (TENANT_MODELS.has(model)) {
    delete out.schoolId;
    out.schoolId = schoolId;
  }
  return out;
}

function stampEach(model: string, data: unknown, schoolId: string): unknown {
  return Array.isArray(data) ? data.map(d => stamp(model, d, schoolId)) : stamp(model, data, schoolId);
}

/**
 * Walk the relation fields of a create/update payload and stamp every
 * nested write that creates rows (create, createMany, connectOrCreate,
 * and the create half of upsert). Nested updates recurse so deeper
 * creates are found too. Returns a shallow copy; never mutates input.
 */
function stampNested(model: string, data: unknown, schoolId: string): unknown {
  if (!isRecord(data)) return data;
  const relations = RELATIONS.get(model);
  if (!relations || relations.length === 0) return { ...data };

  const out: AnyRecord = { ...data };
  if (TENANT_MODELS.has(model) && "schoolId" in out) {
    // A caller may not re-home a row via update data.
    delete out.schoolId;
  }

  for (const { field, target } of relations) {
    const value = out[field];
    if (!isRecord(value)) continue;
    const next: AnyRecord = { ...value };

    if ("create" in next) next.create = stampEach(target, next.create, schoolId);

    if (isRecord(next.createMany)) {
      next.createMany = { ...next.createMany, data: stampEach(target, next.createMany.data, schoolId) };
    }

    if ("connectOrCreate" in next) {
      const coc = next.connectOrCreate;
      const fix = (entry: unknown) =>
        isRecord(entry)
          ? {
              ...entry,
              where: TENANT_MODELS.has(target) ? scope(entry.where, schoolId) : entry.where,
              create: stamp(target, entry.create, schoolId),
            }
          : entry;
      next.connectOrCreate = Array.isArray(coc) ? coc.map(fix) : fix(coc);
    }

    if ("upsert" in next) {
      const up = next.upsert;
      const fix = (entry: unknown) =>
        isRecord(entry)
          ? {
              ...entry,
              create: stamp(target, entry.create, schoolId),
              update: stampNested(target, entry.update, schoolId),
            }
          : entry;
      next.upsert = Array.isArray(up) ? up.map(fix) : fix(up);
    }

    if ("update" in next) {
      const upd = next.update;
      const fix = (entry: unknown) => {
        if (!isRecord(entry)) return entry;
        // to-many nested update is { where, data }; to-one is the data itself
        // (or { data } in newer shapes). Recurse into whichever holds fields.
        if (isRecord(entry.data)) return { ...entry, data: stampNested(target, entry.data, schoolId) };
        return stampNested(target, entry, schoolId);
      };
      next.update = Array.isArray(upd) ? upd.map(fix) : fix(upd);
    }

    out[field] = next;
  }
  return out;
}

// ─── The extension ──────────────────────────────────────────────────

export const tenantExtension = Prisma.defineExtension(client =>
  client.$extends({
    name: "tenant-scope",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!model || !TENANT_MODELS.has(model)) return query(args);

          // Build-time page-data collection has no request and no tenant;
          // stay quiet and unscoped there.
          if (process.env.NEXT_PHASE === "phase-production-build") return query(args);

          const school = await getCurrentSchool();
          if (!school) {
            if (enforcement() === "strict") throw new TenantContextError(model, operation);
            reportMissing(model, operation);
            return query(args);
          }

          const sid = school.id;
          const a: AnyRecord = { ...(isRecord(args) ? args : {}) };

          switch (operation) {
            case "create":
              a.data = stamp(model, a.data, sid);
              break;
            case "createMany":
            case "createManyAndReturn":
              a.data = stampEach(model, a.data, sid);
              break;
            case "update":
              a.where = scope(a.where, sid);
              a.data = stampNested(model, a.data, sid);
              break;
            case "upsert":
              a.where = scope(a.where, sid);
              a.create = stamp(model, a.create, sid);
              a.update = stampNested(model, a.update, sid);
              break;
            case "findUnique":
            case "findUniqueOrThrow":
            case "findFirst":
            case "findFirstOrThrow":
            case "findMany":
            case "count":
            case "aggregate":
            case "groupBy":
            case "updateMany":
            case "delete":
            case "deleteMany":
              a.where = scope(a.where, sid);
              break;
            default:
              // Unknown / raw-style operations pass through untouched.
              break;
          }
          return query(a as typeof args);
        },
      },
    },
  }),
);

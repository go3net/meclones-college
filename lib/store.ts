"use client";

// Tiny localStorage-backed store layered on top of the seed data.
// Lets prototype actions (apply, pay, mark attendance, send WhatsApp) feel "real" across reloads.

import {
  APPLICATIONS, WHATSAPP_LOGS, INVOICES, PAYMENTS, ATTENDANCE, COMPLAINTS, ANNOUNCEMENTS, ASSIGNMENTS, RESULTS,
  Application, WhatsAppLog, Invoice, Payment, AttendanceRecord, Complaint, Announcement, Assignment, Result,
} from "./mock-data";

type StoreState = {
  applications: Application[];
  whatsappLogs: WhatsAppLog[];
  invoices: Invoice[];
  payments: Payment[];
  attendance: AttendanceRecord[];
  complaints: Complaint[];
  announcements: Announcement[];
  assignments: Assignment[];
  results: Result[];
};

const KEY = "meclones_store_v1";

function defaultState(): StoreState {
  return {
    applications: [...APPLICATIONS],
    whatsappLogs: [...WHATSAPP_LOGS],
    invoices: [...INVOICES],
    payments: [...PAYMENTS],
    attendance: [...ATTENDANCE],
    complaints: [...COMPLAINTS],
    announcements: [...ANNOUNCEMENTS],
    assignments: [...ASSIGNMENTS],
    results: [...RESULTS],
  };
}

export function loadStore(): StoreState {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return defaultState();
    return JSON.parse(raw) as StoreState;
  } catch {
    return defaultState();
  }
}

export function saveStore(state: StoreState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(state));
}

export function resetStore() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}

export function updateStore(mutator: (s: StoreState) => StoreState | void): StoreState {
  const current = loadStore();
  const next = mutator(current) ?? current;
  saveStore(next);
  return next;
}

// ---- WhatsApp helpers ----

export function pushWhatsApp(log: Omit<WhatsAppLog, "id" | "timestamp" | "status">) {
  return updateStore(s => {
    s.whatsappLogs.unshift({
      ...log,
      id: "wa-" + Date.now(),
      timestamp: new Date().toISOString().slice(0, 16).replace("T", " "),
      status: "sent",
    });
  });
}

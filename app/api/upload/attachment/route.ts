import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-helpers";
import { uploadAttachment } from "@/lib/cloudinary";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

/**
 * Generic attachment uploader for in-portal messages and similar features.
 * Accepts image/jpeg, image/png, image/webp, image/gif and application/pdf
 * up to 5 MB. Returns { url, name, mime, size }.
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json({ error: "Unsupported file type. JPG, PNG, WebP, GIF or PDF only." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: `File too large. Max ${MAX_BYTES / 1024 / 1024} MB.` }, { status: 413 });
  }

  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    return NextResponse.json({ error: "File hosting is not configured on the server." }, { status: 500 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadAttachment(buffer, file.name || "attachment", {
      folder: "meclones/messages",
    });
    return NextResponse.json({
      url: result.secure_url,
      publicId: result.public_id,
      name: file.name || "attachment",
      mime: file.type,
      size: file.size,
    });
  } catch (err) {
    console.error("[upload/attachment] cloudinary error", err);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 502 });
  }
}

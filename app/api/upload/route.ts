import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-helpers";
import { uploadProfilePhoto } from "@/lib/cloudinary";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * Accepts a multipart upload (`file` field) and streams it to Cloudinary
 * for storage in the school's profile-photos folder. Returns the secure
 * URL the caller should save to the relevant `User.image` or
 * `Student.photoUrl` column.
 *
 * Auth-gated — every signed-in user can upload (the caller is responsible
 * for restricting *whose* photo they update; e.g. profile page updates the
 * caller's own User.image, while admin forms update other users).
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
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Unsupported image type. JPG, PNG or WebP only." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: `File too large. Max ${MAX_BYTES / 1024 / 1024} MB.` }, { status: 413 });
  }

  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    return NextResponse.json({ error: "Image hosting is not configured on the server." }, { status: 500 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadProfilePhoto(buffer);
    return NextResponse.json({ url: result.secure_url, publicId: result.public_id });
  } catch (err) {
    console.error("[upload] cloudinary error", err);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 502 });
  }
}

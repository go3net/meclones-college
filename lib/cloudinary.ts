import { v2 as cloudinary } from "cloudinary";

let configured = false;

export function getCloudinary() {
  if (!configured && process.env.CLOUDINARY_CLOUD_NAME) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    configured = true;
  }
  return cloudinary;
}

export async function uploadBase64(file: string, folder = "meclones") {
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    console.log("[cloudinary stub] uploadBase64");
    return { secure_url: "", public_id: "" };
  }
  const c = getCloudinary();
  const result = await c.uploader.upload(file, { folder });
  return { secure_url: result.secure_url, public_id: result.public_id };
}

/**
 * Upload a buffer of image bytes to Cloudinary as a profile photo. Uses
 * `image` resource type with face-centred 600×600 incoming transform.
 */
export async function uploadProfilePhoto(buffer: Buffer, opts?: { folder?: string }) {
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    console.log("[cloudinary stub] uploadProfilePhoto");
    return { secure_url: "", public_id: "" };
  }
  const c = getCloudinary();
  const folder = opts?.folder ?? "meclones/profiles";

  return new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
    const stream = c.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        transformation: [
          { width: 600, height: 600, crop: "fill", gravity: "face" },
          { quality: "auto", fetch_format: "auto" },
        ],
        overwrite: true,
      },
      (err, result) => {
        if (err || !result) return reject(err ?? new Error("Upload failed"));
        resolve({ secure_url: result.secure_url, public_id: result.public_id });
      },
    );
    stream.end(buffer);
  });
}

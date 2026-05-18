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

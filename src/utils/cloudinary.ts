import { unlink } from "node:fs/promises";
import { v2 as cloudinary } from "cloudinary";
import createHttpError from "http-errors";
import logger from "../logger.ts";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export async function uploadToCloudinary(filePath: string): Promise<string> {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: "announcements",
      resource_type: "image",
    });
    return result.secure_url;
  } catch (err) {
    logger.error({ err }, "Cloudinary upload failed");
    throw createHttpError(502, "Image upload failed");
  } finally {
    await unlink(filePath);
  }
}

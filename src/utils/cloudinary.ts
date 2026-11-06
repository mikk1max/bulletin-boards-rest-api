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

export interface UploadedImage {
  url: string;
  publicId: string;
}

export async function uploadToCloudinary(filePath: string): Promise<UploadedImage> {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: "announcements",
      resource_type: "image",
    });
    return { url: result.secure_url, publicId: result.public_id };
  } catch (err) {
    logger.error({ err }, "Cloudinary upload failed");
    throw createHttpError(502, "Image upload failed", { expose: true });
  } finally {
    await unlink(filePath);
  }
}

export async function deleteFromCloudinary(publicId: string) {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
    logger.info({ publicId }, "Image deleted from Cloudinary");
  } catch (err) {
    // The database is already updated, so a leftover image is only logged
    logger.warn({ err, publicId }, "Failed to delete image from Cloudinary");
  }
}

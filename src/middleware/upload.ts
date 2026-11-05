import { randomUUID } from "node:crypto";
import { unlink } from "node:fs/promises";
import path from "node:path";
import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import multer from "multer";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (_req, file, callback) => {
    callback(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) return callback(null, true);
    callback(createHttpError(400, "Only JPEG, PNG, WebP and GIF images are allowed"));
  },
});

export function uploadImage(req: Request, res: Response, next: NextFunction) {
  upload.single("image")(req, res, (err) => {
    // Safety net: removes the temp file if the request fails before it reaches Cloudinary
    if (req.file) {
      const filePath = req.file.path;
      res.on("close", () => unlink(filePath).catch(() => {}));
    }

    if (err instanceof multer.MulterError) {
      return next(createHttpError(400, err.message));
    }
    next(err);
  });
}

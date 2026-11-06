import type { Request, Response } from "express";
import createHttpError from "http-errors";
import prisma from "../../prisma/client.ts";
import logger from "../logger.ts";
import { deleteFromCloudinary, uploadToCloudinary } from "../utils/cloudinary.ts";
import type { Prisma } from "../../generated/prisma/client.ts";
import { publicUserSelect } from "./auth.controller.ts";
import type {
  AnnouncementIdParams,
  CreateAnnouncementBody,
  ListAnnouncementsQuery,
  UpdateAnnouncementBody,
} from "../validators/announcements.validator.ts";

const PER_PAGE = 10;

const announcementSelect = {
  id: true,
  title: true,
  description: true,
  price: true,
  category: true,
  imageUrl: true,
  createdAt: true,
  updatedAt: true,
  user: { select: publicUserSelect },
} as const;

async function findOwnAnnouncement(id: number, userId: number) {
  const announcement = await prisma.announcement.findUnique({
    where: { id },
    select: { userId: true, imagePublicId: true },
  });

  if (!announcement) {
    throw createHttpError(404, "Announcement not found");
  }

  if (announcement.userId !== userId) {
    throw createHttpError(403, "Access denied");
  }

  return announcement;
}

async function uploadAnnouncementImage(file: Express.Multer.File, userId: number) {
  const image = await uploadToCloudinary(file.path);
  logger.info({ userId, imageUrl: image.url }, "Image uploaded to Cloudinary");

  return { imageUrl: image.url, imagePublicId: image.publicId };
}

export async function listAnnouncements(req: Request, res: Response) {
  const { search, sort, page } = req.query as unknown as ListAnnouncementsQuery;

  const where: Prisma.AnnouncementWhereInput = search
    ? { title: { contains: search, mode: "insensitive" } }
    : {};

  const [data, total] = await Promise.all([
    prisma.announcement.findMany({
      where,
      orderBy: { createdAt: sort === "oldest" ? "asc" : "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: announcementSelect,
    }),
    prisma.announcement.count({ where }),
  ]);

  res.json({
    data,
    pagination: {
      total,
      page,
      totalPages: Math.ceil(total / PER_PAGE),
      perPage: PER_PAGE,
    },
  });
}

export async function getAnnouncement(req: Request, res: Response) {
  const { id } = req.params as unknown as AnnouncementIdParams;

  const announcement = await prisma.announcement.findUnique({
    where: { id },
    select: announcementSelect,
  });

  if (!announcement) {
    throw createHttpError(404, "Announcement not found");
  }

  res.json(announcement);
}

export async function createAnnouncement(req: Request, res: Response) {
  const body = req.body as CreateAnnouncementBody;
  const userId = req.user!.sub;
  const image = req.file ? await uploadAnnouncementImage(req.file, userId) : undefined;

  const announcement = await prisma.announcement.create({
    data: { ...body, ...image, userId },
    select: announcementSelect,
  });

  logger.info({ announcementId: announcement.id, userId }, "Announcement created");

  res.status(201).json(announcement);
}

export async function updateAnnouncement(req: Request, res: Response) {
  const { id } = req.params as unknown as AnnouncementIdParams;

  const userId = req.user!.sub;
  const current = await findOwnAnnouncement(id, userId);

  const body = req.body as UpdateAnnouncementBody;
  const image = req.file ? await uploadAnnouncementImage(req.file, userId) : undefined;

  const announcement = await prisma.announcement.update({
    where: { id },
    data: { ...body, ...image },
    select: announcementSelect,
  });

  logger.info({ announcementId: id, userId }, "Announcement updated");

  // The old image is removed only after the new one is saved
  if (image && current.imagePublicId) {
    await deleteFromCloudinary(current.imagePublicId);
  }

  res.json(announcement);
}

export async function deleteAnnouncement(req: Request, res: Response) {
  const { id } = req.params as unknown as AnnouncementIdParams;

  const userId = req.user!.sub;
  const { imagePublicId } = await findOwnAnnouncement(id, userId);

  await prisma.announcement.delete({ where: { id } });
  logger.info({ announcementId: id, userId }, "Announcement deleted");

  if (imagePublicId) {
    await deleteFromCloudinary(imagePublicId);
  }

  res.status(204).end();
}

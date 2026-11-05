import type { Request, Response } from "express";
import createHttpError from "http-errors";
import prisma from "../../prisma/client.ts";
import logger from "../logger.ts";
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
  createdAt: true,
  updatedAt: true,
  user: { select: publicUserSelect },
} as const;

async function assertOwnership(id: number, userId: number) {
  const announcement = await prisma.announcement.findUnique({
    where: { id },
    select: { userId: true },
  });

  if (!announcement) {
    throw createHttpError(404, "Announcement not found");
  }

  if (announcement.userId !== userId) {
    throw createHttpError(403, "Access denied");
  }
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

  const announcement = await prisma.announcement.create({
    data: { ...body, userId: req.user!.sub },
    select: announcementSelect,
  });

  logger.info({ announcementId: announcement.id, userId: req.user!.sub }, "Announcement created");

  res.status(201).json(announcement);
}

export async function updateAnnouncement(req: Request, res: Response) {
  const { id } = req.params as unknown as AnnouncementIdParams;

  await assertOwnership(id, req.user!.sub);

  const announcement = await prisma.announcement.update({
    where: { id },
    data: req.body as UpdateAnnouncementBody,
    select: announcementSelect,
  });

  logger.info({ announcementId: id, userId: req.user!.sub }, "Announcement updated");

  res.json(announcement);
}

export async function deleteAnnouncement(req: Request, res: Response) {
  const { id } = req.params as unknown as AnnouncementIdParams;

  await assertOwnership(id, req.user!.sub);

  await prisma.announcement.delete({ where: { id } });
  logger.info({ announcementId: id, userId: req.user!.sub }, "Announcement deleted");

  res.status(204).end();
}

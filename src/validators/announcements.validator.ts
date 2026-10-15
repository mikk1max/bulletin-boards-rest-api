import { z } from "../openapi.ts";
import { publicUserSchema } from "./auth.validator.ts";

export const CATEGORIES = ["sale", "service", "job", "other"] as const;

const announcementFields = {
  title: z.string().trim().min(5).max(50).openapi({ example: "Selling a bicycle" }),
  description: z.string().trim().min(10).openapi({ example: "Mountain bike, 21 speeds" }),
  price: z.number().positive().openapi({ example: 8000 }),
  category: z.enum(CATEGORIES).openapi({ example: "sale" }),
};

export const createAnnouncementSchema = z
  .object(announcementFields)
  .openapi("CreateAnnouncementRequest");

export const updateAnnouncementSchema = z
  .object(announcementFields)
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  })
  .openapi("UpdateAnnouncementRequest");

export const announcementIdSchema = z.object({
  id: z.coerce.number().int().positive().openapi({ example: 1 }),
});

export const listAnnouncementsQuerySchema = z.object({
  search: z.string().trim().optional().openapi({ description: "Case-insensitive search by title" }),
  sort: z.enum(["newest", "oldest"]).default("newest"),
  page: z.coerce.number().int().positive().default(1),
});

export const announcementSchema = z
  .object({
    id: z.number().int().openapi({ example: 6 }),
    ...announcementFields,
    createdAt: z.iso.datetime().openapi({ example: "2025-01-11T10:00:00.000Z" }),
    updatedAt: z.iso.datetime().openapi({ example: "2025-01-11T10:00:00.000Z" }),
    user: publicUserSchema,
  })
  .openapi("Announcement");

export const announcementListSchema = z
  .object({
    data: z.array(announcementSchema),
    pagination: z.object({
      total: z.number().int().openapi({ example: 23 }),
      page: z.number().int().openapi({ example: 2 }),
      totalPages: z.number().int().openapi({ example: 3 }),
      perPage: z.number().int().openapi({ example: 10 }),
    }),
  })
  .openapi("AnnouncementList");

export type CreateAnnouncementBody = z.infer<typeof createAnnouncementSchema>;
export type UpdateAnnouncementBody = z.infer<typeof updateAnnouncementSchema>;
export type AnnouncementIdParams = z.infer<typeof announcementIdSchema>;
export type ListAnnouncementsQuery = z.infer<typeof listAnnouncementsQuerySchema>;

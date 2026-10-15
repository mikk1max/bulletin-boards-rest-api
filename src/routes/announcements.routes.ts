import { Router } from "express";
import * as announcementsController from "../controllers/announcements.controller.ts";
import { authenticate } from "../middleware/authenticate.ts";
import { validateBody, validateParams, validateQuery } from "../middleware/validate.ts";
import {
  errorResponse,
  jsonContent,
  registry,
  validationErrorResponse,
} from "../openapi.ts";
import {
  announcementIdSchema,
  announcementListSchema,
  announcementSchema,
  createAnnouncementSchema,
  listAnnouncementsQuerySchema,
  updateAnnouncementSchema,
} from "../validators/announcements.validator.ts";

const router = Router();

router.get(
  "/",
  validateQuery(listAnnouncementsQuerySchema),
  announcementsController.listAnnouncements,
);
router.get(
  "/:id",
  validateParams(announcementIdSchema),
  announcementsController.getAnnouncement,
);
router.post(
  "/",
  authenticate,
  validateBody(createAnnouncementSchema),
  announcementsController.createAnnouncement,
);
router.patch(
  "/:id",
  authenticate,
  validateParams(announcementIdSchema),
  validateBody(updateAnnouncementSchema),
  announcementsController.updateAnnouncement,
);
router.delete(
  "/:id",
  authenticate,
  validateParams(announcementIdSchema),
  announcementsController.deleteAnnouncement,
);

export default router;

const unauthorized = errorResponse("Missing or invalid access token");
const notFound = errorResponse("Announcement not found");
const forbidden = errorResponse("Access denied");

registry.registerPath({
  method: "get",
  path: "/announcements",
  tags: ["Announcements"],
  summary: "List announcements with pagination, search and sorting",
  request: { query: listAnnouncementsQuerySchema },
  responses: {
    200: { description: "Paginated list (10 per page)", ...jsonContent(announcementListSchema) },
    400: validationErrorResponse,
  },
});

registry.registerPath({
  method: "get",
  path: "/announcements/{id}",
  tags: ["Announcements"],
  summary: "Get an announcement by ID",
  request: { params: announcementIdSchema },
  responses: {
    200: { description: "Announcement", ...jsonContent(announcementSchema) },
    400: validationErrorResponse,
    404: notFound,
  },
});

registry.registerPath({
  method: "post",
  path: "/announcements",
  tags: ["Announcements"],
  summary: "Create an announcement",
  security: [{ bearerAuth: [] }],
  request: { body: jsonContent(createAnnouncementSchema) },
  responses: {
    201: { description: "Announcement created", ...jsonContent(announcementSchema) },
    400: validationErrorResponse,
    401: unauthorized,
  },
});

registry.registerPath({
  method: "patch",
  path: "/announcements/{id}",
  tags: ["Announcements"],
  summary: "Partially update own announcement",
  security: [{ bearerAuth: [] }],
  request: { params: announcementIdSchema, body: jsonContent(updateAnnouncementSchema) },
  responses: {
    200: { description: "Announcement updated", ...jsonContent(announcementSchema) },
    400: validationErrorResponse,
    401: unauthorized,
    403: forbidden,
    404: notFound,
  },
});

registry.registerPath({
  method: "delete",
  path: "/announcements/{id}",
  tags: ["Announcements"],
  summary: "Delete own announcement",
  security: [{ bearerAuth: [] }],
  request: { params: announcementIdSchema },
  responses: {
    204: { description: "Announcement deleted" },
    400: validationErrorResponse,
    401: unauthorized,
    403: forbidden,
    404: notFound,
  },
});

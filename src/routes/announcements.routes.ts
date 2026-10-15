import { Router } from "express";
import * as announcementsController from "../controllers/announcements.controller.ts";
import { authenticate } from "../middleware/authenticate.ts";
import { validateBody, validateParams, validateQuery } from "../middleware/validate.ts";
import {
  announcementIdSchema,
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

import { Router } from "express";
import * as authController from "../controllers/auth.controller.ts";
import { authenticate } from "../middleware/authenticate.ts";
import { authLimiter } from "../middleware/rateLimit.ts";
import { validateBody } from "../middleware/validate.ts";
import {
  errorResponse,
  jsonContent,
  registry,
  validationErrorResponse,
} from "../openapi.ts";
import {
  authResponseSchema,
  loginSchema,
  profileSchema,
  refreshSchema,
  registerSchema,
  tokenPairSchema,
} from "../validators/auth.validator.ts";

const router = Router();

router.use(authLimiter);

router.post("/register", validateBody(registerSchema), authController.register);
router.post("/login", validateBody(loginSchema), authController.login);
router.post("/refresh", validateBody(refreshSchema), authController.refresh);
router.post("/logout", authenticate, authController.logout);
router.get("/me", authenticate, authController.me);

export default router;

registry.registerPath({
  method: "post",
  path: "/auth/register",
  tags: ["Auth"],
  summary: "Register a new user",
  request: { body: jsonContent(registerSchema) },
  responses: {
    201: { description: "User created", ...jsonContent(authResponseSchema) },
    400: validationErrorResponse,
    409: errorResponse("Username or email already taken"),
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/login",
  tags: ["Auth"],
  summary: "Log in with username and password",
  request: { body: jsonContent(loginSchema) },
  responses: {
    200: { description: "Logged in", ...jsonContent(authResponseSchema) },
    400: validationErrorResponse,
    401: errorResponse("Invalid credentials"),
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/refresh",
  tags: ["Auth"],
  summary: "Get a new token pair using a refresh token",
  request: { body: jsonContent(refreshSchema) },
  responses: {
    200: { description: "New token pair", ...jsonContent(tokenPairSchema) },
    400: validationErrorResponse,
    401: errorResponse("Invalid refresh token"),
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/logout",
  tags: ["Auth"],
  summary: "Log out and invalidate the refresh token",
  security: [{ bearerAuth: [] }],
  responses: {
    204: { description: "Logged out" },
    401: errorResponse("Missing or invalid access token"),
  },
});

registry.registerPath({
  method: "get",
  path: "/auth/me",
  tags: ["Auth"],
  summary: "Get the current user's profile",
  security: [{ bearerAuth: [] }],
  responses: {
    200: { description: "Current user", ...jsonContent(profileSchema) },
    401: errorResponse("Missing or invalid access token"),
  },
});

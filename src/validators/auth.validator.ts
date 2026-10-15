import { z } from "../openapi.ts";

export const registerSchema = z
  .object({
    username: z.string().trim().min(3).max(30).openapi({ example: "ivan_petrenko" }),
    email: z.email().openapi({ example: "ivan@example.com" }),
    password: z.string().min(6).openapi({ example: "secret123" }),
    name: z.string().trim().min(2).openapi({ example: "Ivan" }),
  })
  .openapi("RegisterRequest");

export const loginSchema = z
  .object({
    username: z.string().trim().min(1).openapi({ example: "ivan_petrenko" }),
    password: z.string().min(1).openapi({ example: "secret123" }),
  })
  .openapi("LoginRequest");

export const refreshSchema = z
  .object({
    refreshToken: z.string().min(1).openapi({ example: "eyJhbGci..." }),
  })
  .openapi("RefreshRequest");

export const publicUserSchema = z
  .object({
    id: z.number().int().openapi({ example: 1 }),
    username: z.string().openapi({ example: "ivan_petrenko" }),
    email: z.string().openapi({ example: "ivan@example.com" }),
    name: z.string().openapi({ example: "Ivan" }),
  })
  .openapi("PublicUser");

export const tokenPairSchema = z
  .object({
    accessToken: z.string().openapi({ example: "eyJhbGci..." }),
    refreshToken: z.string().openapi({ example: "eyJhbGci..." }),
  })
  .openapi("TokenPair");

export const authResponseSchema = tokenPairSchema
  .extend({ user: publicUserSchema })
  .openapi("AuthResponse");

export const profileSchema = publicUserSchema
  .extend({ createdAt: z.iso.datetime().openapi({ example: "2025-01-10T12:00:00.000Z" }) })
  .openapi("Profile");

export type RegisterBody = z.infer<typeof registerSchema>;
export type LoginBody = z.infer<typeof loginSchema>;
export type RefreshBody = z.infer<typeof refreshSchema>;

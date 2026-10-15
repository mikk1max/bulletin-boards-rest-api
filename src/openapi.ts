import {
  extendZodWithOpenApi,
  OpenApiGeneratorV3,
  OpenAPIRegistry,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

export { z };

export const registry = new OpenAPIRegistry();

registry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
});

export const errorSchema = registry.register(
  "Error",
  z.object({ error: z.string().openapi({ example: "Error message" }) }),
);

export const validationErrorSchema = registry.register(
  "ValidationError",
  z.object({
    error: z.string().openapi({ example: "Validation failed" }),
    details: z
      .record(z.string(), z.array(z.string()))
      .openapi({ example: { body: ["title: Too small: expected string to have >=5 characters"] } }),
  }),
);

export const errorResponse = (description: string) => ({
  description,
  content: { "application/json": { schema: errorSchema } },
});

export const validationErrorResponse = {
  description: "Validation failed",
  content: { "application/json": { schema: validationErrorSchema } },
};

export const jsonContent = (schema: z.ZodType) => ({
  content: { "application/json": { schema } },
});

export function generateOpenApiDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: "3.0.0",
    info: {
      title: "Bulletin Board API",
      version: "1.0.0",
      description: "JSON REST API for a bulletin board with JWT authentication",
    },
    servers: [{ url: "http://localhost:3000" }],
  });
}

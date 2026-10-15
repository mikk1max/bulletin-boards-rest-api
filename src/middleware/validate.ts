import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { z } from "zod";

type Source = "body" | "params" | "query";

function formatIssues(error: z.ZodError) {
  return error.issues.map((issue) =>
    issue.path.length ? `${issue.path.join(".")}: ${issue.message}` : issue.message,
  );
}

function validate(source: Source, schema: ZodType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source] ?? {});

    if (!result.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: { [source]: formatIssues(result.error) },
      });
    }

    // req.query is a getter in Express 5, so it can't be reassigned directly
    Object.defineProperty(req, source, {
      value: result.data,
      writable: true,
      configurable: true,
      enumerable: true,
    });
    next();
  };
}

export const validateBody = (schema: ZodType) => validate("body", schema);
export const validateParams = (schema: ZodType) => validate("params", schema);
export const validateQuery = (schema: ZodType) => validate("query", schema);

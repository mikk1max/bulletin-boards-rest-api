import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "../utils/tokens.ts";

export interface AuthUser {
  sub: number;
  username: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authorization token is missing" });
  }

  const token = header.slice("Bearer ".length).trim();

  try {
    const payload = verifyToken(token, "access");
    req.user = { sub: Number(payload.sub), username: payload.username };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

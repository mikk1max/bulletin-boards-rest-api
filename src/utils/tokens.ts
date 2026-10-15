import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined");
}

export const ACCESS_TOKEN_TTL = "15m";
export const REFRESH_TOKEN_TTL = "7d";

export type TokenType = "access" | "refresh";

export interface TokenPayload extends jwt.JwtPayload {
  sub: string;
  username: string;
  type: TokenType;
}

function signToken(
  user: { id: number; username: string },
  type: TokenType,
  expiresIn: jwt.SignOptions["expiresIn"],
) {
  // jwtid keeps tokens unique even when issued within the same second
  return jwt.sign({ username: user.username, type }, JWT_SECRET!, {
    subject: String(user.id),
    expiresIn,
    jwtid: randomUUID(),
  });
}

export function generateTokens(user: { id: number; username: string }) {
  return {
    accessToken: signToken(user, "access", ACCESS_TOKEN_TTL),
    refreshToken: signToken(user, "refresh", REFRESH_TOKEN_TTL),
  };
}

export function verifyToken(token: string, type: TokenType): TokenPayload {
  const payload = jwt.verify(token, JWT_SECRET!) as TokenPayload;

  if (payload.type !== type) {
    throw new jwt.JsonWebTokenError("Invalid token type");
  }

  return payload;
}

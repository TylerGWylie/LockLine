import crypto from "crypto";
import jwt from "jsonwebtoken";
import { env } from "../env";

export interface AccessTokenPayload {
  userId: string;
}

const ACCESS_TOKEN_TTL = "15m";
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.jwtAccessSecret, { expiresIn: ACCESS_TOKEN_TTL });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.jwtAccessSecret) as AccessTokenPayload;
}

export function generateOpaqueToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashOpaqueToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

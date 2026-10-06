import type { AuthSessionResponse, AuthUser } from "@vibe/contracts";
import type {
  AccessTokenPayload,
  AccessTokenSignPayload,
  RefreshTokenPayload,
  RefreshTokenSignPayload,
} from "./auth.model";
import type { UserRecord } from "./auth.repository";
import {
  createSession,
  createUser,
  findUserByEmail,
  findUserById,
  rotateSessionRecord,
} from "./auth.repository";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password, { algorithm: "argon2id" });
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return Bun.password.verify(password, hash);
}

export function toAuthUser(user: UserRecord): AuthUser {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
  };
}

export async function registerUser(email: string, password: string): Promise<UserRecord | null> {
  const normalizedEmail = normalizeEmail(email);
  const passwordHash = await hashPassword(password);
  return createUser(normalizedEmail, passwordHash);
}

export async function authenticateUser(
  email: string,
  password: string,
): Promise<UserRecord | null> {
  const user = await findUserByEmail(normalizeEmail(email));
  if (!user) return null;

  const matches = await verifyPassword(password, user.passwordHash);
  return matches ? user : null;
}

export function makeAccessPayload(
  userId: string,
  sessionId: string,
  ttlSeconds: number,
  issuer: string,
  audience: string,
): AccessTokenSignPayload {
  const now = Math.floor(Date.now() / 1000);
  return {
    iss: issuer,
    aud: audience,
    sub: userId,
    sid: sessionId,
    tokenType: "access",
    iat: true,
    exp: now + ttlSeconds,
  };
}

export function makeRefreshPayload(
  userId: string,
  sessionId: string,
  ttlSeconds: number,
  issuer: string,
  audience: string,
): RefreshTokenSignPayload {
  const now = Math.floor(Date.now() / 1000);
  return {
    iss: issuer,
    aud: audience,
    sub: userId,
    sid: sessionId,
    tokenType: "refresh",
    iat: true,
    exp: now + ttlSeconds,
  };
}

export function isAccessPayload(
  value: unknown,
  expectedIssuer: string,
  expectedAudience: string,
): value is AccessTokenPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Record<string, unknown>;
  return (
    payload.iss === expectedIssuer &&
    payload.aud === expectedAudience &&
    typeof payload.sub === "string" &&
    typeof payload.sid === "string" &&
    payload.tokenType === "access" &&
    typeof payload.exp === "number"
  );
}

export function isRefreshPayload(
  value: unknown,
  expectedIssuer: string,
  expectedAudience: string,
): value is RefreshTokenPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Record<string, unknown>;
  return (
    payload.iss === expectedIssuer &&
    payload.aud === expectedAudience &&
    typeof payload.sub === "string" &&
    typeof payload.sid === "string" &&
    payload.tokenType === "refresh" &&
    typeof payload.exp === "number"
  );
}

export async function createSessionForUser(
  userId: string,
  refreshTtlSeconds: number,
): Promise<string> {
  const sessionId = crypto.randomUUID();
  await createSession({
    id: sessionId,
    userId,
    familyId: sessionId,
    expiresAt: new Date(Date.now() + refreshTtlSeconds * 1000),
  });
  return sessionId;
}

export type RotateSessionResult =
  | { status: "rotated"; sessionId: string }
  | { status: "replayed" | "invalid" };

export async function rotateSession(
  currentSessionId: string,
  userId: string,
  refreshTtlSeconds: number,
): Promise<RotateSessionResult> {
  const nextSessionId = crypto.randomUUID();
  const result = await rotateSessionRecord({
    currentSessionId,
    nextSessionId,
    userId,
    nextExpiresAt: new Date(Date.now() + refreshTtlSeconds * 1000),
  });

  return result === "rotated"
    ? { status: "rotated", sessionId: nextSessionId }
    : { status: result };
}

export async function getAuthUser(userId: string): Promise<AuthUser | null> {
  const user = await findUserById(userId);
  return user ? toAuthUser(user) : null;
}

export function toSessionResponse(
  accessToken: string,
  accessTokenExpiresIn: number,
  user: UserRecord,
): AuthSessionResponse {
  return {
    accessToken,
    accessTokenExpiresIn,
    user: toAuthUser(user),
  };
}

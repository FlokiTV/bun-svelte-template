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
): AccessTokenSignPayload {
  const now = Math.floor(Date.now() / 1000);
  return {
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
): RefreshTokenSignPayload {
  const now = Math.floor(Date.now() / 1000);
  return {
    sub: userId,
    sid: sessionId,
    tokenType: "refresh",
    iat: true,
    exp: now + ttlSeconds,
  };
}

export function isAccessPayload(value: unknown): value is AccessTokenPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Record<string, unknown>;
  return (
    typeof payload.sub === "string" &&
    typeof payload.sid === "string" &&
    payload.tokenType === "access" &&
    typeof payload.exp === "number"
  );
}

export function isRefreshPayload(value: unknown): value is RefreshTokenPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Record<string, unknown>;
  return (
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
    expiresAt: new Date(Date.now() + refreshTtlSeconds * 1000),
  });
  return sessionId;
}

export async function rotateSession(
  currentSessionId: string,
  userId: string,
  refreshTtlSeconds: number,
): Promise<string | null> {
  const nextSessionId = crypto.randomUUID();
  const rotated = await rotateSessionRecord({
    currentSessionId,
    nextSessionId,
    userId,
    nextExpiresAt: new Date(Date.now() + refreshTtlSeconds * 1000),
  });

  return rotated ? nextSessionId : null;
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

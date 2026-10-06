import { and, eq, gt, isNull, lt } from "drizzle-orm";
import { getDb } from "../../db/client";
import { authSessions, users } from "../../db/schema";

export type UserRecord = typeof users.$inferSelect;
export type RotateSessionRecordResult = "rotated" | "replayed" | "invalid";

export async function createUser(email: string, passwordHash: string): Promise<UserRecord | null> {
  const [user] = await getDb()
    .insert(users)
    .values({ email, passwordHash })
    .onConflictDoNothing({ target: users.email })
    .returning();

  return user ?? null;
}

export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  const [user] = await getDb().select().from(users).where(eq(users.email, email)).limit(1);
  return user ?? null;
}

export async function findUserById(id: string): Promise<UserRecord | null> {
  const [user] = await getDb().select().from(users).where(eq(users.id, id)).limit(1);
  return user ?? null;
}

export async function createSession(input: {
  id: string;
  userId: string;
  familyId: string;
  expiresAt: Date;
}): Promise<void> {
  await getDb().insert(authSessions).values(input);
}

export async function rotateSessionRecord(input: {
  currentSessionId: string;
  nextSessionId: string;
  userId: string;
  nextExpiresAt: Date;
}): Promise<RotateSessionRecordResult> {
  return getDb().transaction(async (tx) => {
    const now = new Date();
    const [revoked] = await tx
      .update(authSessions)
      .set({ revokedAt: now, refreshedAt: now })
      .where(
        and(
          eq(authSessions.id, input.currentSessionId),
          eq(authSessions.userId, input.userId),
          isNull(authSessions.revokedAt),
          gt(authSessions.expiresAt, now),
        ),
      )
      .returning({ familyId: authSessions.familyId });

    if (revoked) {
      await tx.insert(authSessions).values({
        id: input.nextSessionId,
        userId: input.userId,
        familyId: revoked.familyId,
        expiresAt: input.nextExpiresAt,
      });
      return "rotated";
    }

    const [existing] = await tx
      .select({
        familyId: authSessions.familyId,
        refreshedAt: authSessions.refreshedAt,
      })
      .from(authSessions)
      .where(
        and(eq(authSessions.id, input.currentSessionId), eq(authSessions.userId, input.userId)),
      )
      .limit(1);

    if (!existing?.refreshedAt) return "invalid";

    await tx
      .update(authSessions)
      .set({ revokedAt: now })
      .where(and(eq(authSessions.familyId, existing.familyId), isNull(authSessions.revokedAt)));

    return "replayed";
  });
}

export async function revokeSession(id: string): Promise<void> {
  await getDb()
    .update(authSessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(authSessions.id, id), isNull(authSessions.revokedAt)));
}

export async function pruneExpiredSessions(before = new Date()): Promise<number> {
  const deleted = await getDb()
    .delete(authSessions)
    .where(lt(authSessions.expiresAt, before))
    .returning({ id: authSessions.id });

  return deleted.length;
}

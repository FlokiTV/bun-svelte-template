import { and, eq, gt, isNull } from "drizzle-orm";
import { getDb } from "../../db/client";
import { authSessions, users } from "../../db/schema";

export type UserRecord = typeof users.$inferSelect;

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
  expiresAt: Date;
}): Promise<void> {
  await getDb().insert(authSessions).values(input);
}

export async function rotateSessionRecord(input: {
  currentSessionId: string;
  nextSessionId: string;
  userId: string;
  nextExpiresAt: Date;
}): Promise<boolean> {
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
      .returning({ id: authSessions.id });

    if (!revoked) return false;

    await tx.insert(authSessions).values({
      id: input.nextSessionId,
      userId: input.userId,
      expiresAt: input.nextExpiresAt,
    });

    return true;
  });
}

export async function revokeSession(id: string): Promise<void> {
  await getDb()
    .update(authSessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(authSessions.id, id), isNull(authSessions.revokedAt)));
}

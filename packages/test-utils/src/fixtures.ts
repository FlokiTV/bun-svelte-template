import type { AuthUser } from "@vibe/contracts";

export function createAuthUserFixture(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: crypto.randomUUID(),
    email: "user@example.test",
    createdAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
    ...overrides,
  };
}

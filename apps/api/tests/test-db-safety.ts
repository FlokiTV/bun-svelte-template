/**
 * Fail closed before importing the API or connecting to PostgreSQL.
 * Test execution must explicitly target a dedicated database.
 */
export function requireIsolatedTestDatabase(env: Record<string, string | undefined>): {
  url: string;
  databaseName: string;
} {
  if (env.NODE_ENV !== "test") {
    throw new Error("PostgreSQL integration tests require NODE_ENV=test");
  }

  const url = env.TEST_DATABASE_URL?.trim();
  if (!url) throw new Error("TEST_DATABASE_URL must explicitly identify an isolated test DB");
  if (env.DATABASE_URL !== url) {
    throw new Error("DATABASE_URL and TEST_DATABASE_URL must match for integration tests");
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("TEST_DATABASE_URL must be a valid PostgreSQL URL");
  }

  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
    throw new Error("TEST_DATABASE_URL must use the PostgreSQL protocol");
  }

  const databaseName = decodeURIComponent(parsed.pathname.slice(1));
  if (!/^[a-zA-Z0-9_-]+_test$/.test(databaseName)) {
    throw new Error("Integration tests require a dedicated database ending with _test");
  }

  return { url, databaseName };
}

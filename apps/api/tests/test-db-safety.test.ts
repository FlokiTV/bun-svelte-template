import { describe, expect, test } from "bun:test";
import { requireIsolatedTestDatabase } from "./test-db-safety";

const safe = {
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://localhost:5432/vibe_test",
  TEST_DATABASE_URL: "postgresql://localhost:5432/vibe_test",
};

describe("PostgreSQL integration target guard", () => {
  test("accepts an explicitly named isolated test database", () => {
    expect(requireIsolatedTestDatabase(safe).databaseName).toBe("vibe_test");
  });

  test("refuses unconfigured, production or mismatched database targets", () => {
    expect(() => requireIsolatedTestDatabase({ ...safe, TEST_DATABASE_URL: undefined })).toThrow();
    expect(() => requireIsolatedTestDatabase({ ...safe, NODE_ENV: "production" })).toThrow();
    expect(() =>
      requireIsolatedTestDatabase({
        ...safe,
        TEST_DATABASE_URL: "postgresql://localhost:5432/vibe",
      }),
    ).toThrow();
    expect(() =>
      requireIsolatedTestDatabase({
        ...safe,
        DATABASE_URL: "postgresql://production:5432/vibe",
      }),
    ).toThrow();
    expect(() =>
      requireIsolatedTestDatabase({
        ...safe,
        DATABASE_URL: "postgresql://localhost:5432/vibe",
        TEST_DATABASE_URL: "postgresql://localhost:5432/vibe",
      }),
    ).toThrow();
  });

  test("rejects malformed and non-PostgreSQL URLs", () => {
    expect(() =>
      requireIsolatedTestDatabase({
        ...safe,
        DATABASE_URL: "not a URL",
        TEST_DATABASE_URL: "not a URL",
      }),
    ).toThrow();
    expect(() =>
      requireIsolatedTestDatabase({
        ...safe,
        DATABASE_URL: "https://localhost/vibe_test",
        TEST_DATABASE_URL: "https://localhost/vibe_test",
      }),
    ).toThrow();
  });
});

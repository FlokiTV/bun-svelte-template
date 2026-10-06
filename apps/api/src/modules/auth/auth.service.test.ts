import { describe, expect, test } from "bun:test";
import {
  hashPassword,
  isAccessPayload,
  isRefreshPayload,
  makeAccessPayload,
  makeRefreshPayload,
  normalizeEmail,
  verifyPassword,
} from "./auth.service";

describe("auth service", () => {
  test("normalizes email", () => {
    expect(normalizeEmail("  USER@Example.COM ")).toBe("user@example.com");
  });

  test("hashes and verifies passwords with Bun.password", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(hash).not.toContain("correct horse battery staple");
    expect(await verifyPassword("correct horse battery staple", hash)).toBe(true);
    expect(await verifyPassword("wrong password", hash)).toBe(false);
  });

  test("creates typed access and refresh payloads", () => {
    const access = makeAccessPayload("user-1", "session-1", 900, "issuer", "access-audience");
    const refresh = makeRefreshPayload("user-1", "session-1", 3600, "issuer", "refresh-audience");

    expect(isAccessPayload(access, "issuer", "access-audience")).toBe(true);
    expect(isRefreshPayload(refresh, "issuer", "refresh-audience")).toBe(true);
    expect(isRefreshPayload(access, "issuer", "refresh-audience")).toBe(false);
    expect(isAccessPayload({ ...access, iss: "wrong" }, "issuer", "access-audience")).toBe(false);
    expect(isAccessPayload({ ...access, aud: "wrong" }, "issuer", "access-audience")).toBe(false);
    expect(isRefreshPayload({ ...refresh, iss: "wrong" }, "issuer", "refresh-audience")).toBe(
      false,
    );
    expect(isRefreshPayload({ ...refresh, aud: "wrong" }, "issuer", "refresh-audience")).toBe(
      false,
    );
    expect(access.iss).toBe("issuer");
    expect(access.aud).toBe("access-audience");
    expect(access.iat).toBe(true);
    expect(access.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });
});

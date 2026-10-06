import { describe, expect, test } from "bun:test";
import { loadApiConfig } from "@vibe/config";

describe("runtime config", () => {
  test("uses safe development defaults", () => {
    const config = loadApiConfig({ NODE_ENV: "development" });
    expect(config.port).toBe(3000);
    expect(config.corsOrigins).toEqual(["http://localhost:5173"]);
    expect(config.maxRequestBodyBytes).toBe(1024 * 1024);
  });

  test("parses and normalizes comma-separated CORS origins", () => {
    const config = loadApiConfig({
      NODE_ENV: "test",
      CORS_ORIGINS: "https://a.example/, https://b.example,https://a.example",
    });
    expect(config.corsOrigins).toEqual(["https://a.example", "https://b.example"]);
  });

  test("rejects wildcard and non-origin CORS values", () => {
    for (const value of [
      "*",
      "https://app.example/path",
      "https://app.example?query=1",
      "ftp://app.example",
      "not-a-url",
    ]) {
      expect(() => loadApiConfig({ NODE_ENV: "test", CORS_ORIGINS: value })).toThrow();
    }
  });

  test("rejects missing production secrets", () => {
    expect(() => loadApiConfig({ NODE_ENV: "production" })).toThrow();
  });

  test("rejects placeholder secrets in production", () => {
    expect(() =>
      loadApiConfig({
        NODE_ENV: "production",
        CORS_ORIGINS: "https://app.example",
        AUTH_COOKIE_SECURE: "true",
        JWT_ACCESS_SECRET: "change-me-with-a-long-random-secret",
        JWT_REFRESH_SECRET: "this-is-a-realistic-refresh-secret-value-1234",
      }),
    ).toThrow();
  });

  test("rejects insecure SameSite=None cookies", () => {
    expect(() =>
      loadApiConfig({
        NODE_ENV: "development",
        AUTH_COOKIE_SAME_SITE: "none",
        AUTH_COOKIE_SECURE: "false",
      }),
    ).toThrow();
  });
});

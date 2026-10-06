import { describe, expect, test } from "bun:test";
import { app } from "../app";

describe("operational endpoints", () => {
  test("GET /health is a dependency-free liveness check", async () => {
    const response = await app.handle(new Request("http://localhost/health"));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: "ok" });
  });

  test("GET /ready reports readiness without a configured database", async () => {
    const response = await app.handle(new Request("http://localhost/ready"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: "ready",
      database: "not-configured",
    });
  });

  test("GET /meta exposes only non-secret runtime metadata", async () => {
    const response = await app.handle(new Request("http://localhost/meta"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ app: "vibe-api", environment: expect.any(String) });
    expect(JSON.stringify(body)).not.toContain("secret");
  });

  test("unknown routes return the standard 404 envelope", async () => {
    const response = await app.handle(new Request("http://localhost/definitely-missing"));
    expect(response.status).toBe(404);
    const body = (await response.json()) as { error?: { code?: string }; requestId?: string };
    expect(JSON.stringify(body)).toContain("NOT_FOUND");
  });
});

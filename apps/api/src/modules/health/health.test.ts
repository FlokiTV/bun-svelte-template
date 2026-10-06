import { describe, expect, test } from "bun:test";
import { app } from "../../app";

describe("GET /api/v1/health", () => {
  test("returns API health", async () => {
    const response = await app.handle(new Request("http://localhost/api/v1/health"));

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body).toMatchObject({
      status: "ok",
      service: "api",
    });
  });
});

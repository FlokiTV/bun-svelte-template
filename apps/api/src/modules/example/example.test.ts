import { describe, expect, test } from "bun:test";
import { app } from "../../app";

describe("POST /api/v1/example/echo", () => {
  test("echoes a valid payload", async () => {
    const response = await app.handle(
      new Request("http://localhost/api/v1/example/echo", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          message: "hello",
        }),
      }),
    );

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.message).toBe("hello");
    expect(typeof body.receivedAt).toBe("string");
  });

  test("rejects an invalid payload", async () => {
    const response = await app.handle(
      new Request("http://localhost/api/v1/example/echo", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          message: "",
        }),
      }),
    );

    expect(response.status).toBe(422);
  });
});

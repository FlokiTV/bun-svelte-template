import { describe, expect, test } from "bun:test";
import { requestOriginIsAllowed } from "./origin";

describe("requestOriginIsAllowed", () => {
  test("accepts configured browser origin and requests without Origin", () => {
    expect(
      requestOriginIsAllowed(
        new Request("http://localhost/ws", { headers: { origin: "http://localhost:5173" } }),
      ),
    ).toBe(true);
    expect(requestOriginIsAllowed(new Request("http://localhost/ws"))).toBe(true);
  });

  test("rejects null, malformed, and untrusted origins", () => {
    for (const origin of ["null", "not-a-url", "https://evil.example"]) {
      expect(
        requestOriginIsAllowed(new Request("http://localhost/ws", { headers: { origin } })),
      ).toBe(false);
    }
  });
});

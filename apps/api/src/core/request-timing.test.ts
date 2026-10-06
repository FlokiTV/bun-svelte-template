import { describe, expect, test } from "bun:test";
import { markRequestStarted, requestDurationMs, requestLogContext } from "./request-timing";

describe("request timing", () => {
  test("uses monotonic timing attached to the Request object", () => {
    const request = new Request("http://localhost/test");
    markRequestStarted(request, 10.25);
    expect(requestDurationMs(request, 22.5)).toBe(12.25);
  });

  test("returns zero when timing was not initialized", () => {
    expect(requestDurationMs(new Request("http://localhost/test"), 50)).toBe(0);
  });

  test("keeps the validated request id alongside durationMs", () => {
    const request = new Request("http://localhost/test", {
      headers: { "x-request-id": "duration-test-request" },
    });
    markRequestStarted(request, 100);

    expect(requestLogContext(request, 112.5)).toEqual({
      requestId: "duration-test-request",
      durationMs: 12.5,
    });
  });
});

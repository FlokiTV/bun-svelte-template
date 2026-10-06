import { describe, expect, test } from "bun:test";
import { errorResponse } from "./error-response";
import { ERROR_CODES } from "./errors";
import { requestIdFor } from "./request-id";

describe("core API contracts", () => {
  test("error responses include a stable request id", () => {
    expect(errorResponse(ERROR_CODES.NOT_FOUND, "Not found", "req-12345678")).toEqual({
      error: {
        code: "NOT_FOUND",
        message: "Not found",
        requestId: "req-12345678",
      },
    });
  });

  test("request id reuses a valid incoming id", () => {
    const request = new Request("http://localhost/test", {
      headers: { "x-request-id": "client-request-123" },
    });

    expect(requestIdFor(request)).toBe("client-request-123");
    expect(requestIdFor(request)).toBe("client-request-123");
  });

  test("request id rejects malformed incoming values", () => {
    const request = new Request("http://localhost/test", {
      headers: { "x-request-id": "bad id" },
    });

    expect(requestIdFor(request)).not.toBe("bad id");
  });
});

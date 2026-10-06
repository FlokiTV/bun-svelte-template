import type { AuthSessionResponse } from "@vibe/contracts";
import { afterEach, describe, expect, test, vi } from "vitest";
import { authFetch, clearAccessToken, login } from "./client";

const session: AuthSessionResponse = {
  accessToken: "access-token",
  accessTokenExpiresIn: 900,
  user: {
    id: "user-1",
    email: "user@example.com",
    createdAt: "2026-10-06T00:00:00.000Z",
  },
};

afterEach(() => {
  clearAccessToken();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("authFetch trusted origin", () => {
  test("never sends the access token to an external origin", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(session), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await login("user@example.com", "password123");

    await expect(authFetch("https://example.com/private")).rejects.toThrow(
      "authFetch only accepts requests to the configured API origin",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("accepts relative requests resolved against the API origin", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(session), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await login("user@example.com", "password123");
    await authFetch("/api/v1/private");

    const [input, init] = fetchMock.mock.calls[1] ?? [];
    expect(String(input)).toBe("http://localhost:3000/api/v1/private");
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer access-token");
  });

  test("honors a custom VITE_API_URL origin", async () => {
    vi.stubEnv("VITE_API_URL", "https://api.example.test/api/v1");
    vi.resetModules();

    const customClient = await import("./client");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(session), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await customClient.login("user@example.com", "password123");
    await customClient.authFetch("https://api.example.test/api/v1/private");

    const [, init] = fetchMock.mock.calls[1] ?? [];
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer access-token");

    await expect(customClient.authFetch("https://other.example.test/private")).rejects.toThrow(
      "authFetch only accepts requests to the configured API origin",
    );
  });

  test("sends the access token to the configured API origin", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(session), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await login("user@example.com", "password123");
    await authFetch("http://localhost:3000/api/v1/private");

    const [, init] = fetchMock.mock.calls[1] ?? [];
    const headers = new Headers(init?.headers);
    expect(headers.get("authorization")).toBe("Bearer access-token");
    expect(init?.credentials).toBe("include");
  });
});

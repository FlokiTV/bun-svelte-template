import type { AuthSessionResponse } from "@vibe/contracts";
import { afterEach, describe, expect, test, vi } from "vitest";
import { authFetch, clearAccessToken, getAccessToken, login } from "./client";

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

describe("authFetch refresh single-flight", () => {
  test("shares one refresh across concurrent 401 responses and retries with the new token", async () => {
    let resolveRefresh!: () => void;
    const refreshGate = new Promise<void>((resolve) => {
      resolveRefresh = resolve;
    });
    let refreshCalls = 0;
    const protectedAttempts = new Map<string, number>();
    const retryAuthorizations: string[] = [];

    const fetchMock = vi
      .fn()
      .mockImplementation(async (input: string | URL, init?: RequestInit) => {
        const url = String(input);

        if (url.endsWith("/auth/login")) {
          return new Response(JSON.stringify(session), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }

        if (url.endsWith("/auth/refresh")) {
          refreshCalls += 1;
          await refreshGate;
          return new Response(
            JSON.stringify({
              ...session,
              accessToken: "refreshed-token",
            }),
            {
              status: 200,
              headers: { "content-type": "application/json" },
            },
          );
        }

        const attempts = (protectedAttempts.get(url) ?? 0) + 1;
        protectedAttempts.set(url, attempts);
        if (attempts === 1) return new Response(null, { status: 401 });

        retryAuthorizations.push(new Headers(init?.headers).get("authorization") ?? "");
        return new Response(null, { status: 204 });
      });
    vi.stubGlobal("fetch", fetchMock);

    await login("user@example.com", "password123");

    const pending = Promise.all([
      authFetch("http://localhost:3000/api/v1/private/a"),
      authFetch("http://localhost:3000/api/v1/private/b"),
    ]);

    await vi.waitFor(() => expect(refreshCalls).toBe(1));
    resolveRefresh();

    const responses = await pending;
    expect(responses.map((response) => response.status)).toEqual([204, 204]);
    expect(refreshCalls).toBe(1);
    expect(retryAuthorizations).toEqual(["Bearer refreshed-token", "Bearer refreshed-token"]);
  });

  test("clears local auth after refresh failure without retry loops", async () => {
    let protectedCalls = 0;
    let refreshCalls = 0;
    const fetchMock = vi.fn().mockImplementation(async (input: string | URL) => {
      const url = String(input);

      if (url.endsWith("/auth/login")) {
        return new Response(JSON.stringify(session), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      if (url.endsWith("/auth/refresh")) {
        refreshCalls += 1;
        return new Response(
          JSON.stringify({
            error: {
              code: "SESSION_REVOKED",
              message: "Session is no longer active",
              requestId: "request-1",
            },
          }),
          {
            status: 401,
            headers: { "content-type": "application/json" },
          },
        );
      }

      protectedCalls += 1;
      return new Response(null, { status: 401 });
    });
    vi.stubGlobal("fetch", fetchMock);

    await login("user@example.com", "password123");
    const response = await authFetch("http://localhost:3000/api/v1/private");

    expect(response.status).toBe(401);
    expect(refreshCalls).toBe(1);
    expect(protectedCalls).toBe(1);
    expect(getAccessToken()).toBeNull();
  });
});

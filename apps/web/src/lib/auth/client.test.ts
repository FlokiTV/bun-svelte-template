import { afterEach, describe, expect, rs, test } from "@rstest/core";
import type { AuthSessionResponse } from "@vibe/contracts";
import { ApiError } from "../api/errors";
import { authFetch, clearAccessToken, getAccessToken, login, logout, register } from "./client";

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
  rs.unstubAllGlobals();
  rs.restoreAllMocks();
});

describe("auth session storage", () => {
  test("register keeps the access token in memory without localStorage persistence", async () => {
    const setItem = rs.spyOn(Storage.prototype, "setItem");
    const fetchMock = rs.fn().mockResolvedValue(
      new Response(JSON.stringify(session), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    rs.stubGlobal("fetch", fetchMock);

    const result = await register("user@example.com", "password123");

    expect(result.accessToken).toBe("access-token");
    expect(getAccessToken()).toBe("access-token");
    expect(setItem).not.toHaveBeenCalled();
  });
});

describe("authFetch trusted origin", () => {
  test("never sends the access token to an external origin", async () => {
    const fetchMock = rs.fn().mockResolvedValue(
      new Response(JSON.stringify(session), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    rs.stubGlobal("fetch", fetchMock);

    await login("user@example.com", "password123");

    await expect(authFetch("https://example.com/private")).rejects.toThrow(
      "authFetch only accepts requests to the configured API origin",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("accepts relative requests resolved against the API origin", async () => {
    const fetchMock = rs
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(session), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    rs.stubGlobal("fetch", fetchMock);

    await login("user@example.com", "password123");
    await authFetch("/api/v1/private");

    const [input, init] = fetchMock.mock.calls[1] ?? [];
    expect(String(input)).toBe("http://localhost:3000/api/v1/private");
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer access-token");
  });

  test("honors a custom PUBLIC_API_URL origin", async () => {
    rs.stubEnv("PUBLIC_API_URL", "https://api.example.test/api/v1");
    rs.resetModules();

    const customClient = await import("./client");
    const fetchMock = rs
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(session), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    rs.stubGlobal("fetch", fetchMock);

    await customClient.login("user@example.com", "password123");
    await customClient.authFetch("https://api.example.test/api/v1/private");

    const [, init] = fetchMock.mock.calls[1] ?? [];
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer access-token");

    await expect(customClient.authFetch("https://other.example.test/private")).rejects.toThrow(
      "authFetch only accepts requests to the configured API origin",
    );
  });

  test("sends the access token to the configured API origin", async () => {
    const fetchMock = rs
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(session), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    rs.stubGlobal("fetch", fetchMock);

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

    const fetchMock = rs
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
    rs.stubGlobal("fetch", fetchMock);

    await login("user@example.com", "password123");

    const pending = Promise.all([
      authFetch("http://localhost:3000/api/v1/private/a"),
      authFetch("http://localhost:3000/api/v1/private/b"),
    ]);

    await rs.waitFor(() => expect(refreshCalls).toBe(1));
    resolveRefresh();

    const responses = await pending;
    expect(responses.map((response) => response.status)).toEqual([204, 204]);
    expect(refreshCalls).toBe(1);
    expect(retryAuthorizations).toEqual(["Bearer refreshed-token", "Bearer refreshed-token"]);
  });

  test("clears local auth after refresh failure without retry loops", async () => {
    let protectedCalls = 0;
    let refreshCalls = 0;
    const fetchMock = rs.fn().mockImplementation(async (input: string | URL) => {
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
    rs.stubGlobal("fetch", fetchMock);

    await login("user@example.com", "password123");
    const response = await authFetch("http://localhost:3000/api/v1/private");

    expect(response.status).toBe(401);
    expect(refreshCalls).toBe(1);
    expect(protectedCalls).toBe(1);
    expect(getAccessToken()).toBeNull();
  });
});

describe("logout auth state", () => {
  test("clears the access token even when the network request fails", async () => {
    const fetchMock = rs
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(session), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockRejectedValueOnce(new TypeError("network down"));
    rs.stubGlobal("fetch", fetchMock);

    await login("user@example.com", "password123");
    expect(getAccessToken()).toBe("access-token");

    await expect(logout()).rejects.toThrow("network down");
    expect(getAccessToken()).toBeNull();
  });

  test("surfaces a remote logout failure and still clears local auth", async () => {
    const fetchMock = rs
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(session), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: {
              code: "LOGOUT_UNAVAILABLE",
              message: "Logout service unavailable",
              requestId: "logout-request",
            },
          }),
          {
            status: 503,
            headers: { "content-type": "application/json" },
          },
        ),
      );
    rs.stubGlobal("fetch", fetchMock);

    await login("user@example.com", "password123");

    const logoutError = await logout().catch((error: unknown) => error);
    expect(logoutError).toBeInstanceOf(ApiError);
    expect(logoutError).toMatchObject({
      status: 503,
      code: "LOGOUT_UNAVAILABLE",
      requestId: "logout-request",
      message: "Logout service unavailable",
    });
    expect(getAccessToken()).toBeNull();

    const [, init] = fetchMock.mock.calls[1] ?? [];
    expect(init?.method).toBe("POST");
    expect(init?.credentials).toBe("include");
  });

  test("prevents an in-flight refresh from restoring auth after logout", async () => {
    let resolveRefresh!: () => void;
    const refreshGate = new Promise<void>((resolve) => {
      resolveRefresh = resolve;
    });
    let protectedCalls = 0;
    let refreshCalls = 0;

    const fetchMock = rs.fn().mockImplementation(async (input: string | URL) => {
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
            accessToken: "late-refresh-token",
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        );
      }

      if (url.endsWith("/auth/logout")) {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      protectedCalls += 1;
      return new Response(null, { status: 401 });
    });
    rs.stubGlobal("fetch", fetchMock);

    await login("user@example.com", "password123");
    const pendingRequest = authFetch("http://localhost:3000/api/v1/private");
    await rs.waitFor(() => expect(refreshCalls).toBe(1));

    await logout();
    resolveRefresh();

    const response = await pendingRequest;
    expect(response.status).toBe(401);
    expect(protectedCalls).toBe(1);
    expect(getAccessToken()).toBeNull();
  });
});

describe("auth ApiError contract", () => {
  test("preserves structured API errors from auth endpoints", async () => {
    const fetchMock = rs.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Invalid email or password",
            requestId: "login-request",
          },
        }),
        {
          status: 401,
          headers: { "content-type": "application/json" },
        },
      ),
    );
    rs.stubGlobal("fetch", fetchMock);

    const error = await login("user@example.com", "wrong-password").catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 401,
      code: "INVALID_CREDENTIALS",
      requestId: "login-request",
      message: "Invalid email or password",
    });
  });

  test("falls back to HTTP_ERROR when the error body is not valid JSON", async () => {
    const fetchMock = rs.fn().mockResolvedValue(
      new Response("upstream failure", {
        status: 502,
        headers: {
          "content-type": "text/plain",
          "x-request-id": "fallback-request",
        },
      }),
    );
    rs.stubGlobal("fetch", fetchMock);

    const error = await login("user@example.com", "password123").catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 502,
      code: "HTTP_ERROR",
      requestId: "fallback-request",
      message: "Request failed with status 502",
    });
  });
});

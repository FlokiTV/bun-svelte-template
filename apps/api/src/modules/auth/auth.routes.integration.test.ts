import { beforeEach, describe, expect, mock, test } from "bun:test";

type UserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
};

type SessionRecord = {
  id: string;
  userId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  refreshedAt: Date | null;
};

const usersById = new Map<string, UserRecord>();
const userIdByEmail = new Map<string, string>();
const sessions = new Map<string, SessionRecord>();

mock.module("./auth.repository", () => ({
  createUser: async (email: string, passwordHash: string): Promise<UserRecord | null> => {
    if (userIdByEmail.has(email)) return null;

    const now = new Date();
    const user: UserRecord = {
      id: crypto.randomUUID(),
      email,
      passwordHash,
      createdAt: now,
      updatedAt: now,
    };

    usersById.set(user.id, user);
    userIdByEmail.set(user.email, user.id);
    return user;
  },

  findUserByEmail: async (email: string): Promise<UserRecord | null> => {
    const id = userIdByEmail.get(email);
    return id ? (usersById.get(id) ?? null) : null;
  },

  findUserById: async (id: string): Promise<UserRecord | null> => usersById.get(id) ?? null,

  createSession: async (input: { id: string; userId: string; expiresAt: Date }): Promise<void> => {
    sessions.set(input.id, {
      ...input,
      revokedAt: null,
      refreshedAt: null,
    });
  },

  rotateSessionRecord: async (input: {
    currentSessionId: string;
    nextSessionId: string;
    userId: string;
    nextExpiresAt: Date;
  }): Promise<boolean> => {
    const current = sessions.get(input.currentSessionId);
    const now = new Date();

    if (
      !current ||
      current.userId !== input.userId ||
      current.revokedAt !== null ||
      current.expiresAt <= now
    ) {
      return false;
    }

    current.revokedAt = now;
    current.refreshedAt = now;

    sessions.set(input.nextSessionId, {
      id: input.nextSessionId,
      userId: input.userId,
      expiresAt: input.nextExpiresAt,
      revokedAt: null,
      refreshedAt: null,
    });

    return true;
  },

  revokeSession: async (id: string): Promise<void> => {
    const session = sessions.get(id);
    if (session && session.revokedAt === null) session.revokedAt = new Date();
  },
}));

const { app } = await import("../../app");

function request(path: string, init: RequestInit = {}): Promise<Response> {
  return app.handle(
    new Request(`http://localhost${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        ...init.headers,
      },
    }),
  );
}

function cookiePair(setCookie: string): string {
  return setCookie.split(";", 1)[0] ?? "";
}

beforeEach(() => {
  usersById.clear();
  userIdByEmail.clear();
  sessions.clear();
});

describe("auth HTTP flow", () => {
  test("register -> login -> me -> refresh -> logout with failure paths", async () => {
    const email = "Auth.Flow@Example.com";
    const normalizedEmail = "auth.flow@example.com";
    const password = "correct-horse-battery-staple";

    const invalidRegister = await request("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ email: "not-an-email", password: "short" }),
    });
    expect(invalidRegister.status).toBe(422);

    const register = await request("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    expect(register.status).toBe(200);

    const registered = (await register.json()) as {
      accessToken: string;
      accessTokenExpiresIn: number;
      user: { id: string; email: string; createdAt: string };
    };

    expect(registered.user.email).toBe(normalizedEmail);
    expect(registered.accessToken.length).toBeGreaterThan(20);
    expect(registered.accessTokenExpiresIn).toBeGreaterThan(0);
    expect(usersById.size).toBe(1);
    expect(sessions.size).toBe(1);

    const registerCookieHeader = register.headers.get("set-cookie");
    expect(registerCookieHeader).toContain("refresh_token=");
    expect(registerCookieHeader?.toLowerCase()).toContain("httponly");
    expect(registerCookieHeader?.toLowerCase()).toContain("samesite=lax");
    expect(registerCookieHeader).toContain("Path=/api/v1/auth");

    const duplicate = await request("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ email: normalizedEmail, password }),
    });
    expect(duplicate.status).toBe(409);

    const wrongPassword = await request("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: normalizedEmail, password: "totally-wrong-password" }),
    });
    expect(wrongPassword.status).toBe(401);

    const login = await request("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "AUTH.FLOW@example.com", password }),
    });
    expect(login.status).toBe(200);

    const loggedIn = (await login.json()) as {
      accessToken: string;
      user: { id: string; email: string };
    };
    expect(loggedIn.user.id).toBe(registered.user.id);
    expect(loggedIn.user.email).toBe(normalizedEmail);

    const missingBearer = await request("/api/v1/auth/me");
    expect(missingBearer.status).toBe(401);

    const invalidBearer = await request("/api/v1/auth/me", {
      headers: { authorization: "Bearer definitely-not-a-jwt" },
    });
    expect(invalidBearer.status).toBe(401);

    const me = await request("/api/v1/auth/me", {
      headers: { authorization: `Bearer ${loggedIn.accessToken}` },
    });
    expect(me.status).toBe(200);
    const meBody = (await me.json()) as { user: { id: string; email: string } };
    expect(meBody.user.id).toBe(registered.user.id);
    expect(meBody.user.email).toBe(normalizedEmail);

    const loginCookieHeader = login.headers.get("set-cookie");
    expect(loginCookieHeader).toBeTruthy();
    const oldRefreshCookie = cookiePair(loginCookieHeader ?? "");

    const blockedRefresh = await request("/api/v1/auth/refresh", {
      method: "POST",
      headers: {
        cookie: oldRefreshCookie,
        origin: "https://evil.example",
      },
    });
    expect(blockedRefresh.status).toBe(403);

    const refresh = await request("/api/v1/auth/refresh", {
      method: "POST",
      headers: {
        cookie: oldRefreshCookie,
        origin: "http://localhost:5173",
      },
    });
    expect(refresh.status).toBe(200);

    const refreshed = (await refresh.json()) as {
      accessToken: string;
      user: { id: string; email: string };
    };
    expect(refreshed.accessToken).not.toBe(loggedIn.accessToken);
    expect(refreshed.user.id).toBe(registered.user.id);

    const refreshedCookieHeader = refresh.headers.get("set-cookie");
    expect(refreshedCookieHeader).toBeTruthy();
    const newRefreshCookie = cookiePair(refreshedCookieHeader ?? "");
    expect(newRefreshCookie).not.toBe(oldRefreshCookie);

    const activeSessionsAfterRotation = [...sessions.values()].filter(
      (session) => session.revokedAt === null,
    );
    const revokedSessionsAfterRotation = [...sessions.values()].filter(
      (session) => session.revokedAt !== null,
    );
    expect(activeSessionsAfterRotation.length).toBe(2);
    expect(revokedSessionsAfterRotation.length).toBe(1);

    const replayOldRefresh = await request("/api/v1/auth/refresh", {
      method: "POST",
      headers: { cookie: oldRefreshCookie },
    });
    expect(replayOldRefresh.status).toBe(401);
    const replayDeleteCookie = replayOldRefresh.headers.get("set-cookie");
    expect(replayDeleteCookie).toContain("Max-Age=0");
    expect(replayDeleteCookie).toContain("Path=/api/v1/auth");

    const blockedLogout = await request("/api/v1/auth/logout", {
      method: "POST",
      headers: {
        cookie: newRefreshCookie,
        origin: "https://evil.example",
      },
    });
    expect(blockedLogout.status).toBe(403);

    const logout = await request("/api/v1/auth/logout", {
      method: "POST",
      headers: {
        cookie: newRefreshCookie,
        origin: "http://localhost:5173",
      },
    });
    expect(logout.status).toBe(200);
    expect(await logout.json()).toEqual({ ok: true });
    const logoutDeleteCookie = logout.headers.get("set-cookie");
    expect(logoutDeleteCookie).toContain("Max-Age=0");
    expect(logoutDeleteCookie).toContain("Path=/api/v1/auth");

    const refreshAfterLogout = await request("/api/v1/auth/refresh", {
      method: "POST",
      headers: { cookie: newRefreshCookie },
    });
    expect(refreshAfterLogout.status).toBe(401);

    const activeSessionsAfterLogout = [...sessions.values()].filter(
      (session) => session.revokedAt === null,
    );
    expect(activeSessionsAfterLogout.length).toBe(1);
  });
});

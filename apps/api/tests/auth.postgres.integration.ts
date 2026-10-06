import { afterAll, beforeAll, describe, expect, test } from "bun:test";

if (!Bun.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for the PostgreSQL integration test");
}

const { app } = await import("../src/app");
const { closeDb, getSqlClient } = await import("../src/db/client");

const sql = getSqlClient();

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

function cookiePair(setCookie: string | null): string {
  if (!setCookie) throw new Error("Expected Set-Cookie header");
  return setCookie.split(";", 1)[0] ?? "";
}

beforeAll(async () => {
  await sql`truncate table auth_sessions, users restart identity cascade`;
});

afterAll(async () => {
  await sql`truncate table auth_sessions, users restart identity cascade`;
  await closeDb();
});

describe("auth with real PostgreSQL", () => {
  test("migrations and repository support rotation, replay revocation, and logout", async () => {
    const email = `postgres-${crypto.randomUUID()}@example.com`;
    const password = "correct-horse-battery-staple";

    const register = await request("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    expect(register.status).toBe(200);

    const registered = (await register.json()) as {
      accessToken: string;
      user: { id: string; email: string };
    };
    expect(registered.user.email).toBe(email);
    const originalRefreshCookie = cookiePair(register.headers.get("set-cookie"));

    const me = await request("/api/v1/auth/me", {
      headers: { authorization: `Bearer ${registered.accessToken}` },
    });
    expect(me.status).toBe(200);

    const refresh = await request("/api/v1/auth/refresh", {
      method: "POST",
      headers: {
        cookie: originalRefreshCookie,
        origin: "http://localhost:5173",
      },
    });
    expect(refresh.status).toBe(200);
    const rotatedRefreshCookie = cookiePair(refresh.headers.get("set-cookie"));
    expect(rotatedRefreshCookie).not.toBe(originalRefreshCookie);

    const sessionRowsAfterRotation = await sql<
      Array<{ family_id: string; revoked_at: Date | null; refreshed_at: Date | null }>
    >`
      select family_id, revoked_at, refreshed_at
      from auth_sessions
      where user_id = ${registered.user.id}
      order by created_at asc
    `;
    expect(sessionRowsAfterRotation.length).toBe(2);
    expect(new Set(sessionRowsAfterRotation.map((row) => row.family_id)).size).toBe(1);
    expect(sessionRowsAfterRotation.filter((row) => row.revoked_at === null).length).toBe(1);

    const replay = await request("/api/v1/auth/refresh", {
      method: "POST",
      headers: {
        cookie: originalRefreshCookie,
        origin: "http://localhost:5173",
      },
    });
    expect(replay.status).toBe(401);

    const activeAfterReplay = await sql<Array<{ count: number }>>`
      select count(*)::int as count
      from auth_sessions
      where user_id = ${registered.user.id} and revoked_at is null
    `;
    expect(activeAfterReplay[0]?.count).toBe(0);

    const descendantAfterReplay = await request("/api/v1/auth/refresh", {
      method: "POST",
      headers: {
        cookie: rotatedRefreshCookie,
        origin: "http://localhost:5173",
      },
    });
    expect(descendantAfterReplay.status).toBe(401);

    const login = await request("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    expect(login.status).toBe(200);
    const loginRefreshCookie = cookiePair(login.headers.get("set-cookie"));

    const logout = await request("/api/v1/auth/logout", {
      method: "POST",
      headers: {
        cookie: loginRefreshCookie,
        origin: "http://localhost:5173",
      },
    });
    expect(logout.status).toBe(200);
    expect(logout.headers.get("set-cookie")).toContain("Path=/api/v1/auth");

    const refreshAfterLogout = await request("/api/v1/auth/refresh", {
      method: "POST",
      headers: {
        cookie: loginRefreshCookie,
        origin: "http://localhost:5173",
      },
    });
    expect(refreshAfterLogout.status).toBe(401);
  });
});

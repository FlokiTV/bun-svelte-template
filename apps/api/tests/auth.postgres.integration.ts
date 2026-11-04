import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { requireIsolatedTestDatabase } from "./test-db-safety";

const { databaseName } = requireIsolatedTestDatabase(Bun.env);
const testEmail = `postgres-${crypto.randomUUID()}@example.com`;
let isolatedDatabaseVerified = false;

const { resetRateLimitBucketsForTests } = await import("../src/core/rate-limit");
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
  const [actual] = await sql<Array<{ name: string }>>`select current_database() as name`;
  if (actual?.name !== databaseName) {
    throw new Error("Connected PostgreSQL database does not match TEST_DATABASE_URL");
  }
  isolatedDatabaseVerified = true;
});

afterAll(async () => {
  try {
    // Never truncate shared tables: remove only the user created by this test.
    if (isolatedDatabaseVerified) {
      await sql`delete from users where email = ${testEmail}`;
    }
  } finally {
    await closeDb();
  }
});

describe("auth with real PostgreSQL", () => {
  test("migrations and repository support rotation, replay revocation, and logout", async () => {
    const email = testEmail;
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

    // Each independent security scenario gets a fresh limiter window.
    // Only the test counter is reset; production rate limiting remains unchanged.
    resetRateLimitBucketsForTests();

    // A stale cookie must still revoke a new descendant of the same family.
    const staleLogin = await request("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    expect(staleLogin.status).toBe(200);
    const staleCookie = cookiePair(staleLogin.headers.get("set-cookie"));

    const staleRefresh = await request("/api/v1/auth/refresh", {
      method: "POST",
      headers: { cookie: staleCookie },
    });
    expect(staleRefresh.status).toBe(200);
    const descendantCookie = cookiePair(staleRefresh.headers.get("set-cookie"));

    const staleLogout = await request("/api/v1/auth/logout", {
      method: "POST",
      headers: { cookie: staleCookie },
    });
    expect(staleLogout.status).toBe(200);

    const descendantAfterLogout = await request("/api/v1/auth/refresh", {
      method: "POST",
      headers: { cookie: descendantCookie },
    });
    expect(descendantAfterLogout.status).toBe(401);

    // Avoid a prior sequential scenario exhausting the auth budget before
    // the concurrent requests can exercise PostgreSQL advisory locking.
    resetRateLimitBucketsForTests();

    // Exercise the real transaction lock when refresh and logout race.
    const concurrentLogin = await request("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    expect(concurrentLogin.status).toBe(200);
    const concurrentCookie = cookiePair(concurrentLogin.headers.get("set-cookie"));

    const [family] = await sql<Array<{ family_id: string }>>`
      select family_id
      from auth_sessions
      where user_id = ${registered.user.id} and revoked_at is null
      order by created_at desc
      limit 1
    `;
    if (!family) throw new Error("Expected a fresh session family for the race");

    const [concurrentRefresh, concurrentLogout] = await Promise.all([
      request("/api/v1/auth/refresh", {
        method: "POST",
        headers: { cookie: concurrentCookie },
      }),
      request("/api/v1/auth/logout", {
        method: "POST",
        headers: { cookie: concurrentCookie },
      }),
    ]);
    expect([200, 401]).toContain(concurrentRefresh.status);
    expect(concurrentLogout.status).toBe(200);

    const [activeInFamily] = await sql<Array<{ count: number }>>`
      select count(*)::int as count
      from auth_sessions
      where family_id = ${family.family_id} and revoked_at is null
    `;
    expect(activeInFamily?.count).toBe(0);

    if (concurrentRefresh.status === 200) {
      const lateCookie = cookiePair(concurrentRefresh.headers.get("set-cookie"));
      const lateRefresh = await request("/api/v1/auth/refresh", {
        method: "POST",
        headers: { cookie: lateCookie },
      });
      expect(lateRefresh.status).toBe(401);
    }
  });
});

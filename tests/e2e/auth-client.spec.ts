import { expect, test } from "@playwright/test";

const corsHeaders = {
  "access-control-allow-credentials": "true",
  "access-control-allow-headers": "authorization,content-type",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-origin": "http://localhost:5173",
  "content-type": "application/json",
};

test("auth client login refresh retry and logout works in a real browser", async ({ page }) => {
  let refreshCalls = 0;
  let meCalls = 0;
  const meAuthorizations: string[] = [];

  await page.route("http://localhost:3000/api/v1/auth/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (request.method() === "OPTIONS") {
      await route.fulfill({
        status: 204,
        headers: corsHeaders,
      });
      return;
    }

    if (url.pathname.endsWith("/auth/login")) {
      await route.fulfill({
        status: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          accessToken: "initial-token",
          accessTokenExpiresIn: 900,
          user: {
            id: "user-1",
            email: "user@example.com",
            createdAt: "2026-10-06T00:00:00.000Z",
          },
        }),
      });
      return;
    }

    if (url.pathname.endsWith("/auth/refresh")) {
      refreshCalls += 1;
      await route.fulfill({
        status: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          accessToken: "refreshed-token",
          accessTokenExpiresIn: 900,
          user: {
            id: "user-1",
            email: "user@example.com",
            createdAt: "2026-10-06T00:00:00.000Z",
          },
        }),
      });
      return;
    }

    if (url.pathname.endsWith("/auth/me")) {
      meCalls += 1;
      meAuthorizations.push(request.headers().authorization ?? "");

      if (meCalls === 1) {
        await route.fulfill({
          status: 401,
          headers: corsHeaders,
          body: JSON.stringify({
            error: {
              code: "INVALID_TOKEN",
              message: "Expired access token",
              requestId: "request-401",
            },
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          user: {
            id: "user-1",
            email: "user@example.com",
            createdAt: "2026-10-06T00:00:00.000Z",
          },
        }),
      });
      return;
    }

    if (url.pathname.endsWith("/auth/logout")) {
      await route.fulfill({
        status: 200,
        headers: corsHeaders,
        body: JSON.stringify({ ok: true }),
      });
      return;
    }

    await route.abort();
  });

  await page.goto("/");

  await page.waitForFunction(() => "__vibeAuthClient" in window);

  const result = await page.evaluate(async () => {
    type AuthClient = {
      login(email: string, password: string): Promise<unknown>;
      getAccessToken(): string | null;
      getMe(): Promise<{ user: { email: string } }>;
      logout(): Promise<void>;
    };

    const client = (window as unknown as Window & { __vibeAuthClient?: AuthClient })
      .__vibeAuthClient;
    if (!client) throw new Error("Auth client E2E hook is unavailable");

    await client.login("user@example.com", "password123");
    const afterLogin = client.getAccessToken();
    const me = await client.getMe();
    const afterRefresh = client.getAccessToken();
    await client.logout();

    return {
      afterLogin,
      afterRefresh,
      afterLogout: client.getAccessToken(),
      userEmail: me.user.email,
      persistedToken: window.localStorage.getItem("accessToken"),
    };
  });

  expect(result).toEqual({
    afterLogin: "initial-token",
    afterRefresh: "refreshed-token",
    afterLogout: null,
    userEmail: "user@example.com",
    persistedToken: null,
  });
  expect(refreshCalls).toBe(1);
  expect(meCalls).toBe(2);
  expect(meAuthorizations).toEqual(["Bearer initial-token", "Bearer refreshed-token"]);
});

for (const coordination of ["Web Locks", "IndexedDB fallback"] as const) {
  test(`two tabs serialize refresh cookie rotation and propagate logout (${coordination})`, async ({
    page,
    context,
  }) => {
    if (coordination === "IndexedDB fallback") {
      await context.addInitScript(() => {
        Object.defineProperty(navigator, "locks", { configurable: true, value: undefined });
      });
    }

    let currentRefresh = "refresh-0";
    let rotation = 0;
    let inFlight = 0;
    let peakInFlight = 0;
    let rejectedRotations = 0;

    await context.route("http://localhost:3000/api/v1/auth/**", async (route) => {
      const request = route.request();
      const pathname = new URL(request.url()).pathname;
      if (request.method() === "OPTIONS") {
        await route.fulfill({ status: 204, headers: corsHeaders });
        return;
      }

      if (pathname.endsWith("/auth/login")) {
        await route.fulfill({
          status: 200,
          headers: {
            ...corsHeaders,
            "set-cookie": "refresh_token=refresh-0; Path=/api/v1/auth; HttpOnly; SameSite=Lax",
          },
          body: JSON.stringify({
            accessToken: "expired-access",
            accessTokenExpiresIn: 900,
            user: { id: "user-1", email: "user@example.com", createdAt: "2026-10-06T00:00:00Z" },
          }),
        });
        return;
      }

      if (pathname.endsWith("/auth/me")) {
        const authorized = request.headers().authorization?.startsWith("Bearer access-");
        await route.fulfill({
          status: authorized ? 200 : 401,
          headers: corsHeaders,
          body: authorized
            ? JSON.stringify({
                user: {
                  id: "user-1",
                  email: "user@example.com",
                  createdAt: "2026-10-06T00:00:00Z",
                },
              })
            : JSON.stringify({
                error: { code: "INVALID_TOKEN", message: "Expired", requestId: "req-401" },
              }),
        });
        return;
      }

      if (pathname.endsWith("/auth/refresh")) {
        const cookie = request.headers().cookie ?? "";
        if (!cookie.includes(`refresh_token=${currentRefresh}`)) {
          rejectedRotations += 1;
          await route.fulfill({
            status: 401,
            headers: corsHeaders,
            body: JSON.stringify({
              error: { code: "SESSION_REVOKED", message: "Replay", requestId: "req-replay" },
            }),
          });
          return;
        }

        inFlight += 1;
        peakInFlight = Math.max(peakInFlight, inFlight);
        await new Promise((resolve) => setTimeout(resolve, 75));
        rotation += 1;
        currentRefresh = `refresh-${rotation}`;
        inFlight -= 1;
        await route.fulfill({
          status: 200,
          headers: {
            ...corsHeaders,
            "set-cookie": `refresh_token=${currentRefresh}; Path=/api/v1/auth; HttpOnly; SameSite=Lax`,
          },
          body: JSON.stringify({
            accessToken: `access-${rotation}`,
            accessTokenExpiresIn: 900,
            user: { id: "user-1", email: "user@example.com", createdAt: "2026-10-06T00:00:00Z" },
          }),
        });
        return;
      }

      if (pathname.endsWith("/auth/logout")) {
        currentRefresh = "";
        await route.fulfill({
          status: 200,
          headers: {
            ...corsHeaders,
            "set-cookie": "refresh_token=; Path=/api/v1/auth; HttpOnly; SameSite=Lax; Max-Age=0",
          },
          body: JSON.stringify({ ok: true }),
        });
        return;
      }

      await route.abort();
    });

    await page.goto("/");
    const secondTab = await context.newPage();
    await secondTab.goto("/");
    await Promise.all([
      page.waitForFunction(() => "__vibeAuthClient" in window),
      secondTab.waitForFunction(() => "__vibeAuthClient" in window),
    ]);

    await page.evaluate(async () => {
      const client = (
        window as unknown as Window & {
          __vibeAuthClient: { login: (e: string, p: string) => Promise<unknown> };
        }
      ).__vibeAuthClient;
      await client.login("user@example.com", "password123");
    });

    const getMe = async (tab: typeof page) =>
      tab.evaluate(async () => {
        const client = (
          window as unknown as Window & {
            __vibeAuthClient: { getMe: () => Promise<{ user: { email: string } }> };
          }
        ).__vibeAuthClient;
        return (await client.getMe()).user.email;
      });

    expect(await Promise.all([getMe(page), getMe(secondTab)])).toEqual([
      "user@example.com",
      "user@example.com",
    ]);
    expect(rotation).toBe(2);
    expect(rejectedRotations).toBe(0);
    expect(peakInFlight).toBe(1);

    await page.evaluate(async () => {
      const client = (
        window as unknown as Window & { __vibeAuthClient: { logout: () => Promise<void> } }
      ).__vibeAuthClient;
      await client.logout();
    });

    await secondTab.waitForFunction(() => {
      const client = (
        window as unknown as Window & { __vibeAuthClient: { getAccessToken: () => string | null } }
      ).__vibeAuthClient;
      return client.getAccessToken() === null;
    });
  });

  test(`refresh and logout in different tabs cannot resurrect a cookie (${coordination})`, async ({
    page,
    context,
  }) => {
    if (coordination === "IndexedDB fallback") {
      await context.addInitScript(() => {
        Object.defineProperty(navigator, "locks", { configurable: true, value: undefined });
      });
    }

    let currentRefresh = "refresh-0";
    let releaseRefresh!: () => void;
    let refreshStarted!: () => void;
    const started = new Promise<void>((resolve) => {
      refreshStarted = resolve;
    });
    const release = new Promise<void>((resolve) => {
      releaseRefresh = resolve;
    });
    const logoutCookies: string[] = [];

    await context.route("http://localhost:3000/api/v1/auth/**", async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      if (request.method() === "OPTIONS") {
        await route.fulfill({ status: 204, headers: corsHeaders });
        return;
      }
      if (path.endsWith("/auth/login")) {
        await route.fulfill({
          status: 200,
          headers: {
            ...corsHeaders,
            "set-cookie": "refresh_token=refresh-0; Path=/api/v1/auth; HttpOnly; SameSite=Lax",
          },
          body: JSON.stringify({
            accessToken: "expired",
            accessTokenExpiresIn: 900,
            user: { id: "u", email: "user@example.com", createdAt: "2026-10-06T00:00:00Z" },
          }),
        });
        return;
      }
      if (path.endsWith("/auth/me")) {
        await route.fulfill({
          status: 401,
          headers: corsHeaders,
          body: JSON.stringify({
            error: { code: "INVALID_TOKEN", message: "Expired", requestId: "req-401" },
          }),
        });
        return;
      }
      if (path.endsWith("/auth/refresh")) {
        refreshStarted();
        await release;
        currentRefresh = "refresh-1";
        await route.fulfill({
          status: 200,
          headers: {
            ...corsHeaders,
            "set-cookie": "refresh_token=refresh-1; Path=/api/v1/auth; HttpOnly; SameSite=Lax",
          },
          body: JSON.stringify({
            accessToken: "new-access",
            accessTokenExpiresIn: 900,
            user: { id: "u", email: "user@example.com", createdAt: "2026-10-06T00:00:00Z" },
          }),
        });
        return;
      }
      if (path.endsWith("/auth/logout")) {
        logoutCookies.push(request.headers().cookie ?? "");
        currentRefresh = "";
        await route.fulfill({
          status: 200,
          headers: {
            ...corsHeaders,
            "set-cookie": "refresh_token=; Path=/api/v1/auth; HttpOnly; SameSite=Lax; Max-Age=0",
          },
          body: JSON.stringify({ ok: true }),
        });
        return;
      }
      await route.abort();
    });

    await page.goto("/");
    const secondTab = await context.newPage();
    await secondTab.goto("/");
    await Promise.all([
      page.waitForFunction(() => "__vibeAuthClient" in window),
      secondTab.waitForFunction(() => "__vibeAuthClient" in window),
    ]);

    await page.evaluate(async () => {
      const client = (
        window as unknown as Window & {
          __vibeAuthClient: { login: (e: string, p: string) => Promise<unknown> };
        }
      ).__vibeAuthClient;
      await client.login("user@example.com", "password123");
    });

    const pendingMe = page.evaluate(async () => {
      const client = (
        window as unknown as Window & { __vibeAuthClient: { getMe: () => Promise<unknown> } }
      ).__vibeAuthClient;
      try {
        await client.getMe();
      } catch {
        /* Concurrent logout should reject the refresh. */
      }
      return true;
    });

    await started;
    const pendingLogout = secondTab.evaluate(async () => {
      const client = (
        window as unknown as Window & { __vibeAuthClient: { logout: () => Promise<void> } }
      ).__vibeAuthClient;
      await client.logout();
    });
    releaseRefresh();
    await Promise.all([pendingMe, pendingLogout]);

    expect(logoutCookies).toHaveLength(1);
    expect(logoutCookies[0]).toContain("refresh_token=refresh-1");
    expect(currentRefresh).toBe("");
    await page.waitForFunction(() => {
      const client = (
        window as unknown as Window & { __vibeAuthClient: { getAccessToken: () => string | null } }
      ).__vibeAuthClient;
      return client.getAccessToken() === null;
    });
  });
}

test("IndexedDB fallback waits for and reclaims a tab crash lease", async ({ page, context }) => {
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "locks", { configurable: true, value: undefined });
  });

  let loginCalls = 0;
  await page.route("http://localhost:3000/api/v1/auth/**", async (route) => {
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: corsHeaders });
      return;
    }
    if (new URL(route.request().url()).pathname.endsWith("/auth/login")) {
      loginCalls += 1;
      await route.fulfill({
        status: 200,
        headers: {
          ...corsHeaders,
          "set-cookie": "refresh_token=recovered; Path=/api/v1/auth; HttpOnly; SameSite=Lax",
        },
        body: JSON.stringify({
          accessToken: "recovered-access",
          accessTokenExpiresIn: 900,
          user: { id: "u", email: "user@example.com", createdAt: "2026-10-06T00:00:00Z" },
        }),
      });
      return;
    }
    await route.abort();
  });

  await page.goto("/");
  await page.waitForFunction(() => "__vibeAuthClient" in window);

  // Simulate the orphan record of a tab closed before its finally/release.
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("vibe-auth-coordination", 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore("locks", { keyPath: "name" });
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("locks", "readwrite");
      tx.objectStore("locks").put({
        name: "vibe-auth-cookie",
        owner: "closed-tab",
        expiresAt: Date.now() + 350,
      });
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error);
    });
    db.close();
  });

  const { token, elapsedMs } = await page.evaluate(async () => {
    const client = (
      window as unknown as Window & {
        __vibeAuthClient: {
          login: (email: string, password: string) => Promise<{ accessToken: string }>;
        };
      }
    ).__vibeAuthClient;
    const start = performance.now();
    const token = (await client.login("user@example.com", "password123")).accessToken;
    return { token, elapsedMs: performance.now() - start };
  });

  expect(token).toBe("recovered-access");
  expect(elapsedMs).toBeGreaterThanOrEqual(200);
  expect(loginCalls).toBe(1);

  const record = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open("vibe-auth-coordination", 1);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(req.result);
    });
    const lease = await new Promise<unknown>((resolve, reject) => {
      const tx = db.transaction("locks", "readonly");
      const req = tx.objectStore("locks").get("vibe-auth-cookie");
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return lease;
  });
  expect(record).toBeNull();
});

test("auth mutations fail closed if Web Locks and IndexedDB are unavailable", async ({
  page,
  context,
}) => {
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "locks", { configurable: true, value: undefined });
    Object.defineProperty(window, "indexedDB", { configurable: true, value: undefined });
  });

  let loginCalls = 0;
  await page.route("http://localhost:3000/api/v1/auth/**", async (route) => {
    if (route.request().method() !== "OPTIONS") loginCalls += 1;
    await route.fulfill({ status: 204, headers: corsHeaders });
  });
  await page.goto("/");
  await page.waitForFunction(() => "__vibeAuthClient" in window);

  const result = await page.evaluate(async () => {
    const client = (
      window as unknown as Window & {
        __vibeAuthClient: { login: (email: string, password: string) => Promise<unknown> };
      }
    ).__vibeAuthClient;
    return client.login("user@example.com", "password123").then(
      () => "unexpected-success",
      (error: Error) => error.message,
    );
  });
  expect(result).toContain("IndexedDB is required");
  expect(loginCalls).toBe(0);
});

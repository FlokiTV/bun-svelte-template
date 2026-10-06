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

  const result = await page.evaluate(async () => {
    const authClientModule = "/src/lib/auth/client.ts";
    const client = await import(authClientModule);

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

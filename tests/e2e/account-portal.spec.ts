import { expect, test } from "@playwright/test";

const headers = {
  "access-control-allow-credentials": "true",
  "access-control-allow-headers": "authorization,content-type",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-origin": "http://localhost:5173",
  "content-type": "application/json",
};

const user = {
  id: "account-1",
  email: "customer@example.com",
  createdAt: "2026-11-04T00:00:00.000Z",
};

test("account login, reload restoration and logout through HttpOnly cookie", async ({
  page,
  context,
}) => {
  let loginCalls = 0;
  let refreshCalls = 0;
  let logoutCalls = 0;

  await context.route("http://localhost:3000/api/v1/auth/**", async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers });
      return;
    }
    if (pathname.endsWith("/auth/login")) {
      loginCalls += 1;
      await route.fulfill({
        status: 200,
        headers: {
          ...headers,
          "set-cookie": "refresh_token=portal-1; Path=/api/v1/auth; HttpOnly; SameSite=Lax",
        },
        body: JSON.stringify({ accessToken: "access-1", accessTokenExpiresIn: 900, user }),
      });
      return;
    }
    if (pathname.endsWith("/auth/refresh")) {
      const cookie = request.headers().cookie ?? "";
      if (!cookie.includes("refresh_token=portal-1")) {
        await route.fulfill({
          status: 401,
          headers,
          body: JSON.stringify({
            error: {
              code: "INVALID_REFRESH_TOKEN",
              message: "Missing cookie",
              requestId: "missing",
            },
          }),
        });
        return;
      }
      refreshCalls += 1;
      await route.fulfill({
        status: 200,
        headers: {
          ...headers,
          "set-cookie": "refresh_token=portal-1; Path=/api/v1/auth; HttpOnly; SameSite=Lax",
        },
        body: JSON.stringify({ accessToken: "access-2", accessTokenExpiresIn: 900, user }),
      });
      return;
    }
    if (pathname.endsWith("/auth/logout")) {
      logoutCalls += 1;
      await route.fulfill({
        status: 200,
        headers: {
          ...headers,
          "set-cookie": "refresh_token=; Path=/api/v1/auth; HttpOnly; SameSite=Lax; Max-Age=0",
        },
        body: JSON.stringify({ ok: true }),
      });
      return;
    }
    await route.abort();
  });

  await page.goto("/account");
  await expect(page.getByRole("button", { name: "Entrar na conta" })).toBeVisible();
  await page.getByLabel("E-mail").fill("customer@example.com");
  await page.getByLabel("Senha").fill("correct-horse-battery-staple");
  await page.getByRole("button", { name: "Entrar na conta" }).click();

  await expect(page.getByRole("heading", { name: "Área da conta" })).toBeVisible();
  await expect(page.getByText(user.email, { exact: true })).toBeVisible();
  expect(loginCalls).toBe(1);

  // The access JWT is memory-only. Reload requires the HttpOnly refresh cookie.
  await page.reload();
  await expect(page.getByRole("heading", { name: "Área da conta" })).toBeVisible();
  expect(refreshCalls).toBe(1);

  await page.getByRole("button", { name: "Sair da conta" }).click();
  await expect(page.getByRole("button", { name: "Entrar na conta" })).toBeVisible();
  expect(logoutCalls).toBe(1);
  expect(
    (await context.cookies()).filter((cookie) => cookie.name === "refresh_token"),
  ).toHaveLength(0);
});

test("account registration shows actionable validation and avoids leaking server errors", async ({
  page,
  context,
}) => {
  let calls = 0;
  await context.route("http://localhost:3000/api/v1/auth/**", async (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers });
      return;
    }
    if (new URL(request.url()).pathname.endsWith("/auth/refresh")) {
      await route.fulfill({
        status: 401,
        headers,
        body: JSON.stringify({
          error: { code: "INVALID_REFRESH_TOKEN", message: "Missing", requestId: "no-session" },
        }),
      });
      return;
    }
    if (new URL(request.url()).pathname.endsWith("/auth/register")) {
      calls += 1;
      await route.fulfill({
        status: 409,
        headers,
        body: JSON.stringify({
          error: {
            code: "EMAIL_IN_USE",
            message: "Private details must never be shown!",
            requestId: "duplicate",
          },
        }),
      });
      return;
    }
    await route.abort();
  });

  await page.goto("/account");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await page.getByLabel("E-mail").fill("customer@example.com");
  await page.getByLabel("Senha").fill("correct-horse-battery-staple");
  await page.getByRole("button", { name: "Criar minha conta" }).click();

  await expect(page.getByRole("alert")).toHaveText("Este e-mail já está cadastrado.");
  expect(await page.getByText("Private details must never be shown!").count()).toBe(0);
  expect(calls).toBe(1);
});

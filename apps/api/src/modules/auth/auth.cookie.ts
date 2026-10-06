import type { Cookie } from "elysia";
import { config } from "../../config";

export const REFRESH_COOKIE_PATH = "/api/v1/auth";

export function setRefreshCookie(cookie: Cookie<unknown>, token: string): void {
  cookie.value = token;
  cookie.set({
    httpOnly: true,
    secure: config.authCookieSecure,
    sameSite: config.authCookieSameSite,
    path: REFRESH_COOKIE_PATH,
    maxAge: config.jwtRefreshTtlSeconds,
  });
}

export function clearRefreshCookie(cookie: Cookie<unknown> | undefined): void {
  if (!cookie) return;

  cookie.set({
    value: "",
    httpOnly: true,
    secure: config.authCookieSecure,
    sameSite: config.authCookieSameSite,
    path: REFRESH_COOKIE_PATH,
    expires: new Date(0),
    maxAge: 0,
  });
}

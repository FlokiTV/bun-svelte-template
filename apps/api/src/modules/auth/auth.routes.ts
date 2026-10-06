import { Elysia, t } from "elysia";
import { config } from "../../config";
import { ErrorResponseSchema, errorResponse } from "../../core/error-response";
import { ERROR_CODES } from "../../core/errors";
import { rateLimitGuard } from "../../core/rate-limit";
import { requestIdFor } from "../../core/request-id";
import { authGuard } from "./auth.guard";
import { AuthCredentialsBody, AuthMeResponseSchema, AuthSessionResponseSchema } from "./auth.model";
import { findUserById, revokeSession } from "./auth.repository";
import {
  authenticateUser,
  createSessionForUser,
  getAuthUser,
  isRefreshPayload,
  makeAccessPayload,
  makeRefreshPayload,
  registerUser,
  rotateSession,
  toSessionResponse,
} from "./auth.service";

export const authRoutes = new Elysia({ prefix: "/auth" })
  .use(rateLimitGuard)
  .use(authGuard)
  .post(
    "/register",
    async ({ body, cookie, accessJwt, refreshJwt, request, status }) => {
      const user = await registerUser(body.email, body.password);
      if (!user) {
        return status(
          409,
          errorResponse(
            ERROR_CODES.EMAIL_IN_USE,
            "Email is already registered",
            requestIdFor(request),
          ),
        );
      }

      const sessionId = await createSessionForUser(user.id, config.jwtRefreshTtlSeconds);
      const accessToken = await accessJwt.sign(
        makeAccessPayload(user.id, sessionId, config.jwtAccessTtlSeconds),
      );
      const refreshToken = await refreshJwt.sign(
        makeRefreshPayload(user.id, sessionId, config.jwtRefreshTtlSeconds),
      );
      const refreshCookie = cookie.refresh_token;
      if (!refreshCookie) throw new Error("Refresh cookie context is unavailable");

      refreshCookie.value = refreshToken;
      refreshCookie.set({
        httpOnly: true,
        secure: config.authCookieSecure,
        sameSite: config.authCookieSameSite,
        path: "/api/v1/auth",
        maxAge: config.jwtRefreshTtlSeconds,
      });

      return toSessionResponse(accessToken, config.jwtAccessTtlSeconds, user);
    },
    {
      rateLimit: "auth",
      body: AuthCredentialsBody,
      response: {
        200: AuthSessionResponseSchema,
        409: ErrorResponseSchema,
      },
      detail: {
        tags: ["Auth"],
        summary: "Register with email and password",
      },
    },
  )
  .post(
    "/login",
    async ({ body, cookie, accessJwt, refreshJwt, request, status }) => {
      const user = await authenticateUser(body.email, body.password);
      if (!user) {
        return status(
          401,
          errorResponse(
            ERROR_CODES.INVALID_CREDENTIALS,
            "Invalid email or password",
            requestIdFor(request),
          ),
        );
      }

      const sessionId = await createSessionForUser(user.id, config.jwtRefreshTtlSeconds);
      const accessToken = await accessJwt.sign(
        makeAccessPayload(user.id, sessionId, config.jwtAccessTtlSeconds),
      );
      const refreshToken = await refreshJwt.sign(
        makeRefreshPayload(user.id, sessionId, config.jwtRefreshTtlSeconds),
      );
      const refreshCookie = cookie.refresh_token;
      if (!refreshCookie) throw new Error("Refresh cookie context is unavailable");

      refreshCookie.value = refreshToken;
      refreshCookie.set({
        httpOnly: true,
        secure: config.authCookieSecure,
        sameSite: config.authCookieSameSite,
        path: "/api/v1/auth",
        maxAge: config.jwtRefreshTtlSeconds,
      });

      return toSessionResponse(accessToken, config.jwtAccessTtlSeconds, user);
    },
    {
      rateLimit: "auth",
      body: AuthCredentialsBody,
      response: {
        200: AuthSessionResponseSchema,
        401: ErrorResponseSchema,
      },
      detail: {
        tags: ["Auth"],
        summary: "Login with email and password",
      },
    },
  )
  .post(
    "/refresh",
    async ({ cookie, accessJwt, refreshJwt, request, status }) => {
      const refreshCookie = cookie.refresh_token;
      if (!refreshCookie || typeof refreshCookie.value !== "string") {
        return status(
          401,
          errorResponse(
            ERROR_CODES.INVALID_REFRESH_TOKEN,
            "Refresh token is missing",
            requestIdFor(request),
          ),
        );
      }

      const rawRefreshToken = refreshCookie.value;
      const payload = await refreshJwt.verify(rawRefreshToken);
      if (!isRefreshPayload(payload)) {
        refreshCookie.remove();
        return status(
          401,
          errorResponse(
            ERROR_CODES.INVALID_REFRESH_TOKEN,
            "Refresh token is invalid or expired",
            requestIdFor(request),
          ),
        );
      }

      const user = await findUserById(payload.sub);
      if (!user) {
        refreshCookie.remove();
        return status(
          401,
          errorResponse(
            ERROR_CODES.INVALID_REFRESH_TOKEN,
            "Refresh token is invalid",
            requestIdFor(request),
          ),
        );
      }

      const nextSessionId = await rotateSession(
        payload.sid,
        payload.sub,
        config.jwtRefreshTtlSeconds,
      );
      if (!nextSessionId) {
        refreshCookie.remove();
        return status(
          401,
          errorResponse(
            ERROR_CODES.SESSION_REVOKED,
            "Session is no longer active",
            requestIdFor(request),
          ),
        );
      }

      const accessToken = await accessJwt.sign(
        makeAccessPayload(user.id, nextSessionId, config.jwtAccessTtlSeconds),
      );
      const refreshToken = await refreshJwt.sign(
        makeRefreshPayload(user.id, nextSessionId, config.jwtRefreshTtlSeconds),
      );

      refreshCookie.value = refreshToken;
      refreshCookie.set({
        httpOnly: true,
        secure: config.authCookieSecure,
        sameSite: config.authCookieSameSite,
        path: "/api/v1/auth",
        maxAge: config.jwtRefreshTtlSeconds,
      });

      return toSessionResponse(accessToken, config.jwtAccessTtlSeconds, user);
    },
    {
      rateLimit: "auth",
      response: {
        200: AuthSessionResponseSchema,
        401: ErrorResponseSchema,
      },
      detail: {
        tags: ["Auth"],
        summary: "Rotate refresh token and issue a new access token",
      },
    },
  )
  .post(
    "/logout",
    async ({ cookie, refreshJwt }) => {
      const refreshCookie = cookie.refresh_token;
      const rawRefreshToken = refreshCookie?.value;
      if (typeof rawRefreshToken === "string") {
        const payload = await refreshJwt.verify(rawRefreshToken);
        if (isRefreshPayload(payload)) {
          await revokeSession(payload.sid);
        }
      }

      refreshCookie?.remove();
      return { ok: true };
    },
    {
      response: t.Object({ ok: t.Boolean() }),
      detail: {
        tags: ["Auth"],
        summary: "Revoke the current refresh session",
      },
    },
  )
  .get(
    "/me",
    async ({ auth, request, status }) => {
      const user = await getAuthUser(auth.userId);
      if (!user) {
        return status(
          401,
          errorResponse(ERROR_CODES.UNAUTHORIZED, "User no longer exists", requestIdFor(request)),
        );
      }
      return { user };
    },
    {
      auth: true,
      response: {
        200: AuthMeResponseSchema,
        401: ErrorResponseSchema,
      },
      detail: {
        tags: ["Auth"],
        summary: "Return the authenticated user",
        security: [{ bearerAuth: [] }],
      },
    },
  );

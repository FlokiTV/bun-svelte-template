import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { Elysia } from "elysia";
import { config } from "./config";
import { errorResponse } from "./core/error-response";
import { ERROR_CODES } from "./core/errors";
import { logger } from "./core/logger";
import { opsRoutes } from "./core/ops.routes";
import { rateLimitGuard } from "./core/rate-limit";
import { requestIdFor } from "./core/request-id";
import { markRequestStarted, requestLogContext } from "./core/request-timing";
import { applySecurityHeaders } from "./core/security-headers";
import { apiModules } from "./modules";
import { realtimeRoutes } from "./modules/realtime/realtime.routes";

const versionedApi = new Elysia({ prefix: "/api/v1" }).use(rateLimitGuard).use(apiModules);

export const app = new Elysia({
  serve: {
    maxRequestBodySize: config.maxRequestBodyBytes,
    idleTimeout: config.idleTimeoutSeconds,
  },
})
  .onRequest(({ request, set }) => {
    markRequestStarted(request);
    const requestId = requestIdFor(request);
    set.headers["x-request-id"] = requestId;
    applySecurityHeaders(set.headers, config.environment);
    logger.info("http.request.started", {
      requestId,
      method: request.method,
      path: new URL(request.url).pathname,
    });
  })
  .onError(({ code, error, request, status }) => {
    const requestId = requestIdFor(request);

    if (code === "VALIDATION") {
      logger.warn("http.validation_failed", {
        ...requestLogContext(request),
      });
      return status(422, errorResponse(ERROR_CODES.VALIDATION_ERROR, "Invalid request", requestId));
    }

    if (code === "NOT_FOUND") {
      return status(404, errorResponse(ERROR_CODES.NOT_FOUND, "Not found", requestId));
    }

    logger.error("http.request_failed", {
      ...requestLogContext(request),
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage: error instanceof Error ? error.message : "Unhandled non-Error failure",
    });

    return status(
      500,
      errorResponse(ERROR_CODES.INTERNAL_ERROR, "Internal server error", requestId),
    );
  })
  .use(
    cors({
      origin: config.corsOrigins,
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
      exposeHeaders: ["X-Request-ID", "RateLimit-Limit", "RateLimit-Remaining", "RateLimit-Reset"],
    }),
  )
  .use(
    openapi({
      provider: "scalar",
      documentation: {
        info: {
          title: "Vibe API",
          version: config.appVersion,
        },
        components: {
          securitySchemes: {
            bearerAuth: {
              type: "http",
              scheme: "bearer",
              bearerFormat: "JWT",
            },
          },
        },
      },
    }),
  )
  .use(opsRoutes)
  .use(versionedApi)
  .use(realtimeRoutes)
  .onAfterResponse(({ request, set }) => {
    logger.info("http.request.finished", {
      ...requestLogContext(request),
      method: request.method,
      path: new URL(request.url).pathname,
      status: set.status ?? 200,
    });
  });

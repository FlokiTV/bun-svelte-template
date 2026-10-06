import { Elysia, t } from "elysia";
import { config } from "../config";
import { pingDb } from "../db/client";

export const opsRoutes = new Elysia({ name: "ops" })
  .get(
    "/health",
    () => ({
      status: "ok" as const,
      timestamp: new Date().toISOString(),
    }),
    {
      response: t.Object({
        status: t.Literal("ok"),
        timestamp: t.String(),
      }),
      detail: {
        tags: ["System"],
        summary: "Liveness check",
      },
    },
  )
  .get(
    "/ready",
    async ({ status }) => {
      try {
        if (config.databaseUrl) await pingDb();
        return {
          status: "ready" as const,
          database: config.databaseUrl ? ("ok" as const) : ("not-configured" as const),
        };
      } catch {
        return status(503, {
          status: "not-ready" as const,
          database: "error" as const,
        });
      }
    },
    {
      response: {
        200: t.Object({
          status: t.Literal("ready"),
          database: t.Union([t.Literal("ok"), t.Literal("not-configured")]),
        }),
        503: t.Object({
          status: t.Literal("not-ready"),
          database: t.Literal("error"),
        }),
      },
      detail: {
        tags: ["System"],
        summary: "Readiness check",
      },
    },
  )
  .get(
    "/meta",
    () => ({
      app: config.appName,
      version: config.appVersion,
      environment: config.environment,
      runtime: `bun-${Bun.version}`,
    }),
    {
      response: t.Object({
        app: t.String(),
        version: t.String(),
        environment: t.String(),
        runtime: t.String(),
      }),
      detail: {
        tags: ["System"],
        summary: "Runtime metadata",
      },
    },
  );

import type { HealthResponse } from "@vibe/contracts";
import { Elysia, t } from "elysia";

export const healthRoutes = new Elysia({ prefix: "/health" }).get(
  "/",
  (): HealthResponse => ({
    status: "ok",
    service: "api",
    timestamp: new Date().toISOString(),
  }),
  {
    response: t.Object({
      status: t.Literal("ok"),
      service: t.String(),
      timestamp: t.String(),
    }),
    detail: {
      tags: ["System"],
      summary: "Health check",
    },
  },
);

import { Elysia, t } from "elysia";
import { rateLimitGuard } from "../../core/rate-limit";
import { EchoBody } from "./example.model";
import { echo } from "./example.service";

export const exampleRoutes = new Elysia({ prefix: "/example" })
  .use(rateLimitGuard)
  .post("/echo", ({ body }) => echo(body), {
    rateLimit: "default",
    body: EchoBody,
    response: t.Object({
      message: t.String(),
      receivedAt: t.String(),
    }),
    detail: {
      tags: ["Example"],
      summary: "Example validated endpoint",
      description: "Delete this module after creating the first real feature.",
    },
  });

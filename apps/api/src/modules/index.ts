import { Elysia } from "elysia";
import { authRoutes } from "./auth/auth.routes";
import { exampleRoutes } from "./example/example.routes";
import { healthRoutes } from "./health/health.routes";

export const apiModules = new Elysia().use(authRoutes).use(healthRoutes).use(exampleRoutes);

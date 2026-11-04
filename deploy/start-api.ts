/**
 * Fail closed before opening a public listener when a production deployment
 * was started without its required database/configuration.
 */
import { loadApiConfig } from "@vibe/config";

const config = loadApiConfig(Bun.env);
if (config.environment !== "production") {
  throw new Error("Production API container requires NODE_ENV=production");
}
if (!config.databaseUrl) {
  throw new Error("Production API container requires DATABASE_URL");
}

await import("../apps/api/src/index");

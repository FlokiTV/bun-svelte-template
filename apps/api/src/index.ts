import { app } from "./app";
import { config } from "./config";
import { logger } from "./core/logger";
import { closeDb } from "./db/client";

app.listen({ hostname: config.host, port: config.port });
logger.info("api.started", {
  host: config.host,
  port: config.port,
  openapi: `http://localhost:${config.port}/openapi`,
});

let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info("api.shutdown.started", { signal });

  const timeout = setTimeout(() => {
    logger.error("api.shutdown.timeout", { timeoutMs: config.shutdownTimeoutMs });
    process.exit(1);
  }, config.shutdownTimeoutMs);

  try {
    await app.server?.stop(false);
    await closeDb();
    clearTimeout(timeout);
    logger.info("api.shutdown.completed");
    process.exit(0);
  } catch (error) {
    clearTimeout(timeout);
    logger.error("api.shutdown.failed", {
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));

import { app } from "./app";
import { config } from "./config";
import { logger } from "./core/logger";
import { closeDb } from "./db/client";
import { pruneExpiredSessions } from "./modules/auth/auth.repository";

app.listen({ hostname: config.host, port: config.port });
logger.info("api.started", {
  host: config.host,
  port: config.port,
  openapi: `http://localhost:${config.port}/openapi`,
});

async function pruneAuthSessions(): Promise<void> {
  try {
    const deleted = await pruneExpiredSessions();
    if (deleted > 0) logger.info("auth.sessions.pruned", { deleted });
  } catch (error) {
    logger.error("auth.sessions.prune_failed", {
      errorMessage: error instanceof Error ? error.message : String(error),
    });
  }
}

let sessionPruneTimer: ReturnType<typeof setInterval> | undefined;
if (config.databaseUrl) {
  void pruneAuthSessions();
  sessionPruneTimer = setInterval(
    () => void pruneAuthSessions(),
    config.authSessionPruneIntervalMs,
  );
  sessionPruneTimer.unref?.();
}

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
    if (sessionPruneTimer) clearInterval(sessionPruneTimer);
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

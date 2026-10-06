import { loadApiConfig } from "@vibe/config";

/**
 * The only API-runtime location allowed to read Bun.env directly.
 * Modules import this validated immutable config object instead.
 */
export const config = loadApiConfig(Bun.env);

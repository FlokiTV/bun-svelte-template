export type RuntimeEnvironment = "development" | "test" | "production";
export type SameSite = "lax" | "strict" | "none";
export type EnvSource = Record<string, string | undefined>;

function stringValue(source: EnvSource, name: string, fallback?: string): string {
  const value = source[name]?.trim();
  if (value) return value;
  if (fallback !== undefined) return fallback;
  throw new Error(`${name} is required`);
}

function optionalString(source: EnvSource, name: string): string | undefined {
  const value = source[name]?.trim();
  return value || undefined;
}

function positiveInteger(source: EnvSource, name: string, fallback: number): number {
  const raw = source[name];
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}

function booleanValue(source: EnvSource, name: string, fallback: boolean): boolean {
  const raw = source[name];
  if (!raw) return fallback;
  if (raw === "true") return true;
  if (raw === "false") return false;
  throw new Error(`${name} must be true or false`);
}

function environmentValue(source: EnvSource): RuntimeEnvironment {
  const value = source.NODE_ENV ?? "development";
  if (value === "development" || value === "test" || value === "production") {
    return value;
  }
  throw new Error("NODE_ENV must be development, test, or production");
}

function sameSiteValue(source: EnvSource): SameSite {
  const value = source.AUTH_COOKIE_SAME_SITE ?? "lax";
  if (value === "lax" || value === "strict" || value === "none") return value;
  throw new Error("AUTH_COOKIE_SAME_SITE must be lax, strict, or none");
}

function csvValue(source: EnvSource, name: string, fallback: string[]): string[] {
  const raw = source[name];
  if (!raw) return fallback;
  const values = raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (values.length === 0) throw new Error(`${name} must contain at least one value`);
  return [...new Set(values)];
}

function corsOriginsValue(source: EnvSource): string[] {
  const values = csvValue(source, "CORS_ORIGINS", [
    source.WEB_ORIGIN?.trim() || "http://localhost:5173",
  ]);

  const origins = values.map((value) => {
    if (value === "*") throw new Error("CORS_ORIGINS must not contain wildcard origins");

    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new Error(`CORS_ORIGINS contains an invalid URL: ${value}`);
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error(`CORS_ORIGINS only supports http/https origins: ${value}`);
    }
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
      throw new Error(`CORS_ORIGINS entries must be origins without path/query/fragment: ${value}`);
    }

    return url.origin;
  });

  return [...new Set(origins)];
}

function secretValue(
  source: EnvSource,
  name: string,
  environment: RuntimeEnvironment,
  developmentFallback: string,
): string {
  const value = source[name]?.trim();
  if (value) {
    if (environment === "production") {
      if (value.length < 32) {
        throw new Error(`${name} must be at least 32 characters in production`);
      }
      if (value === developmentFallback || value.toLowerCase().includes("change-me")) {
        throw new Error(`${name} still contains a development placeholder`);
      }
    }
    return value;
  }

  if (environment === "production") throw new Error(`${name} is required in production`);
  return developmentFallback;
}

export function loadApiConfig(source: EnvSource) {
  const environment = environmentValue(source);
  const authCookieSecure = booleanValue(source, "AUTH_COOKIE_SECURE", environment === "production");
  const authCookieSameSite = sameSiteValue(source);

  if (authCookieSameSite === "none" && !authCookieSecure) {
    throw new Error("AUTH_COOKIE_SECURE must be true when AUTH_COOKIE_SAME_SITE=none");
  }
  if (environment === "production" && !authCookieSecure) {
    throw new Error("AUTH_COOKIE_SECURE must be true in production");
  }
  if (environment === "production" && !source.CORS_ORIGINS?.trim()) {
    throw new Error("CORS_ORIGINS is required in production");
  }

  return Object.freeze({
    environment,
    host: stringValue(source, "API_HOST", "0.0.0.0"),
    port: positiveInteger(source, "API_PORT", 3000),
    appName: stringValue(source, "APP_NAME", "vibe-api"),
    appVersion: stringValue(source, "APP_VERSION", "1.0.0"),
    corsOrigins: corsOriginsValue(source),
    databaseUrl: optionalString(source, "DATABASE_URL"),
    maxRequestBodyBytes: positiveInteger(source, "API_MAX_BODY_MB", 1) * 1024 * 1024,
    idleTimeoutSeconds: positiveInteger(source, "API_IDLE_TIMEOUT_SECONDS", 30),
    shutdownTimeoutMs: positiveInteger(source, "SHUTDOWN_TIMEOUT_MS", 10_000),
    outboundTimeoutMs: positiveInteger(source, "OUTBOUND_HTTP_TIMEOUT_MS", 10_000),
    trustProxyHeaders: booleanValue(source, "TRUST_PROXY_HEADERS", false),
    rateLimitEnabled: booleanValue(source, "RATE_LIMIT_ENABLED", true),
    rateLimitDefaultMax: positiveInteger(source, "RATE_LIMIT_DEFAULT_MAX", 120),
    rateLimitAuthMax: positiveInteger(source, "RATE_LIMIT_AUTH_MAX", 10),
    rateLimitWindowMs: positiveInteger(source, "RATE_LIMIT_WINDOW_MS", 60_000),
    jwtAccessSecret: secretValue(
      source,
      "JWT_ACCESS_SECRET",
      environment,
      "dev-access-secret-change-me",
    ),
    jwtRefreshSecret: secretValue(
      source,
      "JWT_REFRESH_SECRET",
      environment,
      "dev-refresh-secret-change-me",
    ),
    jwtAccessTtlSeconds: positiveInteger(source, "JWT_ACCESS_TTL_SECONDS", 15 * 60),
    jwtRefreshTtlSeconds: positiveInteger(source, "JWT_REFRESH_TTL_SECONDS", 30 * 24 * 60 * 60),
    authCookieSecure,
    authCookieSameSite,
  });
}

export type ApiConfig = ReturnType<typeof loadApiConfig>;

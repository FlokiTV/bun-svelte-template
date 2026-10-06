import { Elysia } from "elysia";
import { config } from "../config";
import { ErrorResponseSchema, errorResponse } from "./error-response";
import { ERROR_CODES } from "./errors";
import { requestIdFor } from "./request-id";

export type RateLimitPolicy = "default" | "auth";

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

function clientKey(
  request: Request,
  server: {
    requestIP?: (request: Request) => { address?: string } | null;
  } | null,
): string {
  if (config.trustProxyHeaders) {
    const cf = request.headers.get("cf-connecting-ip")?.trim();
    if (cf) return cf;

    const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    if (forwarded) return forwarded;
  }

  return server?.requestIP?.(request)?.address ?? "unknown";
}

function consume(
  key: string,
  max: number,
  windowMs: number,
): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  const now = Date.now();
  let bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
  }

  bucket.count += 1;
  buckets.set(key, bucket);

  if (buckets.size > MAX_BUCKETS) {
    for (const [candidate, value] of buckets) {
      if (value.resetAt <= now) buckets.delete(candidate);
    }

    while (buckets.size > MAX_BUCKETS) {
      const oldestKey = buckets.keys().next().value;
      if (!oldestKey) break;
      buckets.delete(oldestKey);
    }
  }

  return {
    allowed: bucket.count <= max,
    remaining: Math.max(0, max - bucket.count),
    resetAt: bucket.resetAt,
  };
}

function maxFor(policy: RateLimitPolicy): number {
  return policy === "auth" ? config.rateLimitAuthMax : config.rateLimitDefaultMax;
}

export const rateLimitGuard = new Elysia({ name: "rate-limit-guard" }).macro({
  rateLimit: (policy: RateLimitPolicy) => ({
    response: {
      429: ErrorResponseSchema,
    },
    beforeHandle({ request, server, set, status }) {
      if (!config.rateLimitEnabled) return;

      const max = maxFor(policy);
      const key = `${policy}:${clientKey(request, server)}`;
      const result = consume(key, max, config.rateLimitWindowMs);

      set.headers["ratelimit-limit"] = String(max);
      set.headers["ratelimit-remaining"] = String(result.remaining);
      set.headers["ratelimit-reset"] = String(Math.ceil(result.resetAt / 1000));

      if (result.allowed) return;

      const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
      set.headers["retry-after"] = String(retryAfter);

      return status(
        429,
        errorResponse(ERROR_CODES.RATE_LIMITED, "Too many requests", requestIdFor(request)),
      );
    },
  }),
});

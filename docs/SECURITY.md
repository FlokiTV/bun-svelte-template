# Security baseline

The template ships with conservative defaults, not a complete security program.

## Included
- validated startup configuration;
- production JWT secret length checks;
- HttpOnly refresh cookie architecture;
- browser auth helper restricted to the configured API origin before sending Bearer tokens or cookies;
- single-flight refresh handling for rotated refresh sessions;
- logout generation guard so an in-flight refresh cannot restore local auth state after logout;
- validated CORS allow-list restricted to explicit `http`/`https` origins;
- browser `Origin` enforcement on register/login/refresh/logout and WebSocket handshakes;
- common security response headers;
- Bun/Elysia request body size limit;
- per-route rate-limit macro (`rateLimit: "default" | "auth"`);
- global API error sanitization for validation/not-found/internal failures;
- request IDs, monotonic `durationMs`, and structured logging without secrets;
- outbound request timeout helper;
- local secret scan executed by the completion gate and CI;
- refresh-session family replay detection and periodic pruning;
- JWT issuer/audience scoping;
- process-local WebSocket connection/message limits;
- graceful shutdown;
- liveness and readiness endpoints.

## Proxy warning
`TRUST_PROXY_HEADERS=false` by default. Only enable it when the service is behind a trusted proxy that strips/sets forwarding headers. Otherwise clients can spoof their IP address and bypass IP-based controls.

## Rate-limit warning
The built-in rate limiter is process-local. It is appropriate as a baseline and for single-instance deployments. Multi-instance deployments that require consistent limits must use a shared store.

## Browser auth boundary
The provided browser helper treats the configured API origin as the authentication boundary. Authenticated requests to another origin are rejected before credentials are attached. Keep third-party HTTP calls on a separate unauthenticated client.

Concurrent expired requests share one refresh operation because refresh sessions rotate on use. Each protected request retries at most once after a successful refresh.

## Dependency audit
CI runs `bun run audit:ci`, which blocks high and critical advisories.

Lower-severity transitives are still reviewed explicitly. The current known exception is `esbuild@0.18.20` through Drizzle Kit's legacy loader chain (moderate severity). Drizzle Kit is a development/migration tool and is not part of the production API runtime bundle.

The previous low-severity `cookie@0.6.0` advisory is no longer present in the dependency graph. Do not expose local development servers to untrusted networks. Reassess the remaining exception whenever Drizzle Kit or its transitive chain changes.

## Secrets
Never commit production `.env` files, private keys, tokens or credentials. CI uses frozen dependencies and secret scanning, but reviewers must still inspect changes.

For repositories that need full Git-history secret scanning, add the organization-approved scanner separately. The base template avoids a vendor-specific CI action or license requirement.

# Security baseline

The template ships with conservative defaults, not a complete security program.

## Included
- validated startup configuration;
- production JWT secret length checks;
- HttpOnly refresh cookie architecture;
- configurable CORS allow-list;
- common security response headers;
- Bun/Elysia request body size limit;
- per-route rate-limit macro (`rateLimit: "default" | "auth"`);
- request IDs and structured logging without secrets;
- outbound request timeout helper;
- local secret scan executed by the completion gate and CI;
- graceful shutdown;
- liveness and readiness endpoints.

## Proxy warning
`TRUST_PROXY_HEADERS=false` by default. Only enable it when the service is behind a trusted proxy that strips/sets forwarding headers. Otherwise clients can spoof their IP address and bypass IP-based controls.

## Rate-limit warning
The built-in rate limiter is process-local. It is appropriate as a baseline and for single-instance deployments. Multi-instance deployments that require consistent limits must use a shared store.

## Secrets
Never commit production `.env` files, private keys, tokens or credentials. CI uses frozen dependencies and secret scanning, but reviewers must still inspect changes.


For repositories that need full Git-history secret scanning, add the organization-approved scanner separately. The base template avoids a vendor-specific CI action or license requirement.

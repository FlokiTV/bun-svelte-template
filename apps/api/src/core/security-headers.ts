import type { RuntimeEnvironment } from "@vibe/config";

export function applySecurityHeaders(
  headers: Record<string, string | number | undefined>,
  environment: RuntimeEnvironment,
): void {
  headers["x-content-type-options"] = "nosniff";
  headers["x-frame-options"] = "DENY";
  headers["referrer-policy"] = "no-referrer";
  headers["permissions-policy"] = "camera=(), microphone=(), geolocation=()";
  headers["cross-origin-opener-policy"] = "same-origin";
  if (environment === "production") {
    headers["strict-transport-security"] = "max-age=31536000; includeSubDomains";
  }
}

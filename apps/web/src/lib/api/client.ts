import type { HealthResponse } from "@vibe/contracts";
import { requestJson } from "./request";

const baseUrl =
  import.meta.env.PUBLIC_API_URL ??
  (import.meta.env.DEV ? "http://localhost:3000/api/v1" : "/api/v1");

export function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return requestJson<HealthResponse>(`${baseUrl}/health`, {
    ...(signal ? { signal } : {}),
    headers: {
      accept: "application/json",
    },
  });
}

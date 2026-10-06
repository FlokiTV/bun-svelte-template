import type { HealthResponse } from "@vibe/contracts";
import { requestJson } from "./request";

const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api/v1";

export function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return requestJson<HealthResponse>(`${baseUrl}/health`, {
    signal,
    headers: {
      accept: "application/json",
    },
  });
}

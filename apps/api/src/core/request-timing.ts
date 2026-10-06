import { requestIdFor } from "./request-id";

const requestStartedAt = new WeakMap<Request, number>();

export function markRequestStarted(request: Request, now = performance.now()): void {
  requestStartedAt.set(request, now);
}

export function requestDurationMs(request: Request, now = performance.now()): number {
  const startedAt = requestStartedAt.get(request);
  if (startedAt === undefined) return 0;
  return Math.max(0, Math.round((now - startedAt) * 100) / 100);
}

export function requestLogContext(request: Request, now = performance.now()) {
  return {
    requestId: requestIdFor(request),
    durationMs: requestDurationMs(request, now),
  };
}

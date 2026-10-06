import { ApiError, isApiErrorResponse } from "./errors";

export async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  if (response.ok) return response.json() as Promise<T>;

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = undefined;
  }

  if (isApiErrorResponse(payload)) {
    throw new ApiError(
      response.status,
      payload.error.code,
      payload.error.requestId,
      payload.error.message,
    );
  }

  throw new ApiError(
    response.status,
    "HTTP_ERROR",
    response.headers.get("x-request-id") ?? undefined,
    `Request failed with status ${response.status}`,
  );
}

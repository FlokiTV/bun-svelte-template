import type { ApiErrorResponse } from "@vibe/contracts";
import { t } from "elysia";
import type { AppErrorCode } from "./errors";

export const ErrorResponseSchema = t.Object({
  error: t.Object({
    code: t.String(),
    message: t.String(),
    requestId: t.String(),
  }),
});

export function errorResponse(
  code: AppErrorCode,
  message: string,
  requestId: string,
): ApiErrorResponse {
  return {
    error: {
      code,
      message,
      requestId,
    },
  };
}

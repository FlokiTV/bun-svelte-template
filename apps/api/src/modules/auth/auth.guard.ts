import { jwt } from "@elysiajs/jwt";
import { Elysia } from "elysia";
import { config } from "../../config";
import { errorResponse } from "../../core/error-response";
import { ERROR_CODES } from "../../core/errors";
import { requestIdFor } from "../../core/request-id";
import { isAccessPayload } from "./auth.service";

function readBearerToken(authorization: string | undefined): string | null {
  if (!authorization) return null;
  const [scheme, token] = authorization.split(" ", 2);
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

export const authGuard = new Elysia({ name: "auth-guard" })
  .use(
    jwt({
      name: "accessJwt",
      secret: config.jwtAccessSecret,
    }),
  )
  .use(
    jwt({
      name: "refreshJwt",
      secret: config.jwtRefreshSecret,
    }),
  )
  .macro({
    auth: {
      async resolve({ headers, accessJwt, request, status }) {
        const token = readBearerToken(headers.authorization);
        if (!token) {
          return status(
            401,
            errorResponse(
              ERROR_CODES.UNAUTHORIZED,
              "Authentication required",
              requestIdFor(request),
            ),
          );
        }

        const payload = await accessJwt.verify(token);
        if (!isAccessPayload(payload)) {
          return status(
            401,
            errorResponse(
              ERROR_CODES.INVALID_TOKEN,
              "Invalid or expired access token",
              requestIdFor(request),
            ),
          );
        }

        return {
          auth: {
            userId: payload.sub,
            sessionId: payload.sid,
          },
        };
      },
    },
  });

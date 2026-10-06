import { t } from "elysia";

export const AuthCredentialsBody = t.Object({
  email: t.String({ format: "email", maxLength: 320 }),
  password: t.String({ minLength: 8, maxLength: 200 }),
});

export const AuthUserResponse = t.Object({
  id: t.String(),
  email: t.String(),
  createdAt: t.String(),
});

export const AuthSessionResponseSchema = t.Object({
  accessToken: t.String(),
  accessTokenExpiresIn: t.Number(),
  user: AuthUserResponse,
});

export const AuthMeResponseSchema = t.Object({
  user: AuthUserResponse,
});

export type AccessTokenPayload = {
  sub: string;
  sid: string;
  tokenType: "access";
  iat?: number;
  exp: number;
};

export type RefreshTokenPayload = {
  sub: string;
  sid: string;
  tokenType: "refresh";
  iat?: number;
  exp: number;
};

export type AccessTokenSignPayload = Omit<AccessTokenPayload, "iat"> & { iat: true };
export type RefreshTokenSignPayload = Omit<RefreshTokenPayload, "iat"> & { iat: true };

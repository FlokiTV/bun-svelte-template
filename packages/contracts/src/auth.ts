export type AuthUser = {
  id: string;
  email: string;
  createdAt: string;
};

export type AuthSessionResponse = {
  accessToken: string;
  accessTokenExpiresIn: number;
  user: AuthUser;
};

export type AuthMeResponse = {
  user: AuthUser;
};

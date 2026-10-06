import { t } from "elysia";

export const EchoBody = t.Object({
  message: t.String({
    minLength: 1,
    maxLength: 500,
  }),
});

export type EchoInput = {
  message: string;
};

export type EchoOutput = {
  message: string;
  receivedAt: string;
};

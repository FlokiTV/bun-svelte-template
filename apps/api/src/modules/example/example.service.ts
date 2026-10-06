import type { EchoInput, EchoOutput } from "./example.model";

export function echo(input: EchoInput): EchoOutput {
  return {
    message: input.message,
    receivedAt: new Date().toISOString(),
  };
}

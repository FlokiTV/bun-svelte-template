import { config } from "../config";

export function requestOriginIsAllowed(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  if (origin === "null") return false;

  try {
    return config.corsOrigins.includes(new URL(origin).origin);
  } catch {
    return false;
  }
}

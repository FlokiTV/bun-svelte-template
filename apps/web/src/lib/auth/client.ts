import type { AuthMeResponse, AuthSessionResponse } from "@vibe/contracts";

const apiBaseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api/v1";

function trustedApiUrl(input: string | URL): URL {
  const browserOrigin = typeof window === "undefined" ? "http://localhost" : window.location.origin;
  const base = new URL(apiBaseUrl.endsWith("/") ? apiBaseUrl : `${apiBaseUrl}/`, browserOrigin);
  const target = input instanceof URL ? input : new URL(input, base);

  if (target.origin !== base.origin) {
    throw new Error("authFetch only accepts requests to the configured API origin");
  }

  return target;
}

let accessToken: string | null = null;
let refreshPromise: Promise<AuthSessionResponse> | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function clearAccessToken(): void {
  accessToken = null;
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = body?.error?.message ?? `Request failed with ${response.status}`;
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export async function register(email: string, password: string): Promise<AuthSessionResponse> {
  const response = await fetch(`${apiBaseUrl}/auth/register`, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const session = await readJson<AuthSessionResponse>(response);
  accessToken = session.accessToken;
  return session;
}

export async function login(email: string, password: string): Promise<AuthSessionResponse> {
  const response = await fetch(`${apiBaseUrl}/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const session = await readJson<AuthSessionResponse>(response);
  accessToken = session.accessToken;
  return session;
}

export function refreshAccessToken(): Promise<AuthSessionResponse> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const response = await fetch(`${apiBaseUrl}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    const session = await readJson<AuthSessionResponse>(response);
    accessToken = session.accessToken;
    return session;
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

export async function logout(): Promise<void> {
  await fetch(`${apiBaseUrl}/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
  clearAccessToken();
}

export async function authFetch(input: string | URL, init: RequestInit = {}): Promise<Response> {
  const target = trustedApiUrl(input);
  const headers = new Headers(init.headers);
  if (accessToken) headers.set("authorization", `Bearer ${accessToken}`);

  let response = await fetch(target, {
    ...init,
    headers,
    credentials: "include",
  });

  if (response.status !== 401) return response;

  try {
    await refreshAccessToken();
  } catch {
    clearAccessToken();
    return response;
  }

  const retryHeaders = new Headers(init.headers);
  if (accessToken) retryHeaders.set("authorization", `Bearer ${accessToken}`);

  response = await fetch(target, {
    ...init,
    headers: retryHeaders,
    credentials: "include",
  });

  return response;
}

export async function getMe(): Promise<AuthMeResponse> {
  const response = await authFetch(`${apiBaseUrl}/auth/me`, {
    headers: { accept: "application/json" },
  });
  return readJson<AuthMeResponse>(response);
}

const COOKIE_LOCK = "vibe-auth-cookie";
const LOGOUT_CHANNEL = "vibe-auth-state";
const LOGOUT_STORAGE_KEY = "vibe-auth-logout";

/**
 * The Web Locks API serializes cookie-mutating auth requests across same-origin tabs.
 * Older browsers fall back to local single-flight; server-side family revocation
 * still ensures a concurrent logout cannot leave a live refresh session.
 */
export async function withAuthCookieLock<T>(operation: () => Promise<T>): Promise<T> {
  if (typeof navigator !== "undefined" && navigator.locks?.request) {
    return navigator.locks.request(COOKIE_LOCK, { mode: "exclusive" }, operation);
  }
  return operation();
}

let logoutChannel: BroadcastChannel | undefined;

export function subscribeRemoteLogout(onLogout: () => void): void {
  if (typeof window === "undefined") return;

  if (typeof window.BroadcastChannel === "function") {
    logoutChannel ??= new window.BroadcastChannel(LOGOUT_CHANNEL);
    logoutChannel.addEventListener("message", (event: MessageEvent) => {
      if (event.data?.type === "logout") onLogout();
    });
  }

  window.addEventListener("storage", (event) => {
    if (event.key === LOGOUT_STORAGE_KEY && event.newValue) onLogout();
  });
}

export function notifyRemoteLogout(): void {
  if (typeof window === "undefined") return;
  logoutChannel?.postMessage({ type: "logout" });

  // Storage events cover browsers without BroadcastChannel. No token is persisted.
  try {
    window.localStorage.setItem(LOGOUT_STORAGE_KEY, crypto.randomUUID());
  } catch {
    // Private browsing or storage restrictions must not block local logout.
  }
}

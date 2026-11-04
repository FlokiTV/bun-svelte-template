import { afterEach } from "@rstest/core";
import { cleanup } from "@testing-library/svelte";

// jsdom can inherit Node's BroadcastChannel, whose EventTarget is incompatible
// with jsdom MessageEvent. Browser BroadcastChannel behavior is covered by E2E.
Object.defineProperty(window, "BroadcastChannel", {
  configurable: true,
  value: undefined,
});

// jsdom has neither browser Web Locks nor IndexedDB. Stub the Web Locks entry
// point for unit tests; real cross-tab exclusion and the IndexedDB fallback
// are exercised with actual browser storage by Playwright.
Object.defineProperty(window.navigator, "locks", {
  configurable: true,
  value: {
    request: async (_name: string, _options: unknown, run: () => Promise<unknown>) => run(),
  },
});

afterEach(() => cleanup());

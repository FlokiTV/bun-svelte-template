import { afterEach } from "@rstest/core";
import { cleanup } from "@testing-library/svelte";

// jsdom can inherit Node's BroadcastChannel, whose EventTarget is incompatible
// with jsdom MessageEvent. Browser BroadcastChannel behavior is covered by E2E.
Object.defineProperty(window, "BroadcastChannel", {
  configurable: true,
  value: undefined,
});

afterEach(() => cleanup());

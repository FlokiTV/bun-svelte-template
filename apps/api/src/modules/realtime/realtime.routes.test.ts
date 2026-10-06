import { describe, expect, test } from "bun:test";
import { messageByteLength, RealtimeLimiter } from "./realtime.routes";

const limits = {
  maxConnections: 2,
  maxMessageBytes: 5,
  messageRateMax: 2,
  messageRateWindowMs: 1_000,
};

describe("realtime limiter", () => {
  test("enforces connection limits and releases slots on close", () => {
    const limiter = new RealtimeLimiter(limits);

    expect(limiter.open("a", 0)).toBe(true);
    expect(limiter.open("b", 0)).toBe(true);
    expect(limiter.open("c", 0)).toBe(false);

    limiter.close("a");
    expect(limiter.open("c", 1)).toBe(true);
  });

  test("enforces message size limits using bytes", () => {
    const limiter = new RealtimeLimiter(limits);
    limiter.open("a", 0);

    expect(messageByteLength("hello")).toBe(5);
    expect(messageByteLength("ééé")).toBe(6);
    expect(limiter.consumeMessage("a", "hello", 1)).toBe("ok");
    expect(limiter.consumeMessage("a", "ééé", 2)).toBe("too-large");
  });

  test("enforces message rate and resets after the window", () => {
    const limiter = new RealtimeLimiter(limits);
    limiter.open("a", 0);

    expect(limiter.consumeMessage("a", "a", 10)).toBe("ok");
    expect(limiter.consumeMessage("a", "b", 20)).toBe("ok");
    expect(limiter.consumeMessage("a", "c", 30)).toBe("rate-limited");
    expect(limiter.consumeMessage("a", "d", 1_001)).toBe("ok");
  });

  test("ignores messages for connections that were not accepted", () => {
    const limiter = new RealtimeLimiter(limits);
    expect(limiter.consumeMessage("missing", "hi", 0)).toBe("not-open");
  });
});

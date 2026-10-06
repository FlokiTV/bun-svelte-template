import { describe, expect, test } from "bun:test";
import { Elysia } from "elysia";
import { createRealtimeRoutes } from "./realtime.routes";

const WebSocketWithHeaders = WebSocket;

function createTestServer() {
  return new Elysia()
    .use(
      createRealtimeRoutes({
        maxConnections: 4,
        maxMessageBytes: 1_024,
        messageRateMax: 5,
        messageRateWindowMs: 1_000,
      }),
    )
    .listen(0);
}

function websocketUrl(app) {
  const port = app.server?.port;
  if (!port) throw new Error("WebSocket integration server did not expose a port");
  return `ws://127.0.0.1:${port}/ws`;
}

describe("realtime WebSocket integration", () => {
  test("accepts the configured Origin and echoes a typed event", async () => {
    const app = createTestServer();

    try {
      const socket = new WebSocketWithHeaders(websocketUrl(app), {
        headers: { Origin: "http://localhost:5173" },
      });

      const messages = await new Promise((resolve, reject) => {
        const received = [];
        const timer = setTimeout(
          () => reject(new Error("WebSocket integration test timed out")),
          5_000,
        );

        socket.onerror = () => {
          clearTimeout(timer);
          reject(new Error("WebSocket connection failed"));
        };
        socket.onmessage = (event) => {
          received.push(String(event.data));
          if (received.length === 1) socket.send("hello");
          if (received.length === 2) {
            clearTimeout(timer);
            resolve(received);
          }
        };
      });

      socket.close();

      const ready = JSON.parse(messages[0] ?? "{}");
      const echo = JSON.parse(messages[1] ?? "{}");
      expect(ready.type).toBe("connection.ready");
      expect(echo).toEqual({ type: "echo", payload: "hello" });
    } finally {
      await app.stop();
    }
  });

  test("rejects an untrusted browser Origin during the handshake", async () => {
    const app = createTestServer();

    try {
      const socket = new WebSocketWithHeaders(websocketUrl(app), {
        headers: { Origin: "https://evil.example" },
      });

      const result = await new Promise((resolve) => {
        const timer = setTimeout(() => resolve("rejected"), 3_000);
        socket.onopen = () => {
          clearTimeout(timer);
          resolve("open");
        };
        socket.onerror = () => {
          clearTimeout(timer);
          resolve("rejected");
        };
        socket.onclose = () => {
          clearTimeout(timer);
          resolve("rejected");
        };
      });

      try {
        socket.close();
      } catch {
        // The rejected socket may already be fully closed.
      }

      expect(result).toBe("rejected");
    } finally {
      await app.stop();
    }
  });
});

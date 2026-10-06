import { Elysia } from "elysia";
import { config } from "../../config";
import { errorResponse } from "../../core/error-response";
import { ERROR_CODES } from "../../core/errors";
import { requestOriginIsAllowed } from "../../core/origin";
import { requestIdFor } from "../../core/request-id";

export type RealtimeLimits = {
  maxConnections: number;
  maxMessageBytes: number;
  messageRateMax: number;
  messageRateWindowMs: number;
};

const defaultLimits: RealtimeLimits = {
  maxConnections: config.websocketMaxConnections,
  maxMessageBytes: config.websocketMaxMessageBytes,
  messageRateMax: config.websocketMessageRateMax,
  messageRateWindowMs: config.websocketMessageRateWindowMs,
};

type MessageBucket = {
  count: number;
  resetAt: number;
};

export type RealtimeMessageDecision = "ok" | "not-open" | "too-large" | "rate-limited";

export function messageByteLength(message: unknown): number {
  if (typeof message === "string") return new TextEncoder().encode(message).byteLength;
  if (message instanceof ArrayBuffer) return message.byteLength;
  if (ArrayBuffer.isView(message)) return message.byteLength;

  try {
    return new TextEncoder().encode(JSON.stringify(message)).byteLength;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

export class RealtimeLimiter {
  private readonly connections = new Set<string>();
  private readonly messageBuckets = new Map<string, MessageBucket>();

  constructor(private readonly limits: RealtimeLimits) {}

  open(connectionId: string, now = Date.now()): boolean {
    if (this.connections.has(connectionId)) return true;
    if (this.connections.size >= this.limits.maxConnections) return false;

    this.connections.add(connectionId);
    this.messageBuckets.set(connectionId, {
      count: 0,
      resetAt: now + this.limits.messageRateWindowMs,
    });
    return true;
  }

  consumeMessage(
    connectionId: string,
    message: unknown,
    now = Date.now(),
  ): RealtimeMessageDecision {
    if (!this.connections.has(connectionId)) return "not-open";
    if (messageByteLength(message) > this.limits.maxMessageBytes) return "too-large";

    let bucket = this.messageBuckets.get(connectionId);
    if (!bucket || bucket.resetAt <= now) {
      bucket = {
        count: 0,
        resetAt: now + this.limits.messageRateWindowMs,
      };
      this.messageBuckets.set(connectionId, bucket);
    }

    bucket.count += 1;
    return bucket.count > this.limits.messageRateMax ? "rate-limited" : "ok";
  }

  close(connectionId: string): void {
    this.connections.delete(connectionId);
    this.messageBuckets.delete(connectionId);
  }
}

export function createRealtimeRoutes(limits: RealtimeLimits = defaultLimits) {
  const limiter = new RealtimeLimiter(limits);

  return new Elysia({ name: "realtime" }).ws("/ws", {
    beforeHandle({ request, status }) {
      if (requestOriginIsAllowed(request)) return;
      return status(
        403,
        errorResponse(
          ERROR_CODES.FORBIDDEN,
          "Request origin is not allowed",
          requestIdFor(request),
        ),
      );
    },

    open(ws) {
      if (!limiter.open(ws.id)) {
        ws.close(1013, "Connection limit exceeded");
        return;
      }

      ws.send(
        JSON.stringify({
          type: "connection.ready",
          payload: {
            connectedAt: new Date().toISOString(),
          },
        }),
      );
    },

    message(ws, message) {
      const decision = limiter.consumeMessage(ws.id, message);

      if (decision === "not-open") return;
      if (decision === "too-large") {
        ws.close(1009, "Message too large");
        return;
      }
      if (decision === "rate-limited") {
        ws.close(1008, "Message rate limit exceeded");
        return;
      }

      ws.send(
        JSON.stringify({
          type: "echo",
          payload: message,
        }),
      );
    },

    close(ws) {
      limiter.close(ws.id);
    },
  });
}

export const realtimeRoutes = createRealtimeRoutes();

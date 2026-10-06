import { Elysia } from "elysia";

export const realtimeRoutes = new Elysia().ws("/ws", {
  open(ws) {
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
    ws.send(
      JSON.stringify({
        type: "echo",
        payload: message,
      }),
    );
  },
});

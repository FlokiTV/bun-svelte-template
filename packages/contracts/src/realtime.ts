export type ConnectionReadyEvent = {
  type: "connection.ready";
  payload: {
    connectedAt: string;
  };
};

export type EchoEvent = {
  type: "echo";
  payload: unknown;
};

export type ServerEvent = ConnectionReadyEvent | EchoEvent;

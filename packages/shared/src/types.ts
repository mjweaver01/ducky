export interface TunnelConfig {
  authToken: string;
  backendAddress: string;
  requestedUrl?: string;
}

export interface TunnelRegistration {
  authToken: string;
  backendAddress: string;
  requestedUrl?: string;
}

export interface TunnelAssignment {
  assignedUrl: string;
  tunnelId: string;
}

export interface HttpRequest {
  id: string;
  method: string;
  url: string;
  headers: Record<string, string | string[]>;
  body?: string;
}

export interface HttpResponse {
  id: string;
  statusCode: number;
  headers: Record<string, string | string[]>;
  body?: string;
}

/** Sent server→CLI when a browser opens a WebSocket connection to the tunnel URL */
export interface WsOpen {
  id: string;
  url: string;
  headers: Record<string, string | string[]>;
}

/** Relays a WebSocket frame in either direction (server↔CLI) */
export interface WsMessage {
  id: string;
  /** base64-encoded frame data */
  data: string;
  binary: boolean;
}

/** Notifies the other side that a WebSocket connection has closed */
export interface WsClose {
  id: string;
  code?: number;
  reason?: string;
}

export interface TunnelMessage {
  type: 'register' | 'assignment' | 'request' | 'response' | 'error' | 'ws-open' | 'ws-message' | 'ws-close';
  payload: TunnelRegistration | TunnelAssignment | HttpRequest | HttpResponse | { message: string } | WsOpen | WsMessage | WsClose;
}

export interface Config {
  authToken?: string;
  serverUrl?: string;
  isAnonymous?: boolean;
  email?: string;
}

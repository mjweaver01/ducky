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

/**
 * Sent server→CLI when a browser opens a WebSocket connection to the tunnel URL.
 * WS data frames are NOT sent as JSON — they travel as raw binary frames on the
 * control channel (text = JSON control message, binary = WS data frame).
 * Binary frame layout: [8 bytes wsId] [1 byte flags: bit0=isBinary] [payload...]
 */
export interface WsOpen {
  id: string;
  url: string;
  headers: Record<string, string | string[]>;
  /** WebSocket subprotocols requested by the browser */
  protocols?: string[];
}

/** Notifies the other side that a WebSocket connection has closed */
export interface WsClose {
  id: string;
  code?: number;
  reason?: string;
}

export interface TunnelMessage {
  type: 'register' | 'assignment' | 'request' | 'response' | 'error' | 'ws-open' | 'ws-close';
  payload: TunnelRegistration | TunnelAssignment | HttpRequest | HttpResponse | { message: string } | WsOpen | WsClose;
}

export interface Config {
  authToken?: string;
  serverUrl?: string;
  isAnonymous?: boolean;
  email?: string;
}

// API Types (shared between frontend and backend)
export interface User {
  id: string;
  email: string;
  fullName?: string;
  plan: 'free' | 'pro' | 'enterprise';
  planExpiresAt?: string;
  createdAt: string;
  lastLoginAt?: string;
  updatedAt?: string;
  isActive: boolean;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface Token {
  id: string;
  name: string;
  token: string;
  createdAt: string;
  lastUsedAt?: string;
  isActive: boolean;
  subdomain?: string;
}

export interface Tunnel {
  id: string;
  subdomain: string;
  localPort: number;
  status: string;
  connectedAt: string;
  disconnectedAt?: string;
  requestCount: number;
  bytesTransferred: number;
}

export interface TunnelStats {
  totalTunnels: number;
  activeTunnels: number;
  totalRequests: number;
  totalBytes: number;
}

export interface CustomDomain {
  id: string;
  domain: string;
  verificationToken: string;
  isVerified: boolean;
  verifiedAt?: string;
  createdAt: string;
  isActive: boolean;
}

export interface Team {
  id: string;
  name: string;
  ownerId: string;
  maxMembers: number;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
  email: string;
  fullName?: string;
}

export interface TeamInvitation {
  id: string;
  teamId: string;
  email: string;
  role: 'admin' | 'member';
  invitedBy: string;
  token: string;
  expiresAt: string;
  acceptedAt?: string;
  createdAt: string;
}

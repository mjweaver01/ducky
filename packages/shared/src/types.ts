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

export interface TunnelMessage {
  type: 'register' | 'assignment' | 'request' | 'response' | 'error';
  payload: TunnelRegistration | TunnelAssignment | HttpRequest | HttpResponse | { message: string };
}

export interface Config {
  authToken?: string;
  serverUrl?: string;
  isAnonymous?: boolean;
  email?: string;
}

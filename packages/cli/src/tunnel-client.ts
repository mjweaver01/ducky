import WebSocket from 'ws';
import * as http from 'http';
import {
  TunnelMessage,
  TunnelRegistration,
  TunnelAssignment,
  HttpRequest,
  HttpResponse,
  WsOpen,
  WsClose,
} from '@ducky.wtf/shared';

const HOP_BY_HOP_HEADERS = new Set([
  'upgrade',
  'connection',
  'host',
  'sec-websocket-key',
  'sec-websocket-version',
  'sec-websocket-extensions',
  'sec-websocket-accept',
  // Note: sec-websocket-protocol is NOT stripped — it is passed as the protocols argument
]);

/**
 * Build a compact binary frame for the control channel.
 * Layout: [8 bytes wsId (binary)] [1 byte flags: bit0=isBinary] [payload]
 */
function buildWsDataFrame(wsId: string, data: Buffer, isBinary: boolean): Buffer {
  const header = Buffer.allocUnsafe(9);
  Buffer.from(wsId, 'hex').copy(header);
  header[8] = isBinary ? 1 : 0;
  return Buffer.concat([header, data]);
}

/** Normalize tunnel URL to https for real domains; leave localhost as-is so local dev works. */
export function toPublicUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname === 'localhost' || u.hostname.endsWith('.localhost')) return url;
    if (u.protocol === 'http:') {
      u.protocol = 'https:';
      return u.toString();
    }
    return url;
  } catch {
    return url;
  }
}

export interface TunnelOptions {
  authToken: string;
  backendAddress: string;
  serverUrl: string;
  requestedUrl?: string;
}

/** Agent for backend requests so many concurrent requests don't get serialized by default connection limits */
const BACKEND_AGENT = new http.Agent({ keepAlive: true, maxSockets: 50 });
const BACKEND_AGENT_V6 = new http.Agent({ keepAlive: true, maxSockets: 50, family: 6 });

export class TunnelClient {
  private ws: WebSocket | null = null;
  private options: TunnelOptions;
  private assignment: TunnelAssignment | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  /** Cached resolved hostname for localhost backends (set after first successful connection) */
  private resolvedLocalhostHostname: string | null = null;
  /** Active proxied WebSocket connections to the local server, keyed by connection ID */
  private wsConnections: Map<string, WebSocket> = new Map();

  constructor(options: TunnelOptions) {
    this.options = options;
  }

  async connect(): Promise<TunnelAssignment> {
    return new Promise((resolve, reject) => {
      console.log(`🔌 Connecting to tunnel server at ${this.options.serverUrl}...`);

      this.ws = new WebSocket(this.options.serverUrl);

      this.ws.on('open', () => {
        console.log('✅ Connected to tunnel server');
        this.reconnectAttempts = 0;

        const registration: TunnelRegistration = {
          authToken: this.options.authToken,
          backendAddress: this.options.backendAddress,
          requestedUrl: this.options.requestedUrl
            ? toPublicUrl(this.options.requestedUrl)
            : undefined,
        };

        const message: TunnelMessage = {
          type: 'register',
          payload: registration,
        };

        this.ws!.send(JSON.stringify(message));
      });

      this.ws.on('message', (data: Buffer, isBinary: boolean) => {
        // Binary frame = raw WS data to relay to a local WebSocket
        if (isBinary) {
          const wsId = data.subarray(0, 8).toString('hex');
          const frameBinary = (data[8] & 1) === 1;
          const payload = data.subarray(9);
          const localWs = this.wsConnections.get(wsId);
          if (localWs?.readyState === WebSocket.OPEN) {
            localWs.send(payload, { binary: frameBinary });
          }
          return;
        }

        try {
          const message: TunnelMessage = JSON.parse(data.toString());

          switch (message.type) {
            case 'assignment':
              this.assignment = message.payload as TunnelAssignment;
              const publicUrl = toPublicUrl(this.assignment.assignedUrl);
              this.assignment = { ...this.assignment, assignedUrl: publicUrl };
              console.log(`\n🎉 Tunnel established!`);
              console.log(`   Public URL: ${publicUrl}`);
              console.log(`   Forwarding to: ${this.options.backendAddress}\n`);
              resolve(this.assignment);
              break;

            case 'request':
              this.handleRequest(message.payload as HttpRequest);
              break;

            case 'ws-open':
              this.handleWsOpen(message.payload as WsOpen);
              break;

            case 'ws-close':
              this.closeLocalWs(message.payload as WsClose);
              break;

            case 'error':
              const error = message.payload as { message: string };
              console.error('❌ Server error:', error.message);
              reject(new Error(error.message));
              this.ws?.close();
              break;
          }
        } catch (error) {
          console.error('Error processing message:', error);
        }
      });

      this.ws.on('close', () => {
        console.log('🔌 Tunnel connection closed');
        if (this.reconnectAttempts < this.maxReconnectAttempts && this.assignment) {
          this.attemptReconnect();
        }
      });

      this.ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      });

      setTimeout(() => {
        if (!this.assignment) {
          reject(new Error('Connection timeout'));
          this.ws?.close();
        }
      }, 10000);
    });
  }

  private attemptReconnect(): void {
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    console.log(
      `⏳ Reconnecting in ${delay / 1000}s (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
    );

    setTimeout(() => {
      this.connect().catch((error) => {
        console.error('Reconnection failed:', error);
      });
    }, delay);
  }

  private sendErrorResponse(requestId: string, statusCode: number, body: string): void {
    const response: HttpResponse = {
      id: requestId,
      statusCode,
      headers: { 'Content-Type': 'text/plain' },
      body,
    };
    const message: TunnelMessage = { type: 'response', payload: response };
    this.ws?.send(JSON.stringify(message));
  }

  private async handleRequest(request: HttpRequest): Promise<void> {
    try {
      const [host, portStr] = this.options.backendAddress.split(':');
      const port = parseInt(portStr || '80', 10);
      const isLocalhost = host === 'localhost';

      // For localhost backends, try to use a cached resolved hostname first.
      // On macOS, servers often bind to ::1 (IPv6) rather than 127.0.0.1 (IPv4)
      // because macOS defaults IPV6_V6ONLY=1. We try 127.0.0.1 first and fall back
      // to ::1 on ECONNREFUSED, then cache whichever works.
      const primaryHostname = isLocalhost ? (this.resolvedLocalhostHostname ?? '127.0.0.1') : host;
      const fallbackHostname = isLocalhost && !this.resolvedLocalhostHostname ? '::1' : null;

      const headers = { ...request.headers };
      // Rewrite Host so the local server sees the backend address it expects (many dev servers require this)
      headers.host = `${host}:${port}`;
      // Prevent compressed responses — bodies are relayed as strings and gzip would corrupt them
      delete headers['accept-encoding'];

      const forwarded = await this.tryForwardRequest(
        request,
        primaryHostname,
        port,
        headers,
        fallbackHostname
      );

      if (forwarded && isLocalhost && !this.resolvedLocalhostHostname) {
        this.resolvedLocalhostHostname = forwarded;
      }
    } catch (error) {
      console.error('Error handling request:', error);
      this.sendErrorResponse(
        request.id,
        502,
        `Bad Gateway: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Attempt to proxy the request to `hostname:port`. If the connection is
   * refused and `fallbackHostname` is provided, retries with the fallback.
   * Returns the hostname that succeeded, or null if an error response was sent.
   */
  private tryForwardRequest(
    request: HttpRequest,
    hostname: string,
    port: number,
    headers: Record<string, string | string[]>,
    fallbackHostname: string | null
  ): Promise<string | null> {
    return new Promise((resolve) => {
      const agent = hostname === '::1' ? BACKEND_AGENT_V6 : BACKEND_AGENT;

      const requestOptions: http.RequestOptions = {
        hostname,
        port,
        path: request.url,
        method: request.method,
        headers,
        agent,
      };

      const BACKEND_TIMEOUT_MS = 15000;
      let responseSent = false;
      const sendOnce = (statusCode: number, body: string) => {
        if (responseSent) return;
        responseSent = true;
        this.sendErrorResponse(request.id, statusCode, body);
        resolve(null);
      };

      const proxyReq = http.request(requestOptions, (proxyRes) => {
        let body = '';

        proxyRes.on('data', (chunk) => {
          body += chunk.toString();
        });

        proxyRes.on('end', () => {
          if (responseSent) return;
          responseSent = true;

          const responseHeaders: Record<string, string | string[]> = {};
          for (const [key, value] of Object.entries(proxyRes.headers)) {
            if (value !== undefined) {
              responseHeaders[key] = value;
            }
          }

          const response: HttpResponse = {
            id: request.id,
            statusCode: proxyRes.statusCode || 200,
            headers: responseHeaders,
            body: body || undefined,
          };

          const message: TunnelMessage = {
            type: 'response',
            payload: response,
          };

          this.ws?.send(JSON.stringify(message));
          console.log(`${request.method} ${request.url} → ${proxyRes.statusCode}`);
          resolve(hostname);
        });
      });

      proxyReq.on('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'ECONNREFUSED' && fallbackHostname) {
          // Primary address refused the connection — retry with the fallback
          proxyReq.destroy();
          this.tryForwardRequest(request, fallbackHostname, port, headers, null).then(resolve);
          return;
        }
        console.error(`Error forwarding request to ${this.options.backendAddress}:`, error.message);
        sendOnce(502, 'Bad Gateway: Could not connect to local service');
      });

      proxyReq.setTimeout(BACKEND_TIMEOUT_MS, () => {
        if (!proxyReq.destroyed) {
          proxyReq.destroy();
          sendOnce(502, 'Bad Gateway: Backend did not respond in time');
        }
      });

      if (request.body) {
        proxyReq.write(request.body);
      }

      proxyReq.end();
    });
  }

  private openLocalWs(
    payload: WsOpen,
    hostname: string,
    port: number,
    headers: Record<string, string>,
    fallbackHostname: string | null
  ): void {
    const host = hostname.includes(':') ? `[${hostname}]` : hostname;
    const wsUrl = `ws://${host}:${port}${payload.url}`;
    const localWs = new WebSocket(
      wsUrl,
      payload.protocols?.length ? payload.protocols : undefined,
      { headers }
    );

    const sendClose = (code: number, reason: string) => {
      if (!this.wsConnections.has(payload.id)) return; // already cleaned up
      this.wsConnections.delete(payload.id);
      const message: TunnelMessage = {
        type: 'ws-close',
        payload: { id: payload.id, code, reason },
      };
      this.ws?.send(JSON.stringify(message));
    };

    localWs.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'ECONNREFUSED' && fallbackHostname) {
        // Primary address refused — retry with IPv6 fallback
        localWs.terminate();
        this.wsConnections.delete(payload.id);
        this.openLocalWs(payload, fallbackHostname, port, headers, null);
        return;
      }
      console.error(`WS proxy error (${payload.url}):`, err.message);
      sendClose(1011, 'Local server error');
    });

    localWs.on('open', () => {
      // Cache the working hostname for future connections (same as HTTP side)
      if (
        hostname !== this.resolvedLocalhostHostname &&
        this.options.backendAddress.startsWith('localhost:')
      ) {
        this.resolvedLocalhostHostname = hostname;
      }
      console.log(`WS proxy: ${payload.url} connected`);
    });

    localWs.on('message', (data: WebSocket.RawData, isBinary: boolean) => {
      const buf = Buffer.isBuffer(data)
        ? data
        : data instanceof ArrayBuffer
          ? Buffer.from(data)
          : Buffer.concat(data as Buffer[]);
      // Send as raw binary frame — no JSON encoding
      this.ws?.send(buildWsDataFrame(payload.id, buf, isBinary));
    });

    localWs.on('close', (code, reason) => sendClose(code, reason.toString()));

    this.wsConnections.set(payload.id, localWs);
  }

  private handleWsOpen(payload: WsOpen): void {
    const [host, portStr] = this.options.backendAddress.split(':');
    const port = parseInt(portStr || '80', 10);
    const isLocalhost = host === 'localhost';
    const primaryHostname = isLocalhost ? (this.resolvedLocalhostHostname ?? '127.0.0.1') : host;
    const fallbackHostname = isLocalhost && !this.resolvedLocalhostHostname ? '::1' : null;

    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(payload.headers)) {
      if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
        headers[key] = Array.isArray(value) ? value.join(', ') : String(value);
      }
    }

    this.openLocalWs(payload, primaryHostname, port, headers, fallbackHostname);
  }

  private closeLocalWs(payload: WsClose): void {
    const localWs = this.wsConnections.get(payload.id);
    if (localWs) {
      this.wsConnections.delete(payload.id);
      if (localWs.readyState === WebSocket.OPEN || localWs.readyState === WebSocket.CONNECTING) {
        localWs.close(payload.code ?? 1000, payload.reason ?? '');
      }
    }
  }

  disconnect(): void {
    for (const [, ws] of this.wsConnections) {
      ws.close();
    }
    this.wsConnections.clear();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

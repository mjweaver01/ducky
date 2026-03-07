import * as crypto from 'crypto';
import { WebSocket } from 'ws';
import {
  TunnelAssignment,
  TunnelRegistration,
  TunnelMessage,
  HttpRequest,
  HttpResponse,
  WsOpen,
  WsClose,
} from '@ducky.wtf/shared';

/**
 * Build a compact binary frame for relaying a WebSocket data frame over the
 * control channel.  Layout: [8 bytes wsId (binary)] [1 byte flags: bit0=isBinary] [payload]
 */
function buildWsDataFrame(wsId: string, data: Buffer, isBinary: boolean): Buffer {
  const header = Buffer.allocUnsafe(9);
  Buffer.from(wsId, 'hex').copy(header);
  header[8] = isBinary ? 1 : 0;
  return Buffer.concat([header, data]);
}

/** Parse a binary control-channel frame back into its components. */
function parseWsDataFrame(frame: Buffer): { wsId: string; isBinary: boolean; data: Buffer } {
  const wsId = frame.subarray(0, 8).toString('hex');
  const isBinary = (frame[8] & 1) === 1;
  const data = frame.subarray(9);
  return { wsId, isBinary, data };
}

export interface TunnelStats {
  requestCount: number;
  bytesTransferred: number;
}

interface Tunnel {
  id: string;
  ws: WebSocket;
  assignedUrl: string;
  backendAddress: string;
  authToken: string;
  pendingRequests: Map<
    string,
    {
      resolve: (response: HttpResponse) => void;
      reject: (error: Error) => void;
      timeout: NodeJS.Timeout;
    }
  >;
  /** Proxied browser WebSocket connections keyed by connection ID */
  wsConnections: Map<string, WebSocket>;
  requestCount: number;
  bytesTransferred: number;
  lastRequestTime: number;
}

export class TunnelManager {
  private tunnels: Map<string, Tunnel> = new Map();
  private urlToTunnelId: Map<string, string> = new Map();
  private tokenToTunnelIds: Map<string, Set<string>> = new Map();
  private baseDomain: string;
  /** HTTP port for the proxy server; when base domain is localhost, assigned URLs include this port so the URL is usable */
  private readonly httpPort: number | undefined;
  /** Use https for assigned URLs (except localhost); HTTP requests are still accepted by the server. */
  private readonly urlScheme: string;

  private readonly MAX_TUNNELS_PER_TOKEN = parseInt(process.env.MAX_TUNNELS_PER_TOKEN || '5', 10);
  private readonly MAX_CONCURRENT_REQUESTS = parseInt(
    process.env.MAX_CONCURRENT_REQUESTS || '100',
    10
  );
  private readonly REQUEST_TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT || '30000', 10);
  private readonly RATE_LIMIT_WINDOW = 60000; // 1 minute
  private readonly RATE_LIMIT_MAX_REQUESTS = parseInt(
    process.env.RATE_LIMIT_MAX_REQUESTS || '1000',
    10
  );

  constructor(baseDomain: string = 'localhost', httpPort?: number) {
    this.baseDomain = baseDomain;
    this.httpPort = httpPort;
    // Always return https for real domains; localhost can use http so the URL works without TLS
    const protocol =
      baseDomain === 'localhost' ? (process.env.TUNNEL_PROTOCOL || 'http').toLowerCase() : 'https';
    this.urlScheme = protocol === 'https' ? 'https://' : 'http://';
  }

  registerTunnel(
    ws: WebSocket,
    registration: TunnelRegistration,
    tokenSubdomain?: string,
    onClose?: (stats: TunnelStats) => void
  ): TunnelAssignment {
    const tokenTunnels = this.tokenToTunnelIds.get(registration.authToken);
    const currentCount = tokenTunnels ? tokenTunnels.size : 0;

    if (currentCount >= this.MAX_TUNNELS_PER_TOKEN) {
      throw new Error(`Maximum ${this.MAX_TUNNELS_PER_TOKEN} tunnels per token exceeded`);
    }

    const tunnelId = crypto.randomBytes(16).toString('hex');

    let assignedUrl = registration.requestedUrl;
    if (!assignedUrl) {
      // Use token's static subdomain if available, otherwise generate random
      const subdomain = tokenSubdomain || crypto.randomBytes(4).toString('hex');
      const hostPart = `${subdomain}.${this.baseDomain}`;
      // When using localhost, include HTTP port so the printed URL actually works (browser defaults to port 80)
      assignedUrl =
        this.baseDomain === 'localhost' && this.httpPort != null
          ? `${this.urlScheme}${hostPart}:${this.httpPort}`
          : `${this.urlScheme}${hostPart}`;
    }

    if (this.urlToTunnelId.has(assignedUrl)) {
      const existingTunnelId = this.urlToTunnelId.get(assignedUrl);
      const existingTunnel = this.tunnels.get(existingTunnelId!);
      if (existingTunnel && existingTunnel.ws.readyState === WebSocket.OPEN) {
        throw new Error(`URL ${assignedUrl} is already in use`);
      }
      this.urlToTunnelId.delete(assignedUrl);
      if (existingTunnelId) {
        this.tunnels.delete(existingTunnelId);
      }
    }

    const tunnel: Tunnel = {
      id: tunnelId,
      ws,
      assignedUrl,
      backendAddress: registration.backendAddress,
      authToken: registration.authToken,
      pendingRequests: new Map(),
      wsConnections: new Map(),
      requestCount: 0,
      bytesTransferred: 0,
      lastRequestTime: Date.now(),
    };

    this.tunnels.set(tunnelId, tunnel);
    this.urlToTunnelId.set(assignedUrl, tunnelId);

    if (!this.tokenToTunnelIds.has(registration.authToken)) {
      this.tokenToTunnelIds.set(registration.authToken, new Set());
    }
    this.tokenToTunnelIds.get(registration.authToken)!.add(tunnelId);

    ws.on('close', () => {
      if (onClose) {
        onClose({ requestCount: tunnel.requestCount, bytesTransferred: tunnel.bytesTransferred });
      }
      this.removeTunnel(tunnelId);
    });

    ws.on('message', (data: Buffer, isBinary: boolean) => {
      try {
        if (isBinary) {
          // Raw WS data frame from the CLI — relay directly to the browser WebSocket
          const { wsId, isBinary: frameBinary, data: payload } = parseWsDataFrame(data);
          const browserWs = tunnel.wsConnections.get(wsId);
          if (browserWs?.readyState === WebSocket.OPEN) {
            browserWs.send(payload, { binary: frameBinary });
          }
        } else {
          const message: TunnelMessage = JSON.parse(data.toString());
          if (message.type === 'response') {
            this.handleResponse(tunnelId, message.payload as HttpResponse);
          } else if (message.type === 'ws-close') {
            this.relayWsCloseToBrowser(tunnelId, message.payload as WsClose);
          }
        }
      } catch (error) {
        console.error('Error processing tunnel message:', error);
      }
    });

    console.log(
      `Tunnel registered: ${tunnelId} (${currentCount + 1}/${this.MAX_TUNNELS_PER_TOKEN} for token)`
    );

    return {
      assignedUrl,
      tunnelId,
    };
  }

  removeTunnel(tunnelId: string): void {
    const tunnel = this.tunnels.get(tunnelId);
    if (tunnel) {
      this.urlToTunnelId.delete(tunnel.assignedUrl);

      const tokenTunnels = this.tokenToTunnelIds.get(tunnel.authToken);
      if (tokenTunnels) {
        tokenTunnels.delete(tunnelId);
        if (tokenTunnels.size === 0) {
          this.tokenToTunnelIds.delete(tunnel.authToken);
        }
      }

      for (const [, pending] of tunnel.pendingRequests) {
        clearTimeout(pending.timeout);
        pending.reject(new Error('Tunnel closed'));
      }

      for (const [, browserWs] of tunnel.wsConnections) {
        if (browserWs.readyState === WebSocket.OPEN) {
          browserWs.close(1001, 'Tunnel closed');
        }
      }

      this.tunnels.delete(tunnelId);
      console.log(`Tunnel ${tunnelId} removed (${tunnel.assignedUrl})`);
    }
  }

  registerWsConnection(tunnelId: string, wsId: string, browserWs: WebSocket): void {
    const tunnel = this.tunnels.get(tunnelId);
    if (tunnel) {
      tunnel.wsConnections.set(wsId, browserWs);
    }
  }

  sendWsOpen(
    tunnelId: string,
    wsId: string,
    url: string,
    headers: Record<string, string | string[]>,
    protocols?: string[]
  ): void {
    const tunnel = this.tunnels.get(tunnelId);
    if (!tunnel || tunnel.ws.readyState !== WebSocket.OPEN) return;
    const message: TunnelMessage = {
      type: 'ws-open',
      payload: { id: wsId, url, headers, protocols } as WsOpen,
    };
    tunnel.ws.send(JSON.stringify(message));
  }

  sendWsMessage(tunnelId: string, wsId: string, data: Buffer | string, binary: boolean): void {
    const tunnel = this.tunnels.get(tunnelId);
    if (!tunnel || tunnel.ws.readyState !== WebSocket.OPEN) return;
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as string);
    tunnel.ws.send(buildWsDataFrame(wsId, buf, binary));
  }

  sendWsClose(tunnelId: string, wsId: string, code?: number, reason?: string): void {
    const tunnel = this.tunnels.get(tunnelId);
    if (!tunnel || tunnel.ws.readyState !== WebSocket.OPEN) return;
    const message: TunnelMessage = {
      type: 'ws-close',
      payload: { id: wsId, code, reason } as WsClose,
    };
    tunnel.ws.send(JSON.stringify(message));
    tunnel.wsConnections.delete(wsId);
  }

  private relayWsCloseToBrowser(tunnelId: string, payload: WsClose): void {
    const tunnel = this.tunnels.get(tunnelId);
    if (!tunnel) return;
    const browserWs = tunnel.wsConnections.get(payload.id);
    if (browserWs) {
      tunnel.wsConnections.delete(payload.id);
      if (
        browserWs.readyState === WebSocket.OPEN ||
        browserWs.readyState === WebSocket.CONNECTING
      ) {
        browserWs.close(payload.code ?? 1000, payload.reason ?? '');
      }
    }
  }

  getTunnelByUrl(url: string): Tunnel | undefined {
    const tunnelId = this.urlToTunnelId.get(url);
    if (!tunnelId) return undefined;
    return this.tunnels.get(tunnelId);
  }

  getTunnelByHost(host: string): Tunnel | undefined {
    const fullUrl = `${this.urlScheme}${host}`;

    let tunnel = this.getTunnelByUrl(fullUrl);
    if (tunnel) return tunnel;

    const requestHostname = host.split(':')[0];

    for (const [url, tunnelId] of this.urlToTunnelId.entries()) {
      const urlObj = new URL(url);
      if (urlObj.hostname === requestHostname) {
        return this.tunnels.get(tunnelId);
      }
    }

    return undefined;
  }

  async forwardRequest(tunnelId: string, request: HttpRequest): Promise<HttpResponse> {
    const tunnel = this.tunnels.get(tunnelId);
    if (!tunnel) {
      throw new Error('Tunnel not found');
    }

    if (tunnel.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Tunnel connection is not open');
    }

    if (tunnel.pendingRequests.size >= this.MAX_CONCURRENT_REQUESTS) {
      throw new Error(`Too many concurrent requests (max: ${this.MAX_CONCURRENT_REQUESTS})`);
    }

    const now = Date.now();
    if (now - tunnel.lastRequestTime > this.RATE_LIMIT_WINDOW) {
      tunnel.requestCount = 0;
      tunnel.lastRequestTime = now;
    }

    tunnel.requestCount++;
    if (tunnel.requestCount > this.RATE_LIMIT_MAX_REQUESTS) {
      throw new Error(
        `Rate limit exceeded (max: ${this.RATE_LIMIT_MAX_REQUESTS} requests per minute)`
      );
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        tunnel.pendingRequests.delete(request.id);
        reject(new Error('Request timeout'));
      }, this.REQUEST_TIMEOUT);

      tunnel.pendingRequests.set(request.id, { resolve, reject, timeout });

      const message: TunnelMessage = {
        type: 'request',
        payload: request,
      };

      tunnel.ws.send(JSON.stringify(message), (error) => {
        if (error) {
          tunnel.pendingRequests.delete(request.id);
          clearTimeout(timeout);
          reject(error);
        }
      });
    });
  }

  private handleResponse(tunnelId: string, response: HttpResponse): void {
    const tunnel = this.tunnels.get(tunnelId);
    if (!tunnel) return;

    const pending = tunnel.pendingRequests.get(response.id);
    if (pending) {
      clearTimeout(pending.timeout);
      tunnel.pendingRequests.delete(response.id);
      if (response.body) {
        tunnel.bytesTransferred += Buffer.byteLength(response.body, 'utf8');
      }
      pending.resolve(response);
    }
  }

  getActiveTunnels(): Array<{ id: string; url: string; backendAddress: string }> {
    return Array.from(this.tunnels.values()).map((t) => ({
      id: t.id,
      url: t.assignedUrl,
      backendAddress: t.backendAddress,
    }));
  }

  getActiveTunnelStats(): Array<{ tunnelId: string } & TunnelStats> {
    return Array.from(this.tunnels.values()).map((t) => ({
      tunnelId: t.id,
      requestCount: t.requestCount,
      bytesTransferred: t.bytesTransferred,
    }));
  }

  getMetrics() {
    const tunnelCount = this.tunnels.size;
    let totalPendingRequests = 0;
    let totalRequestCount = 0;

    for (const tunnel of this.tunnels.values()) {
      totalPendingRequests += tunnel.pendingRequests.size;
      totalRequestCount += tunnel.requestCount;
    }

    return {
      activeTunnels: tunnelCount,
      totalPendingRequests,
      totalRequestCount,
      limits: {
        maxTunnelsPerToken: this.MAX_TUNNELS_PER_TOKEN,
        maxConcurrentRequests: this.MAX_CONCURRENT_REQUESTS,
        rateLimitMaxRequests: this.RATE_LIMIT_MAX_REQUESTS,
        requestTimeout: this.REQUEST_TIMEOUT,
      },
    };
  }
}

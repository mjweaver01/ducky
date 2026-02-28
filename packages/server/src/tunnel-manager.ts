import * as crypto from 'crypto';
import { WebSocket } from 'ws';
import { TunnelAssignment, TunnelRegistration, TunnelMessage, HttpRequest, HttpResponse } from '@ngrok-clone/shared';

interface Tunnel {
  id: string;
  ws: WebSocket;
  assignedUrl: string;
  backendAddress: string;
  authToken: string;
  pendingRequests: Map<string, {
    resolve: (response: HttpResponse) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>;
}

export class TunnelManager {
  private tunnels: Map<string, Tunnel> = new Map();
  private urlToTunnelId: Map<string, string> = new Map();
  private baseDomain: string;

  constructor(baseDomain: string = 'localhost') {
    this.baseDomain = baseDomain;
  }

  registerTunnel(ws: WebSocket, registration: TunnelRegistration): TunnelAssignment {
    const tunnelId = crypto.randomBytes(16).toString('hex');
    
    let assignedUrl = registration.requestedUrl;
    if (!assignedUrl) {
      const subdomain = crypto.randomBytes(4).toString('hex');
      assignedUrl = `http://${subdomain}.${this.baseDomain}`;
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
    };

    this.tunnels.set(tunnelId, tunnel);
    this.urlToTunnelId.set(assignedUrl, tunnelId);

    ws.on('close', () => {
      this.removeTunnel(tunnelId);
    });

    ws.on('message', (data: Buffer) => {
      try {
        const message: TunnelMessage = JSON.parse(data.toString());
        if (message.type === 'response') {
          this.handleResponse(tunnelId, message.payload as HttpResponse);
        }
      } catch (error) {
        console.error('Error processing tunnel message:', error);
      }
    });

    return {
      assignedUrl,
      tunnelId,
    };
  }

  removeTunnel(tunnelId: string): void {
    const tunnel = this.tunnels.get(tunnelId);
    if (tunnel) {
      this.urlToTunnelId.delete(tunnel.assignedUrl);
      
      for (const [, pending] of tunnel.pendingRequests) {
        clearTimeout(pending.timeout);
        pending.reject(new Error('Tunnel closed'));
      }
      
      this.tunnels.delete(tunnelId);
      console.log(`Tunnel ${tunnelId} removed (${tunnel.assignedUrl})`);
    }
  }

  getTunnelByUrl(url: string): Tunnel | undefined {
    const tunnelId = this.urlToTunnelId.get(url);
    if (!tunnelId) return undefined;
    return this.tunnels.get(tunnelId);
  }

  getTunnelByHost(host: string): Tunnel | undefined {
    const protocol = 'http://';
    const fullUrl = `${protocol}${host}`;
    
    let tunnel = this.getTunnelByUrl(fullUrl);
    if (tunnel) return tunnel;

    for (const [url, tunnelId] of this.urlToTunnelId.entries()) {
      const urlObj = new URL(url);
      if (urlObj.host === host) {
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

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        tunnel.pendingRequests.delete(request.id);
        reject(new Error('Request timeout'));
      }, 30000);

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
      pending.resolve(response);
    }
  }

  getActiveTunnels(): Array<{ id: string; url: string; backendAddress: string }> {
    return Array.from(this.tunnels.values()).map(t => ({
      id: t.id,
      url: t.assignedUrl,
      backendAddress: t.backendAddress,
    }));
  }
}

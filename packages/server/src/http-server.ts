import * as http from 'http';
import * as crypto from 'crypto';
import { TunnelManager } from './tunnel-manager';
import { HttpRequest } from '@ngrok-clone/shared';

export class HttpServer {
  private server: http.Server;
  private tunnelManager: TunnelManager;
  private port: number;

  constructor(tunnelManager: TunnelManager, port: number = 3000) {
    this.tunnelManager = tunnelManager;
    this.port = port;
    this.server = http.createServer(this.handleRequest.bind(this));
  }

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const host = req.headers.host || '';
    
    const tunnel = this.tunnelManager.getTunnelByHost(host);
    
    if (!tunnel) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('No tunnel found for this host');
      return;
    }

    try {
      let body = '';
      for await (const chunk of req) {
        body += chunk.toString();
      }

      const requestId = crypto.randomBytes(16).toString('hex');
      
      const headers: Record<string, string | string[]> = {};
      for (const [key, value] of Object.entries(req.headers)) {
        if (value !== undefined) {
          headers[key] = value;
        }
      }

      const httpRequest: HttpRequest = {
        id: requestId,
        method: req.method || 'GET',
        url: req.url || '/',
        headers,
        body: body || undefined,
      };

      const response = await this.tunnelManager.forwardRequest(tunnel.id, httpRequest);

      res.writeHead(response.statusCode, response.headers);
      res.end(response.body || '');

    } catch (error) {
      console.error('Error forwarding request:', error);
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end('Bad Gateway: Error communicating with tunnel');
    }
  }

  start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(this.port, () => {
        console.log(`🌐 HTTP server listening on port ${this.port}`);
        resolve();
      });
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      this.server.close(() => {
        console.log('HTTP server stopped');
        resolve();
      });
    });
  }
}

import * as http from 'http';
import * as crypto from 'crypto';
import { TunnelManager } from './tunnel-manager';
import { HttpRequest } from '@ducky.wtf/shared';
import { logger } from './logger';
import { metrics } from './metrics';

export class HttpServer {
  private server: http.Server;
  private tunnelManager: TunnelManager;
  private port: number;

  getServer(): http.Server {
    return this.server;
  }
  private readonly MAX_REQUEST_SIZE = 10 * 1024 * 1024; // 10MB

  constructor(tunnelManager: TunnelManager, port: number = 3000) {
    this.tunnelManager = tunnelManager;
    this.port = port;
    this.server = http.createServer(this.handleRequest.bind(this));
  }

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const host = req.headers.host || '';
    const clientIp = req.socket.remoteAddress || 'unknown';

    // /metrics returns JSON (no tunnel required)
    if (req.url === '/metrics' && req.method === 'GET') {
      const tunnelMetrics = this.tunnelManager.getMetrics();
      const tunnels = this.tunnelManager.getActiveTunnels();
      const body = JSON.stringify({
        ...tunnelMetrics,
        tunnels,
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(body);
      return;
    }

    const tunnel = this.tunnelManager.getTunnelByHost(host);

    if (!tunnel) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('No tunnel found for this host');
      logger.debug('No tunnel found for host', { host, clientIp });
      return;
    }

    metrics.recordRequest();
    const requestStart = Date.now();
    let success = false;

    try {
      let body = '';
      let bodySize = 0;

      for await (const chunk of req) {
        bodySize += chunk.length;

        if (bodySize > this.MAX_REQUEST_SIZE) {
          res.writeHead(413, { 'Content-Type': 'text/plain' });
          res.end('Request entity too large');

          logger.warn('Request size limit exceeded', {
            size: bodySize,
            limit: this.MAX_REQUEST_SIZE,
            clientIp,
            host,
          });
          metrics.recordError('request_too_large');
          metrics.recordRequestCompleted(Date.now() - requestStart, false);
          return;
        }

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
      const duration = Date.now() - requestStart;

      res.writeHead(response.statusCode, response.headers);
      res.end(response.body || '');

      success = true;
      metrics.recordRequestCompleted(duration, true);

      logger.debug('Request completed', {
        method: req.method,
        url: req.url,
        statusCode: response.statusCode,
        duration,
        clientIp,
      });

      console.log(`${req.method} ${req.url} → ${response.statusCode} (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - requestStart;
      const errorMsg = error instanceof Error ? error.message : String(error);

      logger.error('Error forwarding request', {
        error: errorMsg,
        method: req.method,
        url: req.url,
        duration,
        clientIp,
      });

      if (errorMsg.includes('Rate limit exceeded')) {
        res.writeHead(429, { 'Content-Type': 'text/plain' });
        res.end('Too Many Requests');
        metrics.recordRateLimitExceeded();
      } else if (errorMsg.includes('Too many concurrent requests')) {
        res.writeHead(503, { 'Content-Type': 'text/plain' });
        res.end('Service Unavailable: Too many concurrent requests');
        metrics.recordError('concurrent_limit_exceeded');
      } else {
        res.writeHead(502, { 'Content-Type': 'text/plain' });
        res.end('Bad Gateway: Error communicating with tunnel');
        metrics.recordError('gateway_error');
      }

      metrics.recordRequestCompleted(duration, false);
    }
  }

  start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(this.port, () => {
        logger.info('HTTP server started', {
          port: this.port,
          maxRequestSize: this.MAX_REQUEST_SIZE,
        });

        console.log(`🌐 HTTP server listening on port ${this.port}`);
        console.log(`   Max request size: ${this.MAX_REQUEST_SIZE / (1024 * 1024)}MB`);
        resolve();
      });
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      this.server.close(() => {
        logger.info('HTTP server stopped');
        console.log('HTTP server stopped');
        resolve();
      });
    });
  }
}

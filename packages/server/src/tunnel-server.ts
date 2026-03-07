import * as http from 'http';
import * as crypto from 'crypto';
import { WebSocketServer, WebSocket } from 'ws';
import { TunnelManager, TunnelStats } from './tunnel-manager';
import { AuthService } from './auth';
import { TunnelMessage, TunnelRegistration } from '@ducky.wtf/shared';
import { TunnelRepository } from '@ducky.wtf/database';
import { logger } from './logger';
import { metrics } from './metrics';

/** Headers that must not be forwarded when proxying WebSocket upgrades */
const HOP_BY_HOP_HEADERS = new Set([
  'upgrade',
  'connection',
  'host',
  'sec-websocket-key',
  'sec-websocket-version',
  'sec-websocket-extensions',
  'sec-websocket-accept',
  'sec-websocket-protocol',
]);

export class TunnelServer {
  private wss: WebSocketServer;
  /** Separate WSS instance used only to accept proxied browser WebSocket connections */
  private proxyWss: WebSocketServer;
  private tunnelManager: TunnelManager;
  private authService: AuthService;
  private tunnelRepo: TunnelRepository;
  private useDatabasePersistence: boolean;
  private assignmentToDbTunnelId: Map<string, string> = new Map();
  private statsInterval: NodeJS.Timeout | null = null;
  private readonly STATS_SYNC_INTERVAL_MS = 30_000;

  constructor(tunnelManager: TunnelManager, authService: AuthService, server: http.Server) {
    this.tunnelManager = tunnelManager;
    this.authService = authService;
    this.tunnelRepo = new TunnelRepository();
    this.useDatabasePersistence = !!(process.env.DATABASE_HOST || process.env.DATABASE_URL);
    this.wss = new WebSocketServer({ noServer: true });
    this.proxyWss = new WebSocketServer({ noServer: true });
    this.wss.on('connection', this.handleConnection.bind(this));

    server.on('upgrade', (req, socket, head) => {
      if (req.url === '/_tunnel') {
        this.wss.handleUpgrade(req, socket, head, (ws) => {
          this.wss.emit('connection', ws, req);
        });
      } else {
        this.handleProxyUpgrade(req, socket as any, head);
      }
    });
  }

  private handleProxyUpgrade(
    req: http.IncomingMessage,
    socket: import('stream').Duplex,
    head: Buffer
  ): void {
    const host = req.headers.host || '';
    const tunnel = this.tunnelManager.getTunnelByHost(host);

    if (!tunnel) {
      socket.destroy();
      return;
    }

    this.proxyWss.handleUpgrade(req, socket, head, (browserWs) => {
      const wsId = crypto.randomBytes(8).toString('hex');

      this.tunnelManager.registerWsConnection(tunnel.id, wsId, browserWs);

      // Forward only non-hop-by-hop headers to the local server
      const headers: Record<string, string | string[]> = {};
      for (const [key, value] of Object.entries(req.headers)) {
        if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase()) && value !== undefined) {
          headers[key] = value as string | string[];
        }
      }

      // Extract requested subprotocols so the CLI can negotiate them with the local server
      const protocolHeader = req.headers['sec-websocket-protocol'];
      const protocols = protocolHeader
        ? String(protocolHeader)
            .split(',')
            .map((p) => p.trim())
        : undefined;

      this.tunnelManager.sendWsOpen(tunnel.id, wsId, req.url || '/', headers, protocols);

      browserWs.on('message', (data, isBinary) => {
        this.tunnelManager.sendWsMessage(tunnel.id, wsId, data as Buffer, isBinary);
      });

      browserWs.on('close', (code, reason) => {
        this.tunnelManager.sendWsClose(tunnel.id, wsId, code, reason.toString());
      });

      browserWs.on('error', (err) => {
        logger.error('Proxied WebSocket error', { wsId, error: err.message });
        this.tunnelManager.sendWsClose(tunnel.id, wsId, 1011, 'Browser WebSocket error');
      });
    });
  }

  private handleConnection(ws: WebSocket): void {
    const clientIp = (ws as any)._socket?.remoteAddress || 'unknown';
    logger.debug('New tunnel connection attempt', { clientIp });

    ws.once('message', (data: Buffer, isBinary: boolean) => {
      if (isBinary) {
        // Binary frames are WS data relay frames — only valid after registration,
        // so a binary message here means something is wrong. Ignore gracefully.
        logger.warn('Received binary frame before registration', { clientIp });
        ws.close();
        return;
      }
      try {
        const message: TunnelMessage = JSON.parse(data.toString());

        if (message.type === 'register') {
          this.handleRegistration(ws, message.payload as TunnelRegistration);
        }
      } catch (error) {
        logger.error('Error processing tunnel message', {
          error: error instanceof Error ? error.message : String(error),
          clientIp,
        });
        metrics.recordError('message_parse_error');

        const errorMessage: TunnelMessage = {
          type: 'error',
          payload: { message: 'Invalid message format' },
        };
        ws.send(JSON.stringify(errorMessage));
        ws.close();
      }
    });

    ws.on('error', (error) => {
      logger.error('WebSocket error', { error: error.message, clientIp });
      metrics.recordError('websocket_error');
    });
  }

  private async handleRegistration(ws: WebSocket, registration: TunnelRegistration): Promise<void> {
    const result = await this.authService.validateToken(registration.authToken);
    if (!result.valid) {
      logger.warn('Invalid authentication token attempt', {
        backendAddress: registration.backendAddress,
      });
      metrics.recordError('auth_failed');

      const errorMessage: TunnelMessage = {
        type: 'error',
        payload: { message: 'Invalid authentication token' },
      };
      ws.send(JSON.stringify(errorMessage));
      ws.close();
      return;
    }

    try {
      let dbTunnelId: string | null = null;
      let closedBeforeDbRecord = false;
      let closeStats: TunnelStats | null = null;

      const onClose = (stats: TunnelStats) => {
        logger.info('Tunnel closed', {
          tunnelId: assignment.tunnelId,
          url: assignment.assignedUrl,
        });
        metrics.recordTunnelClosed(registration.authToken);

        if (dbTunnelId) {
          this.assignmentToDbTunnelId.delete(assignment.tunnelId);
          this.tunnelRepo.updateStatus(dbTunnelId, 'disconnected').catch((err) => {
            logger.error('Failed to update tunnel status', { error: err.message });
          });
          this.tunnelRepo
            .setStats(dbTunnelId, stats.requestCount, stats.bytesTransferred)
            .catch((err: Error) => {
              logger.error('Failed to flush tunnel stats on close', { error: err.message });
            });
        } else {
          // DB record not created yet — save state so we can update immediately after insert
          closedBeforeDbRecord = true;
          closeStats = stats;
        }
      };

      const assignment = this.tunnelManager.registerTunnel(
        ws,
        registration,
        result.subdomain,
        onClose
      );

      const responseMessage: TunnelMessage = {
        type: 'assignment',
        payload: assignment,
      };

      ws.send(JSON.stringify(responseMessage));

      logger.info('Tunnel registered', {
        tunnelId: assignment.tunnelId,
        url: assignment.assignedUrl,
        backendAddress: registration.backendAddress,
      });

      metrics.recordTunnelRegistered(registration.authToken);

      console.log(
        `✅ Tunnel registered: ${assignment.assignedUrl} -> ${registration.backendAddress}`
      );

      if (this.useDatabasePersistence && result.userId) {
        try {
          const subdomain = new URL(assignment.assignedUrl).hostname.split('.')[0];
          const localPort = parseInt(registration.backendAddress.split(':').pop() || '80', 10);
          const dbTunnel = await this.tunnelRepo.create(
            result.userId,
            subdomain,
            localPort,
            result.tokenId
          );
          dbTunnelId = dbTunnel.id;
          this.assignmentToDbTunnelId.set(assignment.tunnelId, dbTunnelId);

          // If the tunnel closed while we were awaiting the DB insert, update status now
          if (closedBeforeDbRecord) {
            this.assignmentToDbTunnelId.delete(assignment.tunnelId);
            this.tunnelRepo.updateStatus(dbTunnelId, 'disconnected').catch((err) => {
              logger.error('Failed to update tunnel status after late close', {
                error: err.message,
              });
            });
            const stats = closeStats as TunnelStats | null;
            if (stats) {
              this.tunnelRepo
                .setStats(dbTunnelId, stats.requestCount, stats.bytesTransferred)
                .catch((err: Error) => {
                  logger.error('Failed to flush tunnel stats after late close', {
                    error: err.message,
                  });
                });
            }
          }
        } catch (err: any) {
          logger.error('Failed to record tunnel in database', { error: err.message });
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Registration failed';

      logger.error('Tunnel registration failed', {
        error: errorMsg,
        backendAddress: registration.backendAddress,
      });
      metrics.recordError('registration_failed');

      const errorMessage: TunnelMessage = {
        type: 'error',
        payload: { message: errorMsg },
      };
      ws.send(JSON.stringify(errorMessage));
      ws.close();
    }
  }

  start(): void {
    if (this.useDatabasePersistence) {
      this.statsInterval = setInterval(() => {
        if (this.assignmentToDbTunnelId.size === 0) return;
        const activeStats = this.tunnelManager.getActiveTunnelStats();
        for (const stats of activeStats) {
          const dbTunnelId = this.assignmentToDbTunnelId.get(stats.tunnelId);
          if (dbTunnelId) {
            this.tunnelRepo
              .setStats(dbTunnelId, stats.requestCount, stats.bytesTransferred)
              .catch((err: Error) => {
                logger.error('Failed to sync tunnel stats', { error: err.message });
              });
          }
        }
      }, this.STATS_SYNC_INTERVAL_MS);
    }

    logger.info('Tunnel WebSocket handler attached');
    console.log('🔌 Tunnel WebSocket handler ready on /_tunnel');
  }

  stop(): Promise<void> {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
    return new Promise((resolve) => {
      this.wss.close(() => {
        logger.info('Tunnel server stopped');
        console.log('Tunnel server stopped');
        resolve();
      });
    });
  }
}

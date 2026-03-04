import * as http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { TunnelManager } from './tunnel-manager';
import { AuthService } from './auth';
import { TunnelMessage, TunnelRegistration } from '@ducky.wtf/shared';
import { TunnelRepository } from '@ducky.wtf/database';
import { logger } from './logger';
import { metrics } from './metrics';

export class TunnelServer {
  private wss: WebSocketServer;
  private tunnelManager: TunnelManager;
  private authService: AuthService;
  private tunnelRepo: TunnelRepository;
  private useDatabasePersistence: boolean;

  constructor(tunnelManager: TunnelManager, authService: AuthService, server: http.Server) {
    this.tunnelManager = tunnelManager;
    this.authService = authService;
    this.tunnelRepo = new TunnelRepository();
    this.useDatabasePersistence = !!(process.env.DATABASE_HOST || process.env.DATABASE_URL);
    this.wss = new WebSocketServer({ noServer: true });
    this.wss.on('connection', this.handleConnection.bind(this));

    server.on('upgrade', (req, socket, head) => {
      if (req.url === '/_tunnel') {
        this.wss.handleUpgrade(req, socket, head, (ws) => {
          this.wss.emit('connection', ws, req);
        });
      } else {
        socket.destroy();
      }
    });
  }

  private handleConnection(ws: WebSocket): void {
    const clientIp = (ws as any)._socket?.remoteAddress || 'unknown';
    logger.debug('New tunnel connection attempt', { clientIp });

    ws.on('message', (data: Buffer) => {
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

      const onClose = (stats: { requestCount: number; bytesTransferred: number }) => {
        logger.info('Tunnel closed', {
          tunnelId: assignment.tunnelId,
          url: assignment.assignedUrl,
        });
        metrics.recordTunnelClosed(registration.authToken);

        if (dbTunnelId) {
          this.tunnelRepo.updateStatus(dbTunnelId, 'disconnected').catch((err) => {
            logger.error('Failed to update tunnel status', { error: err.message });
          });
          if (stats.requestCount > 0) {
            this.tunnelRepo
              .incrementStats(dbTunnelId, stats.requestCount, stats.bytesTransferred)
              .catch((err) => {
                logger.error('Failed to update tunnel stats', { error: err.message });
              });
          }
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
    logger.info('Tunnel WebSocket handler attached');
    console.log('🔌 Tunnel WebSocket handler ready on /_tunnel');
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      this.wss.close(() => {
        logger.info('Tunnel server stopped');
        console.log('Tunnel server stopped');
        resolve();
      });
    });
  }
}

import { WebSocketServer, WebSocket } from 'ws';
import { TunnelManager } from './tunnel-manager';
import { AuthService } from './auth';
import { TunnelMessage, TunnelRegistration } from '@ducky/shared';
import { logger } from './logger';
import { metrics } from './metrics';

export class TunnelServer {
  private wss: WebSocketServer;
  private tunnelManager: TunnelManager;
  private authService: AuthService;
  private port: number;

  constructor(tunnelManager: TunnelManager, authService: AuthService, port: number = 4000) {
    this.tunnelManager = tunnelManager;
    this.authService = authService;
    this.port = port;
    this.wss = new WebSocketServer({ port: this.port });

    this.wss.on('connection', this.handleConnection.bind(this));
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
          clientIp
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
        backendAddress: registration.backendAddress
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
      const assignment = this.tunnelManager.registerTunnel(ws, registration);

      const responseMessage: TunnelMessage = {
        type: 'assignment',
        payload: assignment,
      };

      ws.send(JSON.stringify(responseMessage));
      
      logger.info('Tunnel registered', {
        tunnelId: assignment.tunnelId,
        url: assignment.assignedUrl,
        backendAddress: registration.backendAddress
      });
      
      metrics.recordTunnelRegistered(registration.authToken);
      
      console.log(`✅ Tunnel registered: ${assignment.assignedUrl} -> ${registration.backendAddress}`);
      
      ws.on('close', () => {
        logger.info('Tunnel closed', {
          tunnelId: assignment.tunnelId,
          url: assignment.assignedUrl
        });
        metrics.recordTunnelClosed(registration.authToken);
      });
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Registration failed';
      
      logger.error('Tunnel registration failed', {
        error: errorMsg,
        backendAddress: registration.backendAddress
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
    logger.info('Tunnel server started', { port: this.port });
    console.log(`🔌 Tunnel server listening on port ${this.port}`);
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

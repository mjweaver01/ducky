import { WebSocketServer, WebSocket } from 'ws';
import { TunnelManager } from './tunnel-manager';
import { AuthService } from './auth';
import { TunnelMessage, TunnelRegistration } from '@ngrok-clone/shared';

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
    console.log('New tunnel connection attempt');

    ws.on('message', (data: Buffer) => {
      try {
        const message: TunnelMessage = JSON.parse(data.toString());

        if (message.type === 'register') {
          this.handleRegistration(ws, message.payload as TunnelRegistration);
        }
      } catch (error) {
        console.error('Error processing message:', error);
        const errorMessage: TunnelMessage = {
          type: 'error',
          payload: { message: 'Invalid message format' },
        };
        ws.send(JSON.stringify(errorMessage));
        ws.close();
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }

  private handleRegistration(ws: WebSocket, registration: TunnelRegistration): void {
    if (!this.authService.validateToken(registration.authToken)) {
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
      
      console.log(`✅ Tunnel registered: ${assignment.assignedUrl} -> ${registration.backendAddress}`);
    } catch (error) {
      const errorMessage: TunnelMessage = {
        type: 'error',
        payload: { message: error instanceof Error ? error.message : 'Registration failed' },
      };
      ws.send(JSON.stringify(errorMessage));
      ws.close();
    }
  }

  start(): void {
    console.log(`🔌 Tunnel server listening on port ${this.port}`);
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      this.wss.close(() => {
        console.log('Tunnel server stopped');
        resolve();
      });
    });
  }
}

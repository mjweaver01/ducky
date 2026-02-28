import WebSocket from 'ws';
import * as http from 'http';
import { 
  TunnelMessage, 
  TunnelRegistration, 
  TunnelAssignment, 
  HttpRequest,
  HttpResponse 
} from '@ngrok-clone/shared';

export interface TunnelOptions {
  authToken: string;
  backendAddress: string;
  serverUrl: string;
  requestedUrl?: string;
}

export class TunnelClient {
  private ws: WebSocket | null = null;
  private options: TunnelOptions;
  private assignment: TunnelAssignment | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

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
          requestedUrl: this.options.requestedUrl,
        };

        const message: TunnelMessage = {
          type: 'register',
          payload: registration,
        };

        this.ws!.send(JSON.stringify(message));
      });

      this.ws.on('message', (data: Buffer) => {
        try {
          const message: TunnelMessage = JSON.parse(data.toString());

          switch (message.type) {
            case 'assignment':
              this.assignment = message.payload as TunnelAssignment;
              console.log(`\n🎉 Tunnel established!`);
              console.log(`   Public URL: ${this.assignment.assignedUrl}`);
              console.log(`   Forwarding to: ${this.options.backendAddress}\n`);
              resolve(this.assignment);
              break;

            case 'request':
              this.handleRequest(message.payload as HttpRequest);
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
    
    console.log(`⏳ Reconnecting in ${delay / 1000}s (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    setTimeout(() => {
      this.connect().catch((error) => {
        console.error('Reconnection failed:', error);
      });
    }, delay);
  }

  private async handleRequest(request: HttpRequest): Promise<void> {
    try {
      const [host, portStr] = this.options.backendAddress.split(':');
      const port = parseInt(portStr || '80', 10);

      const requestOptions: http.RequestOptions = {
        hostname: host,
        port,
        path: request.url,
        method: request.method,
        headers: request.headers,
      };

      const proxyReq = http.request(requestOptions, (proxyRes) => {
        let body = '';
        
        proxyRes.on('data', (chunk) => {
          body += chunk.toString();
        });

        proxyRes.on('end', () => {
          const headers: Record<string, string | string[]> = {};
          for (const [key, value] of Object.entries(proxyRes.headers)) {
            if (value !== undefined) {
              headers[key] = value;
            }
          }

          const response: HttpResponse = {
            id: request.id,
            statusCode: proxyRes.statusCode || 200,
            headers,
            body: body || undefined,
          };

          const message: TunnelMessage = {
            type: 'response',
            payload: response,
          };

          this.ws?.send(JSON.stringify(message));
          
          console.log(`${request.method} ${request.url} → ${proxyRes.statusCode}`);
        });
      });

      proxyReq.on('error', (error) => {
        console.error(`Error forwarding request to ${this.options.backendAddress}:`, error.message);
        
        const response: HttpResponse = {
          id: request.id,
          statusCode: 502,
          headers: { 'Content-Type': 'text/plain' },
          body: 'Bad Gateway: Could not connect to local service',
        };

        const message: TunnelMessage = {
          type: 'response',
          payload: response,
        };

        this.ws?.send(JSON.stringify(message));
      });

      if (request.body) {
        proxyReq.write(request.body);
      }

      proxyReq.end();
    } catch (error) {
      console.error('Error handling request:', error);
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

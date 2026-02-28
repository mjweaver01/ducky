# HTTPS and Domain Setup Guide

This guide covers setting up a real domain with SSL/TLS certificates for production HTTPS forwarding.

## Overview

For HTTPS support, you need:
1. A domain name (e.g., `tunnel.yourdomain.com`)
2. DNS configuration with wildcard support
3. SSL/TLS certificates
4. Server configuration to handle HTTPS and WSS (WebSocket Secure)

## Option 1: Using a Reverse Proxy (Recommended for Production)

The easiest and most reliable approach is using a reverse proxy like Caddy or Nginx to handle HTTPS/TLS termination.

### Using Caddy (Automatic HTTPS)

Caddy automatically obtains and renews Let's Encrypt certificates!

#### Step 1: Install Caddy

```bash
# Ubuntu/Debian
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy

# macOS
brew install caddy
```

#### Step 2: Create Caddyfile

Create `/etc/caddy/Caddyfile` (or local `Caddyfile` for testing):

```caddy
# Main domain and wildcard for all subdomains
tunnel.yourdomain.com, *.tunnel.yourdomain.com {
    # Reverse proxy HTTP traffic to your ngrok-clone server
    reverse_proxy localhost:3000

    # Enable logging
    log {
        output file /var/log/caddy/tunnel.log
        format json
    }
}

# WebSocket endpoint (port 4000)
wss.tunnel.yourdomain.com {
    reverse_proxy localhost:4000
    
    log {
        output file /var/log/caddy/tunnel-ws.log
        format json
    }
}
```

#### Step 3: Configure DNS

Add these DNS records (in your domain registrar or DNS provider):

```
A       tunnel.yourdomain.com       YOUR_SERVER_IP
A       *.tunnel.yourdomain.com     YOUR_SERVER_IP
A       wss.tunnel.yourdomain.com   YOUR_SERVER_IP
```

Or use CNAME if you have a hostname:

```
CNAME   tunnel.yourdomain.com       your-server.example.com
CNAME   *.tunnel.yourdomain.com     your-server.example.com
CNAME   wss.tunnel.yourdomain.com   your-server.example.com
```

#### Step 4: Start Services

```bash
# Start ngrok-clone server
PORT=3000 TUNNEL_PORT=4000 TUNNEL_DOMAIN=tunnel.yourdomain.com npm run start:server

# Start Caddy (as a service)
sudo systemctl start caddy

# Or run Caddy directly
caddy run --config Caddyfile
```

#### Step 5: Update CLI Configuration

```bash
# Configure CLI to use secure WebSocket
ngrok-clone config add-server-url wss://wss.tunnel.yourdomain.com
```

Caddy will automatically:
- Obtain Let's Encrypt certificates
- Renew certificates before expiry
- Handle HTTP → HTTPS redirects
- Terminate TLS/SSL

### Using Nginx

If you prefer Nginx:

#### Step 1: Install Certbot

```bash
sudo apt install certbot python3-certbot-nginx
```

#### Step 2: Create Nginx Configuration

Create `/etc/nginx/sites-available/ngrok-clone`:

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name tunnel.yourdomain.com *.tunnel.yourdomain.com;
    return 301 https://$host$request_uri;
}

# Main HTTPS server for HTTP tunnels
server {
    listen 443 ssl http2;
    server_name tunnel.yourdomain.com *.tunnel.yourdomain.com;

    # SSL certificates (will be added by certbot)
    ssl_certificate /etc/letsencrypt/live/tunnel.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tunnel.yourdomain.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Proxy to ngrok-clone HTTP server
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
    }
}

# WebSocket server (WSS)
server {
    listen 443 ssl http2;
    server_name wss.tunnel.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/tunnel.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tunnel.yourdomain.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

#### Step 3: Obtain Certificates

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/ngrok-clone /etc/nginx/sites-enabled/

# Obtain wildcard certificate
sudo certbot --nginx -d tunnel.yourdomain.com -d "*.tunnel.yourdomain.com" -d wss.tunnel.yourdomain.com

# Or manually with DNS challenge for wildcard
sudo certbot certonly --manual --preferred-challenges dns -d "*.tunnel.yourdomain.com" -d tunnel.yourdomain.com
```

#### Step 4: Auto-renewal

Certbot automatically sets up renewal. Test it:

```bash
sudo certbot renew --dry-run
```

## Option 2: Built-in Node.js HTTPS (No Reverse Proxy)

If you want the server itself to handle HTTPS:

### Step 1: Obtain Certificates Manually

```bash
# Install certbot
sudo apt install certbot

# Get certificates (DNS challenge for wildcard)
sudo certbot certonly --manual --preferred-challenges dns \
  -d "*.tunnel.yourdomain.com" \
  -d tunnel.yourdomain.com

# Certificates will be in:
# /etc/letsencrypt/live/tunnel.yourdomain.com/fullchain.pem
# /etc/letsencrypt/live/tunnel.yourdomain.com/privkey.pem
```

### Step 2: Update Server to Support HTTPS

Create a new file `packages/server/src/https-server.ts`:

```typescript
import * as https from 'https';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { TunnelManager } from './tunnel-manager';
import { HttpRequest } from '@ngrok-clone/shared';

export class HttpsServer {
  private server: https.Server;
  private tunnelManager: TunnelManager;
  private port: number;

  constructor(
    tunnelManager: TunnelManager, 
    certPath: string, 
    keyPath: string, 
    port: number = 443
  ) {
    this.tunnelManager = tunnelManager;
    this.port = port;

    const options = {
      cert: fs.readFileSync(certPath),
      key: fs.readFileSync(keyPath),
    };

    this.server = https.createServer(options, this.handleRequest.bind(this));
  }

  private async handleRequest(req: https.IncomingMessage, res: https.ServerResponse): Promise<void> {
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
        console.log(`🔒 HTTPS server listening on port ${this.port}`);
        resolve();
      });
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      this.server.close(() => {
        console.log('HTTPS server stopped');
        resolve();
      });
    });
  }
}
```

### Step 3: Update Main Server Index

Modify `packages/server/src/index.ts`:

```typescript
import { AuthService } from './auth';
import { TunnelManager } from './tunnel-manager';
import { TunnelServer } from './tunnel-server';
import { HttpServer } from './http-server';
import { HttpsServer } from './https-server';

async function main() {
  const httpPort = parseInt(process.env.PORT || '80', 10);
  const httpsPort = parseInt(process.env.HTTPS_PORT || '443', 10);
  const tunnelPort = parseInt(process.env.TUNNEL_PORT || '4000', 10);
  const tunnelDomain = process.env.TUNNEL_DOMAIN || 'localhost';
  
  const certPath = process.env.SSL_CERT_PATH;
  const keyPath = process.env.SSL_KEY_PATH;

  console.log('🚀 Starting ngrok-clone server...\n');

  const authService = new AuthService();
  const tunnelManager = new TunnelManager(tunnelDomain);
  const tunnelServer = new TunnelServer(tunnelManager, authService, tunnelPort);
  
  tunnelServer.start();

  // Start HTTP server
  const httpServer = new HttpServer(tunnelManager, httpPort);
  await httpServer.start();

  // Start HTTPS server if certificates are provided
  if (certPath && keyPath) {
    const httpsServer = new HttpsServer(tunnelManager, certPath, keyPath, httpsPort);
    await httpsServer.start();
  }

  console.log('\n📋 Configuration:');
  console.log(`   HTTP Port: ${httpPort}`);
  if (certPath && keyPath) console.log(`   HTTPS Port: ${httpsPort}`);
  console.log(`   Tunnel Port: ${tunnelPort}`);
  console.log(`   Base Domain: ${tunnelDomain}`);
  console.log('\n✨ Server ready!\n');
}

main().catch(console.error);
```

### Step 4: Run with Certificates

```bash
sudo SSL_CERT_PATH=/etc/letsencrypt/live/tunnel.yourdomain.com/fullchain.pem \
     SSL_KEY_PATH=/etc/letsencrypt/live/tunnel.yourdomain.com/privkey.pem \
     HTTPS_PORT=443 \
     PORT=80 \
     TUNNEL_PORT=4000 \
     TUNNEL_DOMAIN=tunnel.yourdomain.com \
     node packages/server/dist/index.js
```

## Option 3: Using AWS Certificate Manager (ACM) with ALB

If deploying to AWS (see terraform config):

1. **Request Certificate in ACM**:
```bash
aws acm request-certificate \
  --domain-name "*.tunnel.yourdomain.com" \
  --subject-alternative-names "tunnel.yourdomain.com" \
  --validation-method DNS \
  --region us-east-1
```

2. **Validate via DNS**: Add the CNAME records shown in ACM console

3. **Update Terraform**: Add HTTPS listener to ALB:

```hcl
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = "arn:aws:acm:region:account:certificate/certificate-id"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}

# Redirect HTTP to HTTPS
resource "aws_lb_listener" "http_redirect" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}
```

## Testing HTTPS Setup

### Test the Server

```bash
# Test HTTPS endpoint
curl https://tunnel.yourdomain.com

# Should return 404 (no tunnel) but confirms HTTPS works
```

### Test with CLI

```bash
# Configure CLI
ngrok-clone config add-server-url wss://wss.tunnel.yourdomain.com
ngrok-clone http 3000

# You should get an HTTPS URL like:
# https://abc123.tunnel.yourdomain.com
```

### Test Full Flow

```bash
# Start local server
node test-server.js

# Start tunnel
ngrok-clone http 8080

# Test the public HTTPS URL (use the URL from CLI output)
curl https://abc123.tunnel.yourdomain.com/test
```

## Troubleshooting

### Certificate Issues

```bash
# Check certificate validity
openssl s_client -connect tunnel.yourdomain.com:443 -servername tunnel.yourdomain.com

# Check certificate files
openssl x509 -in /etc/letsencrypt/live/tunnel.yourdomain.com/fullchain.pem -text -noout
```

### WebSocket Issues

Make sure your reverse proxy properly upgrades connections:
- Nginx: `proxy_set_header Upgrade $http_upgrade;`
- Caddy: Handles automatically

### Wildcard DNS Not Working

```bash
# Test DNS resolution
dig abc123.tunnel.yourdomain.com
nslookup xyz456.tunnel.yourdomain.com
```

Should all resolve to your server IP.

## Security Best Practices

1. **Use Strong TLS**: TLSv1.2+ only, strong cipher suites
2. **HSTS**: Add Strict-Transport-Security header
3. **Rate Limiting**: Use Cloudflare or similar
4. **Firewall**: Only expose ports 80, 443, 4000
5. **Auto-renewal**: Ensure certbot renewal is scheduled

## Summary

**Recommended approach**: Use Caddy as a reverse proxy. It's the easiest:

```bash
# 1. Set up DNS
# 2. Install Caddy
# 3. Create Caddyfile with your domain
# 4. Start ngrok-clone server
# 5. Start Caddy
# Done! Automatic HTTPS with auto-renewal
```

This gives you production-ready HTTPS with minimal configuration.

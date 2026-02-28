# Getting Started with ngrok-clone

This guide will help you get up and running with ngrok-clone in minutes.

## What You Just Built

You now have a fully functional ngrok clone consisting of:

1. **Server**: Receives public HTTP requests and forwards them through WebSocket tunnels
2. **CLI**: Connects to the server and forwards traffic to your local services
3. **Shared**: Common TypeScript types used by both server and CLI

## Quick Demo (5 minutes)

Let's run a complete example from scratch:

### Step 1: Install and Build

```bash
cd /Users/michaelweaver/Websites/ngrok-clone
npm install
npm run build
```

### Step 2: Start the Server

```bash
npm run start:server
```

Look for output like this:
```
⚠️  No VALID_TOKENS configured. Generated default token: abc123...
🔌 Tunnel server listening on port 4000
🌐 HTTP server listening on port 3000
✨ Server ready!
```

Copy the generated token!

### Step 3: Start a Local Service

In a new terminal, start a test web server:

```bash
# Simple Python HTTP server
python3 -m http.server 8000

# Or Node.js
npx http-server -p 8000

# Or use the included test server
node test-server.js
```

### Step 4: Create a Tunnel

In another terminal, configure and start the CLI:

```bash
# Save the token from step 2
node packages/cli/dist/index.js config add-authtoken <YOUR_TOKEN>

# Start the tunnel
node packages/cli/dist/index.js http 8000
```

You'll see:
```
🎉 Tunnel established!
   Public URL: http://abc123.localhost
   Forwarding to: localhost:8000
```

### Step 5: Test It!

In another terminal:

```bash
curl -H "Host: abc123.localhost" http://localhost:3000
```

You should see your local service's response!

## Common Use Cases

### Tunneling a Web App

```bash
# React/Vue/Angular dev server (usually port 3000)
ngrok-clone http 3000

# Next.js (usually port 3000)
ngrok-clone http 3000

# Create React App
ngrok-clone http 3000
```

### Tunneling an API Server

```bash
# Express/Fastify/Koa
ngrok-clone http 4000

# Django
ngrok-clone http 8000

# Rails
ngrok-clone http 3000
```

### Testing Webhooks Locally

```bash
# Start your webhook receiver on port 5000
ngrok-clone http 5000

# Use the public URL for webhook configuration
# e.g., http://abc123.localhost/webhooks
```

### Sharing a Local Database UI

```bash
# PostgreSQL Admin (pgAdmin)
ngrok-clone http 5050

# MongoDB Compass
ngrok-clone http 27017

# Redis Commander
ngrok-clone http 8081
```

### Tunneling to Another Machine on Your Network

```bash
# Tunnel to a Raspberry Pi on your network
ngrok-clone http 192.168.1.100:8080

# Tunnel to a Docker container
ngrok-clone http 172.17.0.2:3000
```

## Configuration

### CLI Config File

The CLI stores configuration in `~/.ngrok-clone/config.json`:

```json
{
  "authToken": "your-token-here",
  "serverUrl": "ws://localhost:4000"
}
```

You can also specify a custom config path:

```bash
ngrok-clone http 3000 --config /path/to/custom/config.json
```

### Server Environment Variables

Create a `.env` file:

```bash
PORT=3000
TUNNEL_PORT=4000
TUNNEL_DOMAIN=localhost
VALID_TOKENS=token1,token2,token3
NODE_ENV=production
```

Then run:

```bash
source .env && npm run start:server
```

## Troubleshooting

### "Invalid authentication token"

Make sure you're using the correct token. Check the server logs for the generated token, or set `VALID_TOKENS` explicitly.

### "Tunnel connection closed"

The server might have restarted. Restart your CLI to reconnect.

### "Could not connect to local service"

Verify that your local service is actually running on the specified port:

```bash
curl http://localhost:8000
```

### "No tunnel found for this host"

Make sure you're using the correct Host header:

```bash
curl -H "Host: your-tunnel-url.localhost" http://localhost:3000
```

## Next Steps

### For Production Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for:
- Docker deployment
- AWS/ECS deployment with Terraform
- DNS configuration
- HTTPS setup
- Monitoring and scaling

### Customize the Server

The server code is simple and easy to modify:
- Add custom authentication logic in `packages/server/src/auth.ts`
- Modify tunnel assignment in `packages/server/src/tunnel-manager.ts`
- Add middleware in `packages/server/src/http-server.ts`

### Extend the CLI

The CLI is also easy to customize:
- Add new commands in `packages/cli/src/index.ts`
- Implement request/response transformation in `packages/cli/src/tunnel-client.ts`
- Add support for config file tunnels like ngrok

## Performance Tips

1. **Use Connection Pooling**: The CLI reuses HTTP connections for better performance
2. **Enable Compression**: Add gzip compression at the ALB or reverse proxy level
3. **Scale Horizontally**: Run multiple server instances behind a load balancer
4. **Local Network**: When possible, use the tunnel to access services on your LAN to reduce latency

## Security Best Practices

1. **Rotate Tokens**: Change auth tokens regularly
2. **Use HTTPS**: Always use TLS in production
3. **Firewall Rules**: Restrict access to tunnel ports
4. **Monitor Usage**: Keep logs of tunnel connections
5. **Rate Limiting**: Add rate limiting at the proxy level

## Support

For issues or questions:
1. Check the logs: `npm run dev:server` for detailed output
2. Review the architecture diagram in README.md
3. Check the troubleshooting section above
4. Review the source code in `packages/`

## Examples Repository

Check out the `examples/` directory (coming soon) for:
- Webhook testing examples
- API tunneling examples  
- Multi-service tunneling
- Custom authentication
- Traffic logging and debugging

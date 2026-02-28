# ngrok-clone

A minimal ngrok-like tunneling system built with TypeScript. Expose your local services to the internet with a simple CLI, just like ngrok.

## Features

- 🚀 HTTP tunneling to local services
- 🔒 Token-based authentication
- 🌐 Static URL assignment (random or custom)
- ⚡ WebSocket-based persistent tunnels
- 🐳 Docker support for easy deployment
- ☁️ Terraform configuration for AWS deployment
- 🔧 Zero external dependencies (except `ws` for WebSocket)

## Architecture

```
Public Request → Server (HTTP) → Tunnel (WebSocket) → CLI → Local Service
                                                          ↓
Public Response ← Server ← Tunnel ← CLI ← Local Service
```

This is a monorepo containing:
- `packages/shared`: Shared TypeScript types and utilities
- `packages/server`: Tunnel server that accepts tunnels and forwards public HTTP traffic
- `packages/cli`: CLI agent that creates tunnels and proxies to local services

## Quick Start

### Install dependencies

```bash
npm install
```

### Build all packages

```bash
npm run build
```

### Run the server

```bash
npm run dev:server
```

The server will start and print a default auth token. Copy this token.

### Run the CLI

In a separate terminal:

```bash
# Add your auth token (use the token printed by the server)
npm run dev:cli -- config add-authtoken YOUR_TOKEN

# Start a tunnel to a local service on port 3000
npm run dev:cli -- http 3000
```

The CLI will print the public URL. You can now access your local service through this URL!

## CLI Usage

### Configuration Commands

```bash
# Save authentication token
ngrok-clone config add-authtoken <TOKEN>

# Configure custom server URL
ngrok-clone config add-server-url ws://tunnel.example.com:4000
```

### Tunneling Commands

```bash
# Tunnel to a local port
ngrok-clone http 3000

# Tunnel to a specific address
ngrok-clone http 192.168.1.2:8080

# Use a custom URL (if server supports it)
ngrok-clone http 3000 --url http://myapp.tunnel.example.com

# Override auth token
ngrok-clone http 3000 --authtoken <TOKEN>

# Specify config file path
ngrok-clone http 3000 --config /path/to/config.json

# Connect to custom server
ngrok-clone http 3000 --server-url ws://tunnel.example.com:4000
```

## Server Configuration

The server accepts the following environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP server port | `3000` |
| `TUNNEL_PORT` | WebSocket tunnel port | `4000` |
| `TUNNEL_DOMAIN` | Base domain for assigned URLs | `localhost` |
| `VALID_TOKENS` | Comma-separated list of valid auth tokens | Auto-generated |
| `NODE_ENV` | Node environment | `development` |

### Example

```bash
PORT=80 \
TUNNEL_PORT=4000 \
TUNNEL_DOMAIN=tunnel.example.com \
VALID_TOKENS=token1,token2,token3 \
npm run start:server
```

## Development

### Project Structure

```
ngrok-clone/
├── packages/
│   ├── shared/          # Shared types
│   │   └── src/
│   │       ├── types.ts # Interface definitions
│   │       └── index.ts
│   ├── server/          # Tunnel server
│   │   └── src/
│   │       ├── auth.ts          # Token validation
│   │       ├── tunnel-manager.ts # Tunnel registry
│   │       ├── tunnel-server.ts  # WebSocket server
│   │       ├── http-server.ts    # HTTP forwarding
│   │       └── index.ts
│   └── cli/             # CLI agent
│       └── src/
│           ├── config.ts         # Config management
│           ├── tunnel-client.ts  # WebSocket client
│           ├── args-parser.ts    # Argument parsing
│           └── index.ts
├── terraform/           # AWS deployment
├── Dockerfile          # Server container
├── docker-compose.yml  # Local Docker setup
└── test-server.js      # Test HTTP server

```

### Testing

A test server is included for integration testing:

```bash
# Terminal 1: Start test server
node test-server.js

# Terminal 2: Start tunnel server
npm run dev:server

# Terminal 3: Start CLI tunnel
npm run dev:cli -- http 8080

# Terminal 4: Test the tunnel
curl -H "Host: <assigned-url>" http://localhost:3000/test
```

## Deployment

### Docker Compose (Quickest)

```bash
# Create .env file
cp .env.example .env

# Edit .env with your configuration
nano .env

# Start the server
docker-compose up -d

# View logs
docker-compose logs -f
```

### AWS (Production)

Full AWS deployment with ECS Fargate, ALB, and VPC:

```bash
cd terraform

# Configure your variables
cp terraform.tfvars.example terraform.tfvars
nano terraform.tfvars

# Deploy
terraform init
terraform apply
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

## How It Works

1. **Server** listens on two ports:
   - HTTP port (3000): Receives public requests and forwards them to tunnels
   - Tunnel port (4000): Accepts WebSocket connections from CLI agents

2. **CLI** connects to the server via WebSocket and:
   - Authenticates with a token
   - Registers a tunnel with a backend address
   - Receives an assigned public URL
   - Forwards requests from the tunnel to the local service

3. **Flow**:
   - Public client makes HTTP request to assigned URL
   - Server receives request, finds the tunnel by host
   - Server forwards request over WebSocket to CLI
   - CLI proxies request to local service
   - Response flows back: local service → CLI → server → public client

## Limitations

- Only HTTP tunneling is supported (no TCP/TLS tunneling)
- No traffic inspection UI (unlike ngrok)
- No traffic replay functionality
- Single-server architecture (no distributed setup)
- In-memory tunnel registry (tunnels lost on server restart)

## Future Enhancements

- [ ] TCP and TLS tunnel support
- [ ] Traffic inspection web UI
- [ ] Traffic replay and debugging
- [ ] Persistent tunnel registry (Redis/PostgreSQL)
- [ ] Custom domain support with verification
- [ ] Rate limiting and quotas
- [ ] Multiple server regions
- [ ] CLI config file with named tunnels
- [ ] Auto-reconnect with backoff
- [ ] Metrics and monitoring endpoints

## Dependencies

The project uses minimal dependencies:
- `ws`: WebSocket library (only external app dependency)
- `typescript`: Development dependency
- `tsx`: Development dependency for running TypeScript
- `@types/node`: TypeScript definitions
- `@types/ws`: TypeScript definitions for ws

Everything else uses Node.js built-in modules (`http`, `https`, `net`, `crypto`, etc.).

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Acknowledgments

Inspired by [ngrok](https://ngrok.com), the original tunneling service.

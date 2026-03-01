<img src="packages/web-frontend/public/duck.svg" alt="duck" style="max-width: 200px;">

# ducky


Production-ready tunneling system built with TypeScript. Expose local services to the internet with HTTPS.

## Features

- 🔒 HTTPS with automatic certificates (AWS ACM)
- 🚀 HTTP tunneling to local services
- 🔐 Token authentication with AWS Secrets Manager
- ⚡ WebSocket persistent tunnels
- 🛡️ Rate limiting and DoS protection
- 📊 Structured logging and metrics
- ☁️ AWS deployment with Terraform
- 🔧 Minimal dependencies (only `ws`)

## Quick Start

### Local Development

```bash
npm install && npm run build

# Start server (generates token)
npm run dev:server

# Configure CLI (new terminal)
npm run dev:cli -- config add-authtoken <TOKEN>

# Start tunnel (use port 3001 when using npm run dev; default 4000 for standalone server)
npm run dev:cli -- http 3000 --server-url ws://localhost:3001
```

### Production (AWS)

See **[AWS_DEPLOYMENT.md](/docs/AWS_DEPLOYMENT.md)** for complete deployment guide to `ducky.wtf`.

```bash
# Quick deploy
docker build -t ducky .
docker push <ecr-repo>/ducky:latest

cd terraform
terraform apply

# Configure DNS and wait for ACM validation
# Done! HTTPS URLs automatically assigned
```

## CLI Usage

```bash
# Configure
ducky config add-authtoken <TOKEN>
ducky config add-server-url wss://ducky.wtf:4000

# Tunnel local port
ducky http 3000

# Tunnel to specific address
ducky http 192.168.1.2:8080

# Request specific URL
ducky http 3000 --url https://myapp.ducky.wtf
```

## Architecture

```
Public (HTTPS) → ALB → ECS → Server → WebSocket Tunnel → CLI → Local Service
                          ↓
                   Secrets Manager (tokens)
```

**Server** (ECS Fargate):
- HTTP/HTTPS forwarding via ALB
- WebSocket tunnel management
- Token validation from Secrets Manager
- Rate limiting and metrics

**CLI** (Local):
- Authenticates with server
- Opens persistent tunnel
- Proxies requests to local service

## Configuration

### Server Environment Variables

```bash
# Core
PORT=3000
TUNNEL_PORT=4000
TUNNEL_DOMAIN=ducky.wtf

# Authentication (choose one)
VALID_TOKENS=token1,token2           # Simple (dev/testing)
AWS_SECRET_NAME=ducky/tokens         # Production (recommended)

# Security Limits
MAX_TUNNELS_PER_TOKEN=5
MAX_CONCURRENT_REQUESTS=100
RATE_LIMIT_MAX_REQUESTS=1000

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/ducky/server.log
```

### Security Features

- **Request size limit**: 10MB (prevents DoS)
- **Rate limiting**: 1000 req/min per tunnel
- **Tunnel limits**: 5 tunnels per token
- **Concurrent limits**: 100 requests per tunnel
- **Request timeout**: 30s (configurable)

All limits configurable via environment variables.

## Deployment

### Docker

```bash
docker build -t ducky .
docker run -p 3000:3000 -p 4000:4000 \
  -e TUNNEL_DOMAIN=localhost \
  -e VALID_TOKENS=token1,token2 \
  ducky
```

### AWS (Recommended)

Complete infrastructure with:
- ECS Fargate + ALB
- ACM certificates (auto-renewal)
- Secrets Manager (token rotation)
- CloudWatch (logs + metrics)
- Multi-AZ deployment

See **[AWS_DEPLOYMENT.md](/docs/AWS_DEPLOYMENT.md)** for step-by-step guide.

**Cost**: ~$41/month (minimal setup)

## Observability

### Structured Logging

JSON logs with metadata:
```json
{
  "timestamp": "2026-02-28T20:00:00.000Z",
  "level": "info",
  "message": "Tunnel registered",
  "metadata": {
    "tunnelId": "abc123",
    "url": "https://xyz.tunnel.example.com"
  }
}
```

### Metrics (Auto-logged every 5 min)

```
📊 Metrics Summary
Tunnels:      Active: 5, Total: 12
Requests:     Total: 1543, Succeeded: 1520, Failed: 23
Performance:  Avg: 45ms, P95: 120ms, P99: 250ms
Errors:       Total: 23
```

## Monitoring

```bash
# Tail logs (AWS)
aws logs tail /ecs/ducky --follow

# View metrics
aws logs tail /ecs/ducky --follow | grep "Metrics Summary"

# Check health
curl https://tunnel.yourdomain.com  # Returns 404 (expected)
```

## Scaling

**Vertical** (increase task size):
```hcl
task_cpu    = "512"   # 0.5 vCPU
task_memory = "1024"  # 1 GB
```

**Horizontal** (more tasks):
```hcl
desired_count = 3
```

**Auto-scaling** (CPU-based):
```hcl
target_value = 70.0  # Scale when CPU > 70%
```

## Security

### Token Management

**Development**:
```bash
VALID_TOKENS=token1,token2
```

**Production** (AWS Secrets Manager):
```bash
# Tokens stored encrypted
# Auto-refresh every 5 minutes
# Rotate without redeployment
aws secretsmanager update-secret \
  --secret-id ducky/valid-tokens \
  --secret-string '{"tokens":["new-token"]}'
```

### Best Practices

- ✅ Use HTTPS in production (ALB handles TLS)
- ✅ Rotate tokens regularly
- ✅ Monitor CloudWatch metrics
- ✅ Set up budget alerts
- ✅ Configure auto-scaling
- ✅ Use Secrets Manager for tokens
- ✅ Enable CloudWatch Logs

## Project Structure

```
ducky/
├── packages/
│   ├── shared/     # TypeScript types
│   ├── server/     # Tunnel server
│   │   ├── auth.ts           # Token validation + Secrets Manager
│   │   ├── tunnel-manager.ts # Tunnel registry + rate limiting
│   │   ├── http-server.ts    # HTTP forwarding + request limits
│   │   ├── logger.ts         # Structured logging
│   │   └── metrics.ts        # Metrics collection
│   └── cli/        # CLI agent
├── terraform/      # AWS infrastructure
├── Dockerfile      # Server container
└── docker-compose.yml
```

## Limits

| Feature | Limit | Configurable |
|---------|-------|--------------|
| Request size | 10MB | No |
| Rate limit | 1000/min | `RATE_LIMIT_MAX_REQUESTS` |
| Tunnels per token | 5 | `MAX_TUNNELS_PER_TOKEN` |
| Concurrent requests | 100 | `MAX_CONCURRENT_REQUESTS` |
| Request timeout | 30s | `REQUEST_TIMEOUT` |

## Dependencies

**Runtime**: `ws` (WebSocket)  
**Build**: TypeScript, tsx  
**Infrastructure**: Docker, Terraform, AWS SDK

## Cost Estimate

**Minimal AWS setup**: ~$41/month
- ALB: $16
- ECS Fargate (1 task): $11
- CloudWatch Logs: $5
- Secrets Manager: $0.40
- Data transfer (100GB): $9

Use Fargate Spot for 70% savings.

## Troubleshooting

**CLI can't connect**:
```bash
# Check WebSocket port
wscat -c wss://tunnel.yourdomain.com:4000
```

**Certificate issues**:
```bash
# Check ACM status
aws acm describe-certificate --certificate-arn <arn>
```

**High latency**:
```bash
# Check metrics
aws logs tail /ecs/ducky | grep "Performance"
```

## Testing

### Local Development Testing

```bash
# Automated E2E test (local Docker Compose)
./test-e2e.sh

# Or manual testing
npm run dev:server  # Terminal 1
npm run dev:cli     # Terminal 2
```

### AWS Infrastructure Testing

```bash
# Test complete AWS deployment from local machine
./test-aws-local.sh staging

# Cleanup when done
cd terraform
terraform destroy -var-file=environments/staging.tfvars -auto-approve
```

**Testing Documentation:**
- [TESTING.md](/docs/TESTING.md) - Comprehensive testing guide (local, AWS, staging, production)
- [AWS_LOCAL_TESTING.md](/docs/AWS_LOCAL_TESTING.md) - Detailed AWS infrastructure testing from local machine

## Contributing

This is a production implementation. For issues or improvements, open a PR.

## License

MIT

---

Built with security, observability, and scalability from day one.

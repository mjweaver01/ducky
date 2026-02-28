# ngrok-clone

A production-ready ngrok-like tunneling system built with TypeScript. Expose your local services to the internet with HTTPS, just like ngrok.

## Features

- 🚀 HTTP/HTTPS tunneling to local services
- 🔒 Token-based authentication
- 🌐 Static URL assignment with wildcard DNS support
- ⚡ WebSocket-based persistent tunnels
- 🐳 Docker support for easy deployment
- ☁️ AWS deployment with Terraform (ECS Fargate + ALB + ACM)
- 🔐 Automatic HTTPS with AWS Certificate Manager
- 📊 CloudWatch monitoring and logging
- 🔧 Zero external dependencies (except `ws` for WebSocket)

## Architecture

```
Public Request (HTTPS) → Route 53 → ALB (TLS termination) → ECS Fargate → Tunnel Server
                                                                              ↓
                                                            WebSocket Tunnel → CLI → Local Service
```

### How It Works

1. **Server** runs on AWS ECS Fargate behind an Application Load Balancer
2. **ALB** handles HTTPS termination using ACM certificates (auto-renewing)
3. **CLI** connects to server via secure WebSocket (WSS)
4. **Requests** flow: Public HTTPS → ALB → Server → Tunnel → CLI → Your local app
5. **Responses** flow back through the same path

This is a monorepo containing:
- `packages/shared`: Shared TypeScript types and utilities
- `packages/server`: Tunnel server that accepts tunnels and forwards public HTTPS traffic
- `packages/cli`: CLI agent that creates tunnels and proxies to local services

## Quick Start (Local Development)

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

## Production Deployment on AWS

See **[AWS_DEPLOYMENT.md](AWS_DEPLOYMENT.md)** for complete production deployment guide including:

- ✅ HTTPS with automatic SSL/TLS certificates (ACM)
- ✅ AWS infrastructure setup with Terraform
- ✅ Docker containerization and ECR
- ✅ High availability across multiple AZs
- ✅ Auto-scaling and monitoring
- ✅ Security best practices
- ✅ Cost optimization strategies

### Quick AWS Setup

```bash
# 1. Build and push Docker image to ECR
docker build -t ngrok-clone:latest .
docker push <your-ecr-repo>/ngrok-clone:latest

# 2. Configure Terraform with your domain
cd terraform
cp terraform.tfvars.example terraform.tfvars
nano terraform.tfvars  # Set your domain: tunnel.yourdomain.com

# 3. Deploy infrastructure
terraform init
terraform apply

# 4. Create DNS records (from terraform output)
# Point tunnel.yourdomain.com and *.tunnel.yourdomain.com to ALB

# 5. Wait for ACM certificate validation (~5-30 min)

# 6. Use the CLI with HTTPS
ngrok-clone config add-server-url wss://tunnel.yourdomain.com:4000
ngrok-clone http 3000
# Get HTTPS URL: https://abc123.tunnel.yourdomain.com
```

Full guide: **[AWS_DEPLOYMENT.md](AWS_DEPLOYMENT.md)**

## CLI Usage

### Configuration Commands

```bash
# Save authentication token
ngrok-clone config add-authtoken <TOKEN>

# Configure custom server URL
ngrok-clone config add-server-url wss://tunnel.yourdomain.com:4000
```

### Tunneling Commands

```bash
# Tunnel to a local port
ngrok-clone http 3000

# Tunnel to a specific address
ngrok-clone http 192.168.1.2:8080

# Use a custom URL (if server supports it)
ngrok-clone http 3000 --url https://myapp.tunnel.yourdomain.com

# Override auth token
ngrok-clone http 3000 --authtoken <TOKEN>

# Specify config file path
ngrok-clone http 3000 --config /path/to/config.json

# Connect to custom server
ngrok-clone http 3000 --server-url wss://tunnel.example.com:4000
```

## Server Configuration

The server accepts the following environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP server port | `3000` |
| `HTTPS_PORT` | HTTPS server port (if using built-in TLS) | `443` |
| `TUNNEL_PORT` | WebSocket tunnel port | `4000` |
| `TUNNEL_DOMAIN` | Base domain for assigned URLs | `localhost` |
| `VALID_TOKENS` | Comma-separated list of valid auth tokens | Auto-generated |
| `SSL_CERT_PATH` | Path to SSL certificate (optional) | - |
| `SSL_KEY_PATH` | Path to SSL private key (optional) | - |
| `NODE_ENV` | Node environment | `development` |

### Example

```bash
PORT=80 \
HTTPS_PORT=443 \
TUNNEL_PORT=4000 \
TUNNEL_DOMAIN=tunnel.yourdomain.com \
VALID_TOKENS=token1,token2,token3 \
SSL_CERT_PATH=/etc/ssl/cert.pem \
SSL_KEY_PATH=/etc/ssl/key.pem \
npm run start:server
```

## HTTPS Setup

### Option 1: AWS with ACM (Recommended)

Deploy to AWS with automatic HTTPS using ACM. See **[AWS_DEPLOYMENT.md](AWS_DEPLOYMENT.md)**.

Benefits:
- ✅ Automatic certificate issuance and renewal
- ✅ No certificate management needed
- ✅ Production-grade security
- ✅ Load balancing and auto-scaling
- ✅ ~$20-30/month for basic setup

### Option 2: Reverse Proxy (Caddy/Nginx)

Use a reverse proxy for automatic HTTPS. See **[HTTPS_SETUP.md](HTTPS_SETUP.md)** for:
- Caddy setup (automatic Let's Encrypt)
- Nginx + Certbot setup
- Certificate renewal automation

### Option 3: Built-in HTTPS

The server supports built-in HTTPS using Node.js `https` module. Provide certificate paths:

```bash
SSL_CERT_PATH=/etc/letsencrypt/live/yourdomain.com/fullchain.pem \
SSL_KEY_PATH=/etc/letsencrypt/live/yourdomain.com/privkey.pem \
npm run start:server
```

## Project Structure

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
│   │       ├── https-server.ts   # HTTPS forwarding
│   │       └── index.ts
│   └── cli/             # CLI agent
│       └── src/
│           ├── config.ts         # Config management
│           ├── tunnel-client.ts  # WebSocket client
│           ├── args-parser.ts    # Argument parsing
│           └── index.ts
├── terraform/           # AWS deployment (ECS, ALB, ACM)
│   ├── main.tf         # Infrastructure definitions
│   ├── variables.tf    # Input variables
│   ├── outputs.tf      # Output values (URLs, DNS records)
│   └── README.md       # Terraform guide
├── Dockerfile          # Server container image
├── docker-compose.yml  # Local Docker setup
├── AWS_DEPLOYMENT.md   # Complete AWS deployment guide
├── HTTPS_SETUP.md      # HTTPS setup options
└── test-server.js      # Test HTTP server

```

## Security Best Practices

### 1. Authentication Tokens

Generate cryptographically secure tokens:

```bash
openssl rand -hex 32
```

Never commit tokens to version control. Use environment variables or AWS Secrets Manager.

### 2. HTTPS Only in Production

Always use HTTPS in production:
- AWS: Automatic via ACM (recommended)
- Self-hosted: Use Caddy or Nginx with Let's Encrypt
- The server supports HTTP for local development only

### 3. Network Security

AWS deployment includes:
- Security groups with minimal required access
- Private subnets for ECS tasks (optional)
- VPC with proper network isolation
- ALB in public subnets only

### 4. Monitoring and Logging

- CloudWatch Logs for all container output
- CloudWatch Metrics for resource utilization
- ALB access logs (optional, additional cost)
- Custom metrics for tunnel activity

### 5. Regular Updates

```bash
# Update dependencies
npm update

# Rebuild and redeploy
docker build -t ngrok-clone:latest .
docker push <ecr-repo>/ngrok-clone:latest
aws ecs update-service --force-new-deployment ...
```

## Monitoring

### CloudWatch Metrics (AWS)

- **ALB**: Request count, response times, 4xx/5xx errors
- **ECS**: CPU utilization, memory utilization, task count
- **Custom**: Active tunnels, requests per tunnel

### Logs

```bash
# Local development
npm run dev:server  # Console output

# AWS deployment
aws logs tail /ecs/ngrok-clone --follow

# Docker
docker-compose logs -f
```

## Scaling

### AWS Auto-Scaling

Configure in Terraform:

```hcl
resource "aws_appautoscaling_target" "ecs" {
  max_capacity       = 10
  min_capacity       = 1
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.app.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "ecs_cpu" {
  name               = "cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = 70.0
  }
}
```

### Manual Scaling

```bash
# AWS
terraform apply -var="desired_count=3"

# Docker Compose
docker-compose up -d --scale ngrok-clone-server=3
```

## Cost Optimization

### AWS Costs (Monthly Estimates)

| Resource | Cost |
|----------|------|
| ALB | ~$16 |
| ECS Fargate (1 task) | ~$11 |
| Data Transfer (1TB) | ~$90 |
| CloudWatch Logs | ~$5 |
| ACM Certificate | **Free** |
| **Total (minimal)** | **~$32/month** |

**Savings Tips**:
- Use Fargate Spot (up to 70% off)
- Reduce log retention
- Optimize task size
- Use CloudFront for global distribution

See **[AWS_DEPLOYMENT.md](AWS_DEPLOYMENT.md#cost-optimization)** for details.

## Troubleshooting

### Certificate Issues

```bash
# Check ACM certificate status
aws acm describe-certificate --certificate-arn <arn>

# Verify DNS records
dig tunnel.yourdomain.com
nslookup _validation.tunnel.yourdomain.com
```

### Tunnel Connection Issues

```bash
# Check server logs
aws logs tail /ecs/ngrok-clone --follow

# Test WebSocket connection
wscat -c wss://tunnel.yourdomain.com:4000

# Verify security groups allow port 4000
```

### DNS Not Resolving

```bash
# Test DNS propagation
dig abc123.tunnel.yourdomain.com
host *.tunnel.yourdomain.com

# Check Route 53 records (if using)
aws route53 list-resource-record-sets --hosted-zone-id <id>
```

See **[AWS_DEPLOYMENT.md](AWS_DEPLOYMENT.md#troubleshooting)** for more.

## Documentation

- **[AWS_DEPLOYMENT.md](AWS_DEPLOYMENT.md)**: Complete AWS deployment with HTTPS
- **[HTTPS_SETUP.md](HTTPS_SETUP.md)**: HTTPS setup options (Caddy, Nginx, built-in)
- **[DEPLOYMENT.md](DEPLOYMENT.md)**: General deployment guide (Docker, other clouds)
- **[GETTING_STARTED.md](GETTING_STARTED.md)**: Quick start and usage examples
- **[terraform/README.md](terraform/README.md)**: Terraform-specific documentation

## Limitations

- Only HTTP/HTTPS tunneling (no TCP/TLS tunneling yet)
- No traffic inspection UI (unlike ngrok dashboard)
- No traffic replay functionality
- Single-region deployment (multi-region requires additional setup)
- In-memory tunnel registry (tunnels lost on server restart)

## Roadmap

- [ ] TCP and TLS tunnel support
- [ ] Traffic inspection web UI
- [ ] Traffic replay and debugging
- [ ] Persistent tunnel registry (Redis/PostgreSQL)
- [ ] Custom domain verification
- [ ] Rate limiting and quotas per user
- [ ] Multi-region deployment
- [ ] CLI config file with named tunnels
- [ ] Metrics and monitoring dashboard
- [ ] User management API

## Dependencies

Minimal dependencies:
- `ws`: WebSocket library (only external app dependency)
- `typescript`: Development dependency
- `tsx`: Development dependency for running TypeScript
- `@types/node`: TypeScript definitions
- `@types/ws`: TypeScript definitions for ws

Everything else uses Node.js built-in modules (`http`, `https`, `net`, `crypto`, `fs`).

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Acknowledgments

Inspired by [ngrok](https://ngrok.com), the original tunneling service.

---

## Quick Links

- 🚀 [AWS Deployment Guide](AWS_DEPLOYMENT.md) - Deploy to production with HTTPS
- 🔐 [HTTPS Setup](HTTPS_SETUP.md) - Configure SSL/TLS certificates
- 📖 [Getting Started](GETTING_STARTED.md) - Quick start guide with examples
- 🏗️ [Terraform Docs](terraform/README.md) - Infrastructure as code
- 🐳 [Docker Deployment](DEPLOYMENT.md) - Alternative deployment methods

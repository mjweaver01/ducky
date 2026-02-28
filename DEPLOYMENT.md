# Deployment Guide

This guide covers deploying the ngrok-clone server to production.

## Local Development

### Running with npm

1. Install dependencies:
```bash
npm install
npm run build
```

2. Start the server:
```bash
npm run start:server
```

3. In another terminal, configure and start the CLI:
```bash
# Add auth token (use the token printed by the server)
npm run start:cli -- config add-authtoken <TOKEN>

# Start tunnel
npm run start:cli -- http 3000
```

### Running with Docker Compose

1. Create a `.env` file:
```bash
cp .env.example .env
```

2. Edit `.env` and set your configuration:
```env
TUNNEL_DOMAIN=tunnel.example.com
VALID_TOKENS=your-secret-token
```

3. Build and run:
```bash
docker-compose up -d
```

4. View logs:
```bash
docker-compose logs -f
```

## Production Deployment on AWS

### Prerequisites

- AWS account with appropriate permissions
- AWS CLI configured
- Terraform installed (>= 1.0)
- Docker installed
- Domain name (optional but recommended)

### Step 1: Build and Push Docker Image

1. Create an ECR repository:
```bash
aws ecr create-repository --repository-name ngrok-clone --region us-east-1
```

2. Build the Docker image:
```bash
docker build -t ngrok-clone:latest .
```

3. Tag and push to ECR:
```bash
# Get your AWS account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=us-east-1

# Login to ECR
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Tag the image
docker tag ngrok-clone:latest \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/ngrok-clone:latest

# Push to ECR
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/ngrok-clone:latest
```

### Step 2: Generate Auth Tokens

Generate secure tokens for authentication:

```bash
# Generate a random token
openssl rand -hex 32
```

Save these tokens securely. You'll need them for Terraform and CLI configuration.

### Step 3: Configure Terraform

1. Navigate to the terraform directory:
```bash
cd terraform
```

2. Copy and edit the tfvars file:
```bash
cp terraform.tfvars.example terraform.tfvars
```

3. Update `terraform.tfvars`:
```hcl
aws_region    = "us-east-1"
project_name  = "ngrok-clone"
tunnel_domain = "tunnel.yourdomain.com"
valid_tokens  = "token1,token2,token3"
docker_image  = "123456789012.dkr.ecr.us-east-1.amazonaws.com/ngrok-clone:latest"
```

### Step 4: Deploy Infrastructure

```bash
terraform init
terraform plan
terraform apply
```

Take note of the outputs, especially `alb_dns_name`.

### Step 5: Configure DNS

1. Create a wildcard DNS record pointing to the ALB:
```
*.tunnel.yourdomain.com CNAME <alb_dns_name>
tunnel.yourdomain.com   CNAME <alb_dns_name>
```

2. Wait for DNS propagation (can take up to 48 hours, usually much faster).

### Step 6: Configure HTTPS (Optional but Recommended)

1. Request an ACM certificate for `*.tunnel.yourdomain.com`:
```bash
aws acm request-certificate \
  --domain-name "*.tunnel.yourdomain.com" \
  --subject-alternative-names "tunnel.yourdomain.com" \
  --validation-method DNS \
  --region us-east-1
```

2. Follow the validation instructions in the AWS console.

3. Update the Terraform configuration to add an HTTPS listener (see `main.tf` comments).

### Step 7: Test the Deployment

1. Configure the CLI to use your server:
```bash
ngrok-clone config add-authtoken <your-token>
ngrok-clone config add-server-url wss://tunnel.yourdomain.com:4000
```

2. Start a tunnel:
```bash
ngrok-clone http 3000
```

3. Test the public URL provided by the CLI.

## Alternative Deployment Options

### Digital Ocean

You can deploy using Docker on a Digital Ocean droplet:

1. Create a droplet with Docker pre-installed
2. Copy your `.env` file to the server
3. Run:
```bash
docker-compose up -d
```

### Heroku

Heroku doesn't support WebSocket on non-web processes well, but you can deploy with these considerations:

1. Ensure the `Procfile` uses a single web dyno
2. Use the Heroku Redis addon if you need persistence
3. Configure environment variables via Heroku dashboard

### Kubernetes

For Kubernetes deployment:

1. Use the Docker image
2. Create a Deployment with ports 3000 and 4000
3. Create a Service (LoadBalancer or NodePort)
4. Configure Ingress for HTTP traffic
5. Ensure WebSocket support in your Ingress controller

Example Kubernetes manifest:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ngrok-clone
spec:
  replicas: 2
  selector:
    matchLabels:
      app: ngrok-clone
  template:
    metadata:
      labels:
        app: ngrok-clone
    spec:
      containers:
      - name: ngrok-clone
        image: your-registry/ngrok-clone:latest
        ports:
        - containerPort: 3000
        - containerPort: 4000
        env:
        - name: TUNNEL_DOMAIN
          value: "tunnel.example.com"
        - name: VALID_TOKENS
          valueFrom:
            secretKeyRef:
              name: ngrok-clone-secrets
              key: valid-tokens
---
apiVersion: v1
kind: Service
metadata:
  name: ngrok-clone
spec:
  type: LoadBalancer
  ports:
  - name: http
    port: 80
    targetPort: 3000
  - name: tunnel
    port: 4000
    targetPort: 4000
  selector:
    app: ngrok-clone
```

## Monitoring and Maintenance

### Health Checks

The server responds with 404 on unknown hosts, which is used for health checks.

### Logs

- **Docker Compose**: `docker-compose logs -f`
- **AWS ECS**: View in CloudWatch Logs
- **Kubernetes**: `kubectl logs -f deployment/ngrok-clone`

### Scaling

- **AWS**: Update `desired_count` in terraform.tfvars and run `terraform apply`
- **Kubernetes**: `kubectl scale deployment ngrok-clone --replicas=5`

### Backup

The server is stateless, so no backups are needed. Keep your auth tokens and configuration files secure.

## Security Considerations

1. **Use HTTPS**: Always use TLS for production deployments
2. **Secure Tokens**: Generate strong, random tokens and rotate them periodically
3. **Network Security**: Use security groups/firewalls to restrict access
4. **Rate Limiting**: Consider adding rate limiting at the ALB/proxy level
5. **DDoS Protection**: Use CloudFront or AWS Shield for DDoS protection

## Troubleshooting

### CLI can't connect to server

- Check that port 4000 is accessible
- Verify the server URL is correct
- Check firewall/security group rules

### Requests not reaching local service

- Verify the CLI is running and connected
- Check that the local service is running on the specified port
- Review CLI logs for errors

### Performance issues

- Scale up ECS tasks or add more replicas
- Check CloudWatch metrics for CPU/memory usage
- Consider using a CDN for static assets

## Cost Optimization

- Use AWS Fargate Spot for non-critical workloads
- Configure auto-scaling based on CPU/memory
- Use CloudWatch log retention policies
- Consider reserved instances for consistent workloads

# End-to-End Testing Guide

This guide covers how to test the ducky system from end to end.

## Table of Contents

1. [Quick Start - Automated Local Testing](#quick-start---automated-local-testing)
2. [Manual Local Testing](#manual-local-testing)
3. [AWS Infrastructure Testing](#aws-infrastructure-testing)
4. [AWS Staging Testing](#aws-staging-testing)
5. [Production Testing](#production-testing)
6. [CI/CD Integration](#cicd-integration)
7. [Troubleshooting](#troubleshooting)

---

## Quick Start - Automated Local Testing

**The fastest way to test locally** - runs everything automatically with Docker Compose:

```bash
./test-e2e.sh
```

This tests:
- ✅ Build successful
- ✅ Server starts
- ✅ CLI connects
- ✅ Tunnel established
- ✅ GET/POST requests work
- ✅ Concurrent requests
- ✅ Large payloads (1MB)
- ✅ Request size limits (10MB)
- ✅ Rate limiting (1000 req/min)
- ✅ Metrics collection
- ✅ Structured logging

**Expected output**:
```
🧪 E2E Test for ducky
==========================

✓ Build successful
✓ Test HTTP server running
✓ Tunnel server running
✓ Auth token extracted
✓ CLI configured
✓ Tunnel established: http://abc123.localhost
✓ GET request successful
✓ POST request successful
✓ Concurrent requests handled
✓ Large payload handled
✓ Request size limit enforced
✓ Metrics are being collected
✓ Structured logging working
✓ Rate limiting enforced

🎉 E2E Test Complete!
```

### Platform-Specific Notes

**macOS/Linux**:
```bash
chmod +x test-e2e.sh
./test-e2e.sh
```

**Windows**:
Use Git Bash or WSL to run the script, or manually follow the [Manual Local Testing](#manual-local-testing) steps below.

---

## Manual Local Testing

**Step-by-step manual testing for local development:**

### 1. Start Test Server

```bash
# Terminal 1: Local app to tunnel
node -e "
const http = require('http');
http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'application/json'});
  res.end(JSON.stringify({message: 'Hello!', timestamp: Date.now()}));
}).listen(8080, () => console.log('Local server on :8080'));
"
```

### 2. Start Tunnel Server

```bash
# Terminal 2: Tunnel server
npm run dev:server

# Server will generate a token like:
# ⚠️  No VALID_TOKENS configured. Generated default token: abc123def456...
# Copy this token for the next step
```

### 3. Start CLI Tunnel

```bash
# Terminal 3: CLI client
npm run dev:cli -- http 8080 --token <token-from-step-2>

# Should see:
# ✓ Tunnel established: http://<random-id>.localhost
# Copy the tunnel URL
```

### 4. Test the Tunnel

```bash
# Terminal 4: Make requests
TUNNEL_URL="http://<random-id>.localhost"

# Test GET
curl $TUNNEL_URL

# Test POST
curl -X POST $TUNNEL_URL -d '{"test": "data"}' -H "Content-Type: application/json"

# Test concurrent requests
for i in {1..10}; do curl $TUNNEL_URL & done; wait

# Test metrics
curl http://localhost:3000/metrics
```

### 5. Verify Security Features

```bash
# Test request size limit (should fail with 413)
dd if=/dev/zero bs=1M count=11 | curl -X POST $TUNNEL_URL --data-binary @- -I

# Test rate limiting (make >1000 requests in 1 minute)
for i in {1..1001}; do curl -s $TUNNEL_URL > /dev/null; done
# Should eventually return 429 Too Many Requests
```

---

## AWS Infrastructure Testing

**Test the complete AWS infrastructure from your local machine** before deploying to production.

### Quick Start

```bash
# Deploy and test staging environment in AWS
chmod +x test-aws-local.sh
./test-aws-local.sh staging
```

### What This Tests

- ✅ Docker image builds correctly
- ✅ Image can be pushed to ECR
- ✅ Terraform successfully creates all AWS resources
- ✅ ECS tasks start and run healthy
- ✅ ALB routes traffic correctly
- ✅ WebSocket connections work through ALB
- ✅ Secrets Manager integration works
- ✅ CloudWatch logging works
- ✅ Full tunnel flow functions end-to-end

### Prerequisites

```bash
# Install AWS CLI
brew install awscli

# Configure credentials
aws configure

# Install Terraform
brew tap hashicorp/tap
brew install hashicorp/tap/terraform

# Install jq
brew install jq
```

### Cost Note

This creates **REAL AWS resources** and incurs costs (typically < $5 for a few hours of testing). Remember to clean up when done:

```bash
cd terraform
terraform destroy -var-file=environments/staging.tfvars -auto-approve
```

### Detailed Instructions

For comprehensive AWS infrastructure testing instructions, see **[AWS_LOCAL_TESTING.md](/docs/AWS_LOCAL_TESTING.md)**.

---

## AWS Staging Testing

**Test against the deployed staging environment:**

### Prerequisites

```bash
# Get staging endpoint and token
cd terraform
terraform output

# Or query AWS directly
aws elbv2 describe-load-balancers --names ducky-staging-alb
```

### Run Tests

```bash
# Get auth token from Secrets Manager
SECRET_ARN=$(terraform output -raw secret_arn)
TOKEN=$(aws secretsmanager get-secret-value \
    --secret-id $SECRET_ARN \
    --query SecretString \
    --output text | jq -r '.tokens[0]')

# Start local test server
node -e "
const http = require('http');
http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Hello from staging test!');
}).listen(8080, () => console.log('Test server on :8080'));
" &

# Connect CLI to staging
TUNNEL_HOST=$(terraform output -raw tunnel_endpoint | sed 's|wss://||')
node packages/cli/dist/index.js http 8080 \
    --token $TOKEN \
    --server $TUNNEL_HOST
```

### Verify

```bash
# Check metrics
ALB_DNS=$(terraform output -raw alb_dns_name)
curl http://${ALB_DNS}/metrics

# Get tunnel URL and test
TUNNEL_URL=$(curl -s http://${ALB_DNS}/metrics | jq -r '.tunnels[0].url')
curl $TUNNEL_URL
```

---

## Production Testing

**Test the production environment with caution:**

### Pre-Production Checklist

- [ ] Staging tests pass
- [ ] DNS configured and validated
- [ ] SSL certificate issued
- [ ] CloudWatch alarms configured
- [ ] Backup plan in place

### Smoke Tests

```bash
# Health check (expect 404 for no active tunnel)
curl -I https://tunnel.yourdomain.com/

# Metrics endpoint
curl https://tunnel.yourdomain.com/metrics

# WebSocket connection test
wscat -c wss://tunnel.yourdomain.com:3001
```

### Production Tunnel Test

```bash
# Use production token (from Secrets Manager)
aws secretsmanager get-secret-value \
    --secret-id <production-secret-arn> \
    --query SecretString \
    --output text

# Connect CLI
node packages/cli/dist/index.js http 8080 \
    --token <production-token> \
    --server tunnel.yourdomain.com

# Test tunnel with real traffic
curl <assigned-tunnel-url>
```

### Monitoring

```bash
# View logs
aws logs tail /ecs/ducky --follow

# Check metrics
aws cloudwatch get-metric-statistics \
    --namespace AWS/ECS \
    --metric-name CPUUtilization \
    --dimensions Name=ServiceName,Value=ducky-service \
    --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
    --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
    --period 300 \
    --statistics Average

# Check alarms
aws cloudwatch describe-alarms --alarm-names ducky-*
```

---

## CI/CD Integration

**Automated testing in GitHub Actions:**

### Pull Request Tests

Every PR runs:
```yaml
# .github/workflows/pr-checks.yml
- Build and lint
- Run E2E tests (via test-e2e.sh)
- Validate Terraform
- Test Docker build
```

### Production Deployment Tests

On push to master:
```yaml
# .github/workflows/deploy.yml
- Build and test
- Build Docker image
- Push to ECR
- Deploy with Terraform
- Smoke tests
- Health checks
```

### Local CI Simulation

```bash
# Simulate PR checks locally
npm run build
./test-e2e.sh
cd terraform && terraform validate

# Simulate deployment (staging)
./test-aws-local.sh staging
```

---

## Troubleshooting

### Local Testing Issues

#### Test Script Fails to Start

```bash
# Check port availability
lsof -i :3000  # Tunnel server port
lsof -i :3001  # WebSocket port
lsof -i :8080  # Test server port

# Kill existing processes
kill $(lsof -t -i:3000)
```

#### CLI Can't Connect

```bash
# Check server is running
curl -I http://localhost:3000/

# Check WebSocket upgrade
curl -I http://localhost:3001/ \
    -H "Upgrade: websocket" \
    -H "Connection: Upgrade"

# Verify token
echo $TOKEN
```

#### Tunnel Not Working

```bash
# Check tunnel is registered
curl http://localhost:3000/metrics | jq '.tunnels'

# Check server logs
cat /tmp/ducky-server.log

# Check CLI logs
cat /tmp/ducky-cli.log
```

### AWS Testing Issues

#### Terraform Apply Fails

```bash
# Check AWS credentials
aws sts get-caller-identity

# Validate configuration
cd terraform
terraform validate

# Check state
terraform state list

# Force unlock if stuck
terraform force-unlock <lock-id>
```

#### ECS Tasks Not Starting

```bash
# Check task definition
aws ecs describe-task-definition --task-definition ducky-staging-task

# Check service events
aws ecs describe-services \
    --cluster ducky-staging-cluster \
    --services ducky-staging-service \
    --query 'services[0].events[0:5]'

# Check logs
aws logs tail /ecs/ducky-staging --since 10m
```

#### ALB Health Check Failing

```bash
# Check target health
aws elbv2 describe-target-health --target-group-arn <arn>

# Check security groups
aws ec2 describe-security-groups --group-ids <sg-id>

# Test from within VPC (use Systems Manager Session Manager)
aws ssm start-session --target <ecs-instance-id>
curl http://localhost:3000/
```

#### WebSocket Connection Fails

```bash
# Check ALB WebSocket support
aws elbv2 describe-load-balancer-attributes \
    --load-balancer-arn <arn> \
    --query 'Attributes[?Key==`routing.http2.enabled`]'

# Test WebSocket upgrade
curl -I http://<alb-dns>:3001/ \
    -H "Upgrade: websocket" \
    -H "Connection: Upgrade"

# Check security group port 3001
aws ec2 describe-security-groups --group-ids <alb-sg-id>
```

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `EADDRINUSE` | Port already in use | Kill existing process or change port |
| `Invalid token` | Wrong/expired token | Check token from server startup logs |
| `Tunnel not found` | Tunnel ID incorrect | Verify tunnel URL from metrics |
| `413 Payload Too Large` | Request > 10MB | Expected behavior, test passed |
| `429 Too Many Requests` | Rate limit hit | Expected behavior, test passed |
| `503 Service Unavailable` | No healthy targets | Check ECS task health |
| `504 Gateway Timeout` | Request timeout | Check application logs |

### Performance Testing

```bash
# Load test with Apache Bench
ab -n 1000 -c 10 http://<tunnel-url>/

# Load test with wrk
wrk -t4 -c100 -d30s http://<tunnel-url>/

# Monitor metrics during load
watch -n 1 'curl -s http://localhost:3000/metrics | jq ".performance"'
```

### Debug Mode

```bash
# Server with debug logging
LOG_LEVEL=debug npm run dev:server

# CLI with verbose output
node packages/cli/dist/index.js http 8080 --token <token> -v

# Check structured logs
tail -f /tmp/ducky-server.log | jq
```

---

## Test Automation Best Practices

### 1. Run Tests Before Committing

```bash
# Add to .git/hooks/pre-commit
#!/bin/bash
npm run build && ./test-e2e.sh
```

### 2. Use Staging for Final Validation

```bash
# Before production deploy
./test-aws-local.sh staging
# If passes, merge to master
```

### 3. Monitor Production Tests

```bash
# Set up synthetic monitoring
# Use CloudWatch Synthetics or third-party service
# to continuously test production endpoints
```

### 4. Document Test Results

```bash
# Save test output
./test-e2e.sh | tee test-results-$(date +%Y%m%d-%H%M%S).log

# Track metrics over time
curl http://localhost:3000/metrics | jq '.performance' > metrics.json
```

---

## Next Steps

After successful testing:

1. ✅ **Review metrics** - Ensure performance meets requirements
2. ✅ **Check logs** - Verify no errors or warnings
3. ✅ **Load test** - Test with realistic traffic
4. ✅ **Security scan** - Run security tools on deployed infra
5. ✅ **Documentation** - Update docs with any findings
6. ✅ **Deploy to prod** - Push to master branch for auto-deploy

---

**Status**: Testing Guide Complete ✅

- Local testing: `./test-e2e.sh`
- AWS testing: `./test-aws-local.sh staging`
- Full details: [AWS_LOCAL_TESTING.md](/docs/AWS_LOCAL_TESTING.md)

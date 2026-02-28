# E2E Testing Guide

## Local E2E Test (Automated)

**Quick test** - runs everything automatically:

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
🧪 E2E Test for ngrok-clone
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

---

## Manual E2E Test

**Step-by-step manual testing:**

### 1. Start Test Server

```bash
# Terminal 1: Local app to tunnel
node -e "
const http = require('http');
http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'application/json'});
  res.end(JSON.stringify({msg: 'Hello from local!', time: Date.now()}));
}).listen(8080, () => console.log('Test server on :8080'));
"
```

### 2. Start Tunnel Server

```bash
# Terminal 2: Tunnel server
npm run dev:server

# Copy the generated token from output
```

### 3. Start CLI

```bash
# Terminal 3: CLI
npm run dev:cli -- config add-authtoken <TOKEN>
npm run dev:cli -- http 8080

# Copy the public URL from output
```

### 4. Test Requests

```bash
# Terminal 4: Make requests

# Basic GET
curl -H "Host: <subdomain>.localhost" http://localhost:3000/

# POST with body
curl -X POST \
  -H "Host: <subdomain>.localhost" \
  -H "Content-Type: application/json" \
  -d '{"test":"data"}' \
  http://localhost:3000/api

# Large file (should work)
dd if=/dev/zero bs=1M count=5 | curl -X POST \
  -H "Host: <subdomain>.localhost" \
  --data-binary @- \
  http://localhost:3000/upload

# Too large (should get 413)
dd if=/dev/zero bs=1M count=11 | curl -X POST \
  -H "Host: <subdomain>.localhost" \
  --data-binary @- \
  http://localhost:3000/upload

# Rate limit test
for i in {1..1100}; do
  curl -s -H "Host: <subdomain>.localhost" http://localhost:3000/ &
done
wait
```

### 5. Verify Metrics

```bash
# Wait 5+ minutes, then check server logs for:
📊 Metrics Summary
Tunnels:   Active: 1
Requests:  Total: 1100+
Performance: Avg, P95, P99 times
```

---

## AWS Staging Test

**Test on AWS before production:**

### 1. Deploy to Staging

```bash
# Use staging tfvars
cd terraform
cp terraform.tfvars terraform-staging.tfvars

# Edit staging config
nano terraform-staging.tfvars
# Set: tunnel_domain = "staging.tunnel.yourdomain.com"

# Deploy
terraform workspace new staging
terraform apply -var-file=terraform-staging.tfvars
```

### 2. Configure DNS

```bash
# Get ALB DNS from output
terraform output alb_dns_name

# Add DNS records for staging
# staging.tunnel.yourdomain.com -> ALB
# *.staging.tunnel.yourdomain.com -> ALB
```

### 3. Wait for ACM

```bash
# Check certificate status
aws acm describe-certificate \
  --certificate-arn $(terraform output -raw acm_certificate_arn) \
  --region us-east-1 \
  --query 'Certificate.Status'

# Wait for "ISSUED"
```

### 4. Test CLI Against Staging

```bash
# Generate token
TOKEN=$(openssl rand -hex 32)

# Add to Secrets Manager
aws secretsmanager update-secret \
  --secret-id ngrok-clone-staging/valid-tokens \
  --secret-string "{\"tokens\":[\"$TOKEN\"]}"

# Configure CLI
ngrok-clone config add-authtoken $TOKEN
ngrok-clone config add-server-url wss://staging.tunnel.yourdomain.com:4000

# Start tunnel
ngrok-clone http 8080
```

### 5. Test HTTPS Tunnel

```bash
# Test the assigned HTTPS URL
curl https://<subdomain>.staging.tunnel.yourdomain.com/

# Should get response from local server
```

### 6. Load Test

```bash
# Install load testing tool
npm install -g autocannon

# Run load test
autocannon -c 10 -d 60 \
  https://<subdomain>.staging.tunnel.yourdomain.com/
```

### 7. Check CloudWatch

```bash
# View logs
aws logs tail /ecs/ngrok-clone --follow

# Check metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ServiceName,Value=ngrok-clone-service \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average
```

---

## Production Test

**Minimal testing on production:**

### 1. Smoke Test

```bash
# Test health (should return 404)
curl -I https://tunnel.yourdomain.com

# Should get: HTTP/2 404
```

### 2. Create Production Tunnel

```bash
# Get production token (from secure storage)
ngrok-clone config add-authtoken <PROD_TOKEN>
ngrok-clone config add-server-url wss://tunnel.yourdomain.com:4000

# Tunnel local service
ngrok-clone http 3000

# Test assigned URL
curl https://<subdomain>.tunnel.yourdomain.com/
```

### 3. Monitor First Requests

```bash
# Watch logs
aws logs tail /ecs/ngrok-clone --follow --filter-pattern "ERROR"

# Check metrics
aws logs tail /ecs/ngrok-clone --follow | grep "Metrics Summary"
```

---

## CI/CD Integration Test

**Add to GitHub Actions:**

```yaml
name: E2E Test

on: [push, pull_request]

jobs:
  e2e-test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm install
      
      - name: Build
        run: npm run build
      
      - name: Run E2E tests
        run: |
          timeout 180 ./test-e2e.sh || exit 1
```

---

## Testing Checklist

### Local Development
- [ ] Build completes without errors
- [ ] Server starts and generates token
- [ ] CLI connects successfully
- [ ] Tunnel URL assigned
- [ ] GET requests work
- [ ] POST requests with body work
- [ ] Concurrent requests handled
- [ ] Large payloads work (< 10MB)
- [ ] Request size limit enforced (> 10MB)
- [ ] Rate limiting kicks in after 1000 req/min
- [ ] Metrics logged every 5 minutes
- [ ] Structured JSON logs working

### AWS Staging
- [ ] Docker image builds and pushes
- [ ] Terraform apply succeeds
- [ ] DNS records configured
- [ ] ACM certificate issued
- [ ] HTTPS endpoint accessible
- [ ] CLI connects via WSS
- [ ] Tunnel established
- [ ] HTTPS requests work
- [ ] CloudWatch logs visible
- [ ] Metrics appear in logs
- [ ] Load test passes
- [ ] Auto-scaling works (if configured)

### Production
- [ ] Smoke test passes
- [ ] Token rotation works
- [ ] First tunnel connects
- [ ] Requests flow correctly
- [ ] No errors in logs
- [ ] Metrics look healthy
- [ ] Alarms configured
- [ ] Backup plan in place

---

## Common Issues

### Test fails: "Tunnel server failed to start"

```bash
# Check if port is in use
lsof -i :3000
lsof -i :4000

# Kill existing processes
pkill -f "tsx.*server"
```

### Test fails: "Could not extract tunnel URL"

```bash
# Check CLI logs manually
cat /tmp/tunnel-cli.log

# Verify server is running
curl http://localhost:3000
```

### Rate limit test doesn't trigger

```bash
# Lower the rate limit for testing
export RATE_LIMIT_MAX_REQUESTS=100
npm run dev:server
```

### AWS test: Certificate stuck in "PENDING_VALIDATION"

```bash
# Verify DNS validation records
dig <validation-name>

# Check they point to correct value
aws acm describe-certificate --certificate-arn <arn>
```

---

## Performance Benchmarks

**Expected performance:**

| Metric | Target | Typical |
|--------|--------|---------|
| Request latency | < 100ms | 20-50ms |
| Concurrent requests | 100+ | Limited by setting |
| Throughput | 1000 req/sec | CPU-bound |
| Tunnel startup | < 5s | 2-3s |
| Connection stability | 99.9% | Very stable |

**Run benchmarks:**

```bash
# Install hey
go install github.com/rakyll/hey@latest

# Benchmark throughput
hey -n 10000 -c 50 \
  -H "Host: <subdomain>.localhost" \
  http://localhost:3000/

# Should show:
# Requests/sec: 1000+
# Latency (avg): < 100ms
```

---

## Quick Test Script

**One-liner test:**

```bash
# All-in-one test command
npm run build && ./test-e2e.sh
```

**Expected duration**: ~2-3 minutes

**Success criteria**: All checks pass ✅

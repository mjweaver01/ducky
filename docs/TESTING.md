# End-to-End Testing Guide

This guide covers how to test the ducky system from end to end.

## Table of Contents

1. [Quick Start - Automated Local Testing](#quick-start---automated-local-testing)
2. [Manual Local Testing](#manual-local-testing)
3. [CI/CD Integration](#cicd-integration)
4. [Troubleshooting](#troubleshooting)

---

## Quick Start - Automated Local Testing

**The fastest way to test locally** — runs everything automatically with Docker Compose:

```bash
./test-e2e.sh
```

This tests:
- Build successful
- Server starts
- CLI connects
- Tunnel established
- GET/POST requests work
- Concurrent requests
- Large payloads (1MB)
- Request size limits (10MB)
- Rate limiting (1000 req/min)
- Metrics collection
- Structured logging

**Expected output**:
```
E2E Test for ducky
==========================

Build successful
Test HTTP server running
Tunnel server running
Auth token extracted
CLI configured
Tunnel established: http://abc123.localhost
GET request successful
POST request successful
Concurrent requests handled
Large payload handled
Request size limit enforced
Metrics are being collected
Structured logging working
Rate limiting enforced

E2E Test Complete!
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
# No VALID_TOKENS configured. Generated default token: abc123def456...
# Copy this token for the next step
```

### 3. Start CLI Tunnel

```bash
# Terminal 3: CLI client
npm run dev:cli -- http 8080 --authtoken <token-from-step-2>

# Should see:
# Tunnel established: http://<random-id>.localhost
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

## CI/CD Integration

**Automated testing in GitHub Actions:**

### Pull Request Tests

Every PR runs (`.github/workflows/pr-checks.yml`):
- Build and lint
- Run E2E tests (`test-e2e.sh`)
- Test all three Docker image builds

### On Push to Master

`.github/workflows/ci.yml` runs build and E2E tests (CI). Railway auto-deploys when the repo is connected; no deploy step in Actions.

### Local CI Simulation

```bash
# Simulate PR checks locally
npm run build
./test-e2e.sh
docker build -t ducky-server:test .
docker build -f Dockerfile.web-backend -t ducky-backend:test .
docker build -f Dockerfile.web-frontend --build-arg VITE_API_URL=http://localhost:3002 -t ducky-frontend:test .
```

---

## Troubleshooting

### Local Testing Issues

#### Test Script Fails to Start

```bash
# Check port availability
lsof -i :3000   # Tunnel server / HTTP proxy
lsof -i :8080   # Test server port

# Kill existing processes
kill $(lsof -t -i:3000)
```

#### CLI Can't Connect

```bash
# Check server is running
curl -I http://localhost:3000/

# Verify WebSocket path
# Default local URL is: ws://localhost:3000/_tunnel
# Verify token
echo $TOKEN
```

#### Tunnel Not Working

```bash
# Check tunnel is registered
curl http://localhost:3000/metrics | jq '.tunnels'

# Check server logs
cat logs/server.log

# Check CLI logs
cat logs/web-backend.log
```

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `EADDRINUSE` | Port already in use | Kill existing process or change port |
| `Invalid token` | Wrong/expired token | Check token from server startup logs |
| `Tunnel not found` | Tunnel ID incorrect | Verify tunnel URL from metrics |
| `413 Payload Too Large` | Request > 10MB | Expected behavior, test passed |
| `429 Too Many Requests` | Rate limit hit | Expected behavior, test passed |
| `503 Service Unavailable` | No active tunnel | Start a tunnel with the CLI |
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

# Check structured logs
tail -f logs/server.log | jq
```

---

## Test Automation Best Practices

### 1. Run Tests Before Committing

```bash
# Add to .git/hooks/pre-commit
#!/bin/bash
npm run build && ./test-e2e.sh
```

### 2. Save Test Output

```bash
./test-e2e.sh | tee test-results-$(date +%Y%m%d-%H%M%S).log
```

### 3. Track Metrics Over Time

```bash
curl http://localhost:3000/metrics | jq '.performance' > metrics.json
```

---

## Next Steps

After successful testing:

1. Review metrics — ensure performance meets requirements
2. Check logs — verify no errors or warnings
3. Load test — test with realistic traffic
4. Deploy to production — push to master branch for auto-deploy via Railway

---

- Local testing: `./test-e2e.sh`
- Full details: [DEV_COMMANDS.md](DEV_COMMANDS.md)

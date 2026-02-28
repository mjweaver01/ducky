# 🦆 ducky - Quick Commands

## Local Development

### Start Everything (Recommended)
```bash
npm run dev
```
This starts:
- PostgreSQL (Docker)
- Tunnel Server (ports 3000, 3001)
- Web Backend API (port 3002)
- Web Frontend (port 5173)

All output from the frontend is shown. Backend logs go to `logs/` directory.

**Press Ctrl+C to stop everything.**

### Access
- **Web UI**: http://localhost:5173
- **API Health**: http://localhost:3002/health
- **Server Metrics**: http://localhost:3000/metrics

### View Logs
```bash
# All logs
npm run logs

# Server only
npm run logs:server

# Backend only
npm run logs:backend
```

### Stop Everything
```bash
npm run stop
```

### Clean Build Artifacts
```bash
npm run clean
```

---

## Cloud Mode (AWS Test)

Test the full AWS infrastructure from your local machine.

### Test Staging Environment
```bash
npm run cloud
```

### Test Production Environment
```bash
npm run cloud:production
```

This will:
1. ✅ Build application
2. ✅ Build and push Docker image to ECR
3. ✅ Deploy full AWS infrastructure (ECS, ALB, RDS, etc.)
4. ✅ Run smoke tests
5. ✅ Test complete tunnel flow

**Cost**: ~$0.05/hour for staging, remember to destroy when done!

### Cleanup After Cloud Test
```bash
cd terraform
terraform destroy -var-file=environments/staging.tfvars -auto-approve
```

---

## Individual Services

### Build
```bash
npm run build              # Build all packages
npm run build:server       # Build server only
npm run build:cli          # Build CLI only
npm run build:web          # Build web backend + frontend
```

### Run Individual Services
```bash
npm run dev:server         # Tunnel server
npm run dev:cli            # CLI (for development)
npm run dev:web-backend    # Web API
npm run dev:web-frontend   # React frontend
```

---

## Testing

### Local E2E Test
```bash
npm run test:e2e
```

### AWS Infrastructure Test
```bash
npm run test:aws
```

---

## Usage Flow

### 1. First Time Setup
```bash
npm install
npm run build
npm run dev
```

### 2. Create Account
- Open http://localhost:5173
- Sign up with email/password
- Login

### 3. Create Auth Token
- Dashboard → Auth Tokens → Create Token
- Copy the token value

### 4. Start Tunnel (New Terminal)
```bash
node packages/cli/dist/index.js http 3000 \
  --token YOUR_TOKEN \
  --server localhost
```

### 5. Monitor in Dashboard
- Dashboard → Tunnels
- See real-time stats and requests

---

## Troubleshooting

### PostgreSQL won't start
```bash
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml up -d
```

### Port already in use
```bash
# Find and kill process
lsof -ti:3000,3001,3002,5173 | xargs kill -9

# Or use stop command
npm run stop
```

### Services won't stop
```bash
# Kill all node processes (⚠️ careful!)
pkill -9 node

# Or manually
kill $(cat logs/server.pid)
kill $(cat logs/web-backend.pid)
```

### Clean restart
```bash
npm run stop
npm run clean
docker compose -f docker-compose.dev.yml down -v
npm install
npm run build
npm run dev
```

---

## Environment Variables

Copy `.env.example` to `.env` and customize:

```bash
cp .env.example .env
```

Key variables:
- `DATABASE_HOST=localhost`
- `DATABASE_PASSWORD=ngrok_password`
- `JWT_SECRET=your-secret-key`
- `BASE_DOMAIN=localhost`

---

## File Structure

```
logs/                    # Created by npm run dev
  server.log            # Tunnel server logs
  web-backend.log       # API logs
  server.pid            # Server process ID
  web-backend.pid       # Backend process ID

packages/
  server/               # Tunnel server
  cli/                  # CLI tool
  database/             # PostgreSQL layer
  web-backend/          # Express API
  web-frontend/         # React UI
```

---

## Quick Reference

| Command | Description |
|---------|-------------|
| `npm run dev` | Start everything (recommended) |
| `npm run cloud` | Test AWS infrastructure |
| `npm run build` | Build all packages |
| `npm run test:e2e` | Run local E2E tests |
| `npm run logs` | View all logs |
| `npm run stop` | Stop all services |
| `npm run clean` | Clean build artifacts |

---

**Status**: Ready to develop! 🦆

Run `npm run dev` to get started.

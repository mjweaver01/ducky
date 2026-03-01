# ducky - Quick Commands

## Local Development

### Start Everything (Recommended)
```bash
npm run dev
```
This starts:
- PostgreSQL (Docker)
- Tunnel Server (port 3000)
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
npm run dev:server         # Tunnel server (port 3000)
npm run dev:cli            # CLI (for development)
npm run dev:web-backend    # Web API (port 3002)
npm run dev:web-frontend   # React frontend (port 5173)
```

---

## Testing

### Local E2E Test
```bash
npm run test:e2e
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
# Using the installed CLI
ducky config auth YOUR_TOKEN
ducky http 3000

# Or run directly from the build output
node packages/cli/dist/index.js http 3000 --authtoken YOUR_TOKEN
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
lsof -ti:3000,3002,5173 | xargs kill -9

# Or use stop command
npm run stop
```

### Services won't stop
```bash
# Kill all node processes (careful!)
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
- `DATABASE_PASSWORD=ducky_password`
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
| `npm run build` | Build all packages |
| `npm run test:e2e` | Run local E2E tests |
| `npm run logs` | View all logs |
| `npm run stop` | Stop all services |
| `npm run clean` | Clean build artifacts |

---

**Status**: Ready to develop!

Run `npm run dev` to get started.

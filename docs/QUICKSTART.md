# Quick Start

Get ducky running locally in under 2 minutes.

---

## Prerequisites

- **Node.js** ≥ 25
- **Docker** (for PostgreSQL)

---

## 1. Clone & Install

```bash
git clone https://github.com/your-org/ducky-wtf.git
cd ducky-wtf
npm install
```

---

## 2. Build Everything

```bash
npm run build
```

This builds all packages: `shared`, `database`, `server`, `web-backend`, `web-frontend`, `cli`.

---

## 3. Start Everything

```bash
npm run dev
```

This starts:
- PostgreSQL (Docker)
- Tunnel Server (port 3000)
- Web Backend API (port 3002)
- Web Frontend (port 5173)

**That's it!** Open http://localhost:5173

---

## 4. Create Account & Token

**Option A: Start anonymously** (fastest)
```bash
# Just run it - anonymous tunnel created automatically
ducky http 3000
```

**Option B: Login first**
```bash
# Login with magic link
ducky login

# Then start tunnel
ducky http 3000
```

**Option C: Traditional approach**
1. **Sign up** at http://localhost:5173
   - Default login: `admin@ducky.wtf` / `admin123`
   - Or create a new account

2. **Create an auth token**:
   - Dashboard → Auth Tokens → Create Token
   - Copy the token

3. **Start a tunnel**:
   ```bash
   ducky config auth YOUR_TOKEN
   ducky http 3000
   ```

You'll see your tunnel in the dashboard at **Dashboard → Tunnels**.

---

## Running Individual Services

If you need to develop a specific component with hot reload:

```bash
# Terminal 1 - Tunnel Server
npm run dev:server

# Terminal 2 - Web Backend API
npm run dev:web-backend

# Terminal 3 - Frontend (with Vite hot reload)
npm run dev:web-frontend
```

The database still needs to be running:
```bash
docker compose -f docker-compose.dev.yml up -d
```

---

## Useful Commands

```bash
# View logs
npm run logs

# Stop everything
npm run stop

# Clean build artifacts
npm run clean

# Rebuild
npm run build

# E2E tests
npm run test:e2e

# Check CLI status
ducky status

# Login with magic link
ducky login
```

---

## Accessing Services

| Service | URL |
|---------|-----|
| Web UI | http://localhost:5173 |
| API Health | http://localhost:3002/health |
| Server Metrics | http://localhost:3000/metrics |
| Database | localhost:5432 (user: `ducky`, pass: `ducky_password`) |

---

## Testing Your Tunnel

```bash
# Start a simple HTTP server
cd /tmp
echo "Hello from localhost" > index.html
python3 -m http.server 8080

# In another terminal, tunnel it
ducky http 8080

# Visit the tunnel URL (shown in CLI output)
# You should see "Hello from localhost"
```

---

## Troubleshooting

### Port already in use
```bash
npm run stop
# or
lsof -ti:3000,3002,5173 | xargs kill -9
```

### Database won't start
```bash
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml up -d
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

### Tunnel doesn't show in dashboard
- Make sure you're using a token created in the dashboard
- Check that `DATABASE_URL` or `DATABASE_HOST` is set for the server
- View server logs: `npm run logs:server`

---

## Next Steps

- **[FEATURES.md](FEATURES.md)** — Learn about all features (including static URLs for Pro plans)
- **[DEV_COMMANDS.md](DEV_COMMANDS.md)** — Complete command reference
- **[TESTING.md](TESTING.md)** — Testing guide
- **[GETTING_LIVE.md](GETTING_LIVE.md)** — Deploy to production

---

**Ready to code!** 🦆

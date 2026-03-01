# Quick Start Guide - Web UI

## Start Everything (Local Development)

### 1. Start Database
```bash
docker compose -f docker-compose.dev.yml up -d
```

### 2. Install & Build
```bash
npm install
npm run build
```

### 3. Start All Services

**Option A: One command**
```bash
npm run dev
```

**Option B: Three Terminals**
```bash
# Terminal 1 - Tunnel Server (port 3000)
npm run dev:server

# Terminal 2 - Web API (port 3002)
npm run dev:web-backend

# Terminal 3 - Frontend (port 5173)
npm run dev:web-frontend
```

### 4. Open Browser
- **Web UI**: http://localhost:5173
- **API Health**: http://localhost:3002/health
- **Server Metrics**: http://localhost:3000/metrics

---

## First User

### Default Admin (created by schema.sql):
- **Email**: `admin@ducky.wtf`
- **Password**: `admin123`

### Or Create New User:
1. Visit http://localhost:5173
2. Click "Get Started" or "Sign Up"
3. Enter email, password, name
4. Login automatically after signup

---

## Create Auth Token

1. Login to dashboard
2. Click "Auth Tokens" in sidebar
3. Click "Create Token"
4. Enter name (e.g., "My Laptop")
5. Copy the token value

---

## Start Tunnel

```bash
# Build CLI first (if not already built)
npm run build:cli

# Using installed CLI
ducky config auth YOUR_TOKEN_HERE
ducky http 3000

# Or run directly
node packages/cli/dist/index.js http 3000 --authtoken YOUR_TOKEN_HERE
```

The tunnel URL appears in both the terminal and the dashboard.

---

## View in Dashboard

1. Go to Dashboard → Tunnels
2. See your active tunnel
3. Watch request count update in real-time
4. View stats cards (requests, bandwidth)

---

## Add Custom Domain

1. Dashboard → Custom Domains
2. Click "Add Domain"
3. Enter domain: `tunnel.example.com`
4. Add TXT record to DNS:
   ```
   _ducky-challenge.tunnel.example.com TXT <verification-token>
   ```
5. Click "Verify"
6. Use custom domain with CLI:
   ```bash
   ducky http 3000 --url https://tunnel.example.com
   ```

---

## Troubleshooting

### Database connection fails
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Restart database
docker compose -f docker-compose.dev.yml restart postgres

# View logs
docker compose -f docker-compose.dev.yml logs postgres
```

### API returns 500 errors
```bash
# Check database connection in API logs
cat logs/web-backend.log | grep -i "database"

# Verify environment variables
cat .env
```

### Frontend can't connect to API
```bash
# Check packages/web-frontend/.env or .env
# Should have: VITE_API_URL=http://localhost:3002

# Restart frontend dev server
npm run dev:web-frontend
```

### Tunnel doesn't appear in dashboard
```bash
# Verify DATABASE_HOST or DATABASE_URL is set for the server
# Check server logs for database errors
cat logs/server.log | grep -i "database"
# Ensure you're using a token from the database (created in dashboard)
```

---

## Clean Reset

```bash
# Remove all data and containers
docker compose -f docker-compose.dev.yml down -v

# Remove built files
rm -rf packages/*/dist

# Reinstall and rebuild
npm install
npm run build

# Start fresh
npm run dev
```

---

## Testing Checklist

- [ ] Database starts successfully
- [ ] Tunnel server starts (port 3000)
- [ ] Web backend API starts (port 3002)
- [ ] Frontend dev server starts (port 5173)
- [ ] Can register new user
- [ ] Can login
- [ ] Can create auth token
- [ ] Can start tunnel with CLI
- [ ] Tunnel appears in dashboard
- [ ] Request count increments
- [ ] Can stop tunnel from dashboard
- [ ] Can add custom domain
- [ ] Can update profile
- [ ] Can change password

---

## Production Deployment

See:
- **[GETTING_LIVE.md](GETTING_LIVE.md)** — Deploy everything to Railway
- **[TESTING.md](TESTING.md)** — E2E testing guide

Key things needed for production:
1. Railway project with PostgreSQL plugin
2. Three services: `tunnel-server`, `web-backend`, `web-frontend`
3. Custom domains assigned in Railway
4. Set strong `JWT_SECRET` and `SESSION_SECRET`
5. `DATABASE_URL` linked from Railway Postgres plugin

---

## Quick Commands

```bash
# Status
docker ps
lsof -i :3000,3002,5173

# Logs
docker compose -f docker-compose.dev.yml logs -f

# Database
docker exec -it ducky-postgres psql -U ducky -d ducky

# Health checks
curl http://localhost:3002/health
curl http://localhost:3000/metrics
```

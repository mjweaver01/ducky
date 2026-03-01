# Quick Start Guide - Web UI

## 🚀 Start Everything (Local Development)

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

**Option A: Three Terminals**
```bash
# Terminal 1 - Tunnel Server
npm run dev:server

# Terminal 2 - Web API
npm run dev:web-backend

# Terminal 3 - Frontend
cd packages/web-frontend
npm install  # First time only
npm run dev
```

**Option B: Background Processes**
```bash
npm run dev:server > server.log 2>&1 &
npm run dev:web-backend > api.log 2>&1 &
cd packages/web-frontend && npm run dev
```

### 4. Open Browser
- **Web UI**: http://localhost:5173
- **API Health**: http://localhost:3002/health
- **Server Metrics**: http://localhost:3000/metrics

---

## 👤 First User

### Default Admin (created by schema.sql):
- **Email**: `admin@ducky.wtf`
- **Password**: `admin123`

### Or Create New User:
1. Visit http://localhost:5173
2. Click "Get Started" or "Sign Up"
3. Enter email, password, name
4. Login automatically after signup

---

## 🔑 Create Auth Token

1. Login to dashboard
2. Click "Auth Tokens" in sidebar
3. Click "Create Token"
4. Enter name (e.g., "My Laptop")
5. Copy the token value

---

## 🌐 Start Tunnel

```bash
# Build CLI first
npm run build:cli

# Start tunnel
node packages/cli/dist/index.js http 3000 \
  --token YOUR_TOKEN_HERE \
  --server localhost

# Tunnel URL shown in terminal and dashboard
```

---

## 📊 View in Dashboard

1. Go to Dashboard → Tunnels
2. See your active tunnel
3. Watch request count update in real-time
4. View stats cards (requests, bandwidth)

---

## 🌐 Add Custom Domain

1. Dashboard → Custom Domains
2. Click "Add Domain"
3. Enter domain: `tunnel.example.com`
4. Add TXT record to DNS:
   ```
   _ngrok-challenge.tunnel.example.com TXT <verification-token>
   ```
5. Click "Verify"
6. Use custom domain with CLI:
   ```bash
   node packages/cli/dist/index.js http 3000 \
     --token YOUR_TOKEN \
     --server custom.ducky.wtf
   ```

---

## 🔧 Troubleshooting

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
cat api.log | grep -i "database"

# Verify environment variables
cat .env
```

### Frontend can't connect to API
```bash
# Check packages/web-frontend/.env
# Should have: VITE_API_URL=http://localhost:3002

# Restart frontend dev server
cd packages/web-frontend && npm run dev
```

### Tunnel doesn't appear in dashboard
```bash
# Verify DATABASE_HOST is set for server
# Check server logs for database errors
# Ensure you're using a token from the database (not env var token)
```

---

## 🧹 Clean Reset

```bash
# Start and remove all data
docker compose -f docker-compose.dev.yml down -v

# Remove built files
rm -rf packages/*/dist

# Reinstall and rebuild
npm install
npm run build

# Start fresh
docker compose -f docker-compose.dev.yml up -d
npm run dev:server &
npm run dev:web-backend &
cd packages/web-frontend && npm run dev
```

---

## 📝 Testing Checklist

- [ ] Database starts successfully
- [ ] Tunnel server starts (port 3000, 3001)
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

## 🚢 Production Deployment

See:
- **[AWS_DEPLOYMENT.md](/docs/AWS_DEPLOYMENT.md)** - Complete AWS guide
- **[WEB_UI_COMPLETE.md](/docs/WEB_UI_COMPLETE.md)** - Full implementation details
- **[TESTING.md](/docs/TESTING.md)** - E2E testing guide

Key additions needed for production:
1. RDS PostgreSQL instance (Terraform)
2. ECS task/service for web-backend (Terraform)
3. ALB rules for web traffic (Terraform)
4. S3 + CloudFront for frontend (or Nginx container)
5. Update security groups for database access
6. Set strong JWT_SECRET and SESSION_SECRET
7. Enable DATABASE_SSL=true

---

## 📚 Documentation

- **API**: See `packages/web-backend/src/routes/`
- **Database**: See `database/schema.sql`
- **Frontend**: See `packages/web-frontend/src/`
- **Full Guide**: See [WEB_UI_COMPLETE.md](/docs/WEB_UI_COMPLETE.md)

---

**Quick Commands**:
```bash
# Status
docker ps
lsof -i :3000,3001,3002,5173

# Logs
docker compose -f docker-compose.dev.yml logs -f

# Database
docker exec -it ducky-postgres psql -U ngrok -d ngrok_clone

# Health checks
curl http://localhost:3002/health
curl http://localhost:3000/metrics
```

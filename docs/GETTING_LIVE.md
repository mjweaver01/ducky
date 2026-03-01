# Step-by-step: Get ducky live on Railway

This guide walks through deploying the full ducky stack to Railway so it's live with HTTPS and database-backed authentication.

---

## Prerequisites

- **Railway account** at [railway.app](https://railway.app) — Hobby plan ($5/month base) is sufficient to start; wildcard custom domains require Pro plan ($20/month).
- **Domain** you control (e.g. `ducky.wtf`). You'll add DNS records in a later step.
- **GitHub repo** — Railway deploys from Git.
- **Railway CLI** (optional but useful): `npm install -g @railway/cli`

---

## Step 1: Create a Railway project

1. Go to [railway.app](https://railway.app) → **New Project**.
2. Choose **Empty project**.
3. Name it `ducky`.

---

## Step 2: Add PostgreSQL

Inside the project, click **+ New** → **Database** → **Add PostgreSQL**.

Railway will provision a managed Postgres instance and automatically make `DATABASE_URL` available to any service you link it to.

Run the schema once the database is ready:

```bash
# Using the Railway CLI
railway connect postgres
# Then in the psql prompt:
\i database/schema.sql
```

Or use the Railway dashboard → **PostgreSQL** → **Data** → **Query** tab and paste the contents of `database/schema.sql`.

---

## Step 3: Create the three services

For each service below, click **+ New** → **GitHub Repo** (or **Empty Service** if you prefer to push via CLI), then configure as shown.

### 3a. tunnel-server

| Setting | Value |
|---|---|
| Service name | `tunnel-server` |
| Dockerfile path | `Dockerfile` |
| Root directory | `/` (repo root) |

**Environment variables** (set in Railway dashboard → service → Variables):

```
BASE_DOMAIN=ducky.wtf
NODE_ENV=production
PORT=3000
```

`DATABASE_URL` is auto-injected when you link the Postgres service — click the service → **Variables** → **+ Add Reference** → select `DATABASE_URL` from the Postgres plugin.

### 3b. web-backend

| Setting | Value |
|---|---|
| Service name | `web-backend` |
| Dockerfile path | `Dockerfile.web-backend` |
| Root directory | `/` |

**Environment variables**:

```
NODE_ENV=production
WEB_PORT=3002
JWT_SECRET=<generate a strong random secret>
SESSION_SECRET=<generate a strong random secret>
WEB_URL=https://ducky.wtf
```

Link `DATABASE_URL` from the Postgres plugin (same as above).

### 3c. web-frontend

| Setting | Value |
|---|---|
| Service name | `web-frontend` |
| Dockerfile path | `Dockerfile.web-frontend` |
| Root directory | `/` |

**Environment variables** (used as Docker build args):

```
VITE_API_URL=https://api.ducky.wtf
```

> Railway passes environment variables as build args when you set them as variables on the service. The `Dockerfile.web-frontend` accepts `VITE_API_URL` as a build arg.

---

## Step 4: Assign custom domains

In Railway, go to each service → **Settings** → **Networking** → **Custom Domain**.

| Service | Domain |
|---|---|
| `tunnel-server` | `*.ducky.wtf` (wildcard — requires Pro plan) |
| `web-backend` | `api.ducky.wtf` |
| `web-frontend` | `ducky.wtf` |

Railway will show the CNAME target for each domain after you add it.

> **Note on the wildcard**: Railway Pro plan is required for wildcard custom domains. Without it, individual tunnel subdomains like `abc123.ducky.wtf` won't route to the tunnel server.

---

## Step 5: Update DNS records

At your DNS provider, create the CNAME records Railway shows you:

| Name | Type | Value |
|---|---|---|
| `*.ducky.wtf` | CNAME | Railway tunnel-server domain |
| `api.ducky.wtf` | CNAME | Railway web-backend domain |
| `ducky.wtf` | CNAME (or ALIAS) | Railway web-frontend domain |

Railway automatically provisions TLS certificates via Let's Encrypt once DNS propagates (usually a few minutes).

---

## Step 6: Verify the deployment

**Web UI:**
```
https://ducky.wtf  →  should load the React app
```

**API health:**
```bash
curl https://api.ducky.wtf/health
# {"status":"healthy","database":"connected",...}
```

**Tunnel server metrics:**
```bash
curl https://tunnel.ducky.wtf/metrics
# {"activeTunnels":0,...}
```

---

## Step 7: Configure the CLI and start a tunnel

1. Create an account at `https://ducky.wtf` and generate an auth token in the dashboard.
2. Configure the CLI:

```bash
ducky config auth YOUR_TOKEN
ducky config add-server-url wss://tunnel.ducky.wtf/_tunnel
```

3. Start a tunnel:

```bash
ducky http 3000
# Tunnel established: https://abc123.ducky.wtf -> localhost:3000
```

---

## Step 8: Set up CI/CD (optional)

1. Generate a Railway token: Railway dashboard → **Account** → **Tokens** → **New Token**.
2. Add it as `RAILWAY_TOKEN` in your GitHub repo → **Settings** → **Secrets and variables** → **Actions**.
3. Push to `master` — `.github/workflows/deploy.yml` will automatically deploy all three services.

---

## Summary checklist

| Step | Action |
|------|--------|
| 1 | Railway project created |
| 2 | PostgreSQL plugin added, schema applied |
| 3 | Three services created with correct Dockerfiles and env vars |
| 4 | Custom domains assigned in Railway (Pro plan for wildcard) |
| 5 | DNS CNAMEs created at your registrar |
| 6 | Health checks pass — web UI, API, and metrics all respond |
| 7 | CLI configured, test tunnel works end-to-end |
| 8 | `RAILWAY_TOKEN` secret added to GitHub for auto-deploy |

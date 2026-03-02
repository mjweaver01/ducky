# Railway setup from scratch (after importing from GitHub)

When you **import from GitHub**, Railway creates one service per package in the monorepo (e.g. 5 services: `@ducky.wtf/server`, `@ducky.wtf/web-backend`, `@ducky.wtf/web-frontend`, `@ducky.wtf/database`, `@ducky.wtf/cli`). You only need **three app services** plus **Postgres**. This guide gets you there from that starting point.

---

## 1. Import the repo and add Postgres

1. **New Project** → **Deploy from GitHub repo** (or **Add GitHub Repo**).
2. Select your **ducky** repo and the branch to deploy (e.g. `master`).
3. Railway will create **several services** (one per workspace package)—often 5: `@ducky.wtf/server`, `@ducky.wtf/web-backend`, `@ducky.wtf/web-frontend`, `@ducky.wtf/database`, `@ducky.wtf/cli`.
4. **Add Postgres:** In the same project, **+ New** → **Database** → **Add PostgreSQL**.  
   The app services will use this; the `@ducky.wtf/database` **service** is not the database—it’s just the DB client library used inside server and web-backend.

---

## 2. Keep only three app services

You need exactly these three **services** (the rest are libraries or CLI, not deployed apps):

| Keep this service   | Role            |
|---------------------|-----------------|
| `@ducky.wtf/server`     | Tunnel server   |
| `@ducky.wtf/web-backend`| API             |
| `@ducky.wtf/web-frontend` | Web app       |

**Delete the others:**

- Delete **`@ducky.wtf/database`** — it’s a package, not a database; server and web-backend already depend on it and build it inside their images. The real data store is the **PostgreSQL** plugin you added.
- Delete **`@ducky.wtf/cli`** — the CLI is for local use, not a deployed service.

If you also see **`@ducky.wtf/shared`** as a service, delete it too; it’s a shared library built into server and web-backend.

After this you should have: **3 app services** + **1 PostgreSQL** service.

---

## 3. Run the database schema

Run the contents of **`database/schema.sql`** from the repo against your Postgres. Options:

- **Dashboard (if available):** Open the **PostgreSQL** service → **Data**. If you see **Query** or **SQL**, paste the schema and run it. (If not, enable **Raw SQL Query Tab** at [railway.com/account/feature-flags](https://railway.com/account/feature-flags), then check Data again.)
- **CLI:** From the repo root, run `railway link` (select the project), then `railway connect postgres`. In the `psql` prompt, run `\i database/schema.sql` (or paste the file contents).
- **External client:** In the Postgres service, open **Connect** (or **Variables**) and copy **`DATABASE_PUBLIC_URL`** or **`DATABASE_URL`**. Connect with TablePlus, DBeaver, Beekeeper, or any Postgres client and run the schema SQL.

---

## 4. Configure each of the three app services

For **each** of the three services you kept, open it and set the following.  
### `@ducky.wtf/server` (tunnel server)

- **Settings** → **Build**
  - **Dockerfile path:** `Dockerfile` (the file in the repo root)
  - **Root directory:** leave **empty**
- **Variables**
  - Add: `TUNNEL_DOMAIN` = your domain (e.g. `ducky.wtf`), `NODE_ENV` = `production`, `PORT` = `3000`
  - **+ Add Reference** → **PostgreSQL** → **DATABASE_URL** (so the server can use DB auth)

### `@ducky.wtf/web-backend` (API)

- **Settings** → **Build**
  - **Dockerfile path:** `Dockerfile.web-backend`
  - **Root directory:** leave **empty**
- **Variables**
  - Add: `NODE_ENV` = `production`, `WEB_PORT` = `3002`, `JWT_SECRET` = (random string), `SESSION_SECRET` = (random string), `WEB_URL` = `https://ducky.wtf` (or your frontend URL)
  - **+ Add Reference** → **PostgreSQL** → **DATABASE_URL**

### `@ducky.wtf/web-frontend` (web app)

- **Settings** → **Build**
  - **Dockerfile path:** `Dockerfile.web-frontend`
  - **Root directory:** leave **empty**
  - **Build Command** and **Install Command:** leave **empty**
- **Settings** → **Deploy** (or **Start**): set **Start Command** to **`npm start`** (otherwise Railway may run `npm start -w @ducky.wtf/web-frontend` and you get "No workspaces found" at container start)
- **Variables**
  - Add: `VITE_API_URL` = your API URL (e.g. `https://api.ducky.wtf`)

---

## 5. Custom domains (optional)

For each of the three app services: **Settings** → **Networking** → **Custom Domain**. Add the domain and the **port** your app listens on (Railway will route HTTPS to that port inside the container).

| Service        | Domain          | Port |
|----------------|-----------------|------|
| Tunnel server  | `*.ducky.wtf` (wildcard; Pro) or Railway default | `3000` |
| Web backend    | `api.ducky.wtf` | `3002` |
| Web frontend   | `ducky.wtf`     | `3000` |

Add the CNAMEs Railway shows at your DNS provider.

---

## 6. Deploy

- **Redeploy** each of the three services (or push a commit). The config files use `watchPatterns = ["**"]` so any push triggers a build.
- With the repo connected via **Deploy from GitHub**, Railway **auto-deploys** on push (and can wait for CI to finish if you enable that in Railway). No `RAILWAY_TOKEN` or GitHub Actions deploy step is required.

---

## If you see "No workspaces found" for web-frontend

That error at **container start** means Railway’s **Start Command** is something like `npm start -w @ducky.wtf/web-frontend` (monorepo style). Fix: open the web-frontend service → **Settings** → **Deploy** (or **Start**) and set **Start Command** to **`npm start`**. The frontend package has a `start` script that runs `serve -s dist -l 3000`, so the app will start correctly. Also clear any **Build Command** / **Install Command** under **Build** so the Dockerfile is the only build.

---

## Summary

| Step | Action |
|------|--------|
| 1 | Import repo from GitHub → Railway creates ~5 services |
| 2 | Add **PostgreSQL**; **delete** `@ducky.wtf/database`, `@ducky.wtf/cli` (and `@ducky.wtf/shared` if present) so only **server**, **web-backend**, **web-frontend** remain |
| 3 | Run **`database/schema.sql`** in Postgres (see step 3 above for options) |
| 4 | Set **Dockerfile path** to `Dockerfile`, `Dockerfile.web-backend`, or `Dockerfile.web-frontend`, **Root directory** empty, and **Variables** (and **DATABASE_URL** reference) for each service |
| 5 | Add custom domains if desired |
| 6 | Redeploy or push to trigger builds |

All three app services use **Root directory** = empty so the build context is the repo root.

---

## Env vars checklist (connect everything)

Set these in each service’s **Variables** (and use **+ Add Reference** for Postgres). Replace `ducky.wtf` and `api.ducky.wtf` with your real domain and API domain.

| Variable | Where | Example / notes |
|----------|--------|------------------|
| **@ducky.wtf/server** | | |
| `TUNNEL_DOMAIN` | Variable | `ducky.wtf` (domain for tunnels, e.g. `abc123.ducky.wtf`) |
| `PORT` | Variable | `3000` |
| `NODE_ENV` | Variable | `production` |
| `DATABASE_URL` | **Reference** → PostgreSQL | (from Postgres plugin) |
| **@ducky.wtf/web-backend** | | |
| `WEB_PORT` | Variable | `3002` |
| `NODE_ENV` | Variable | `production` |
| `WEB_URL` | Variable | `https://ducky.wtf` (frontend URL for CORS) |
| `JWT_SECRET` | Variable | Long random string (e.g. `openssl rand -hex 32`) |
| `SESSION_SECRET` | Variable | Long random string (e.g. `openssl rand -hex 32`) |
| `DATABASE_URL` | **Reference** → PostgreSQL | (from Postgres plugin) |
| **@ducky.wtf/web-frontend** | | |
| `VITE_API_URL` | Variable | `https://api.ducky.wtf` (backend API URL; used at **build time**—redeploy frontend after changing) |

**Order:** Create/link `DATABASE_URL` first (reference from Postgres). Then set the rest so server and web-backend talk to Postgres, and frontend points at the API. After changing any variable, redeploy that service (and for `VITE_API_URL`, the frontend must be **rebuilt**).

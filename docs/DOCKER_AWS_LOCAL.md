# Run Docker Like AWS Locally (aws-local)

Spin up the **full ducky stack** as it would run on AWS: Postgres, tunnel server, web API, and web UI. One command, everything live.

## What runs

| Service        | Port  | Description                    |
|----------------|-------|--------------------------------|
| **Postgres**   | 5432  | Database (users, tokens, tunnels) |
| **Tunnel server** | 3000, 4000 | ngrok-like tunnel (HTTP + WebSocket) |
| **Web API**    | 3002  | REST API (auth, tokens, tunnels) |
| **Web UI**     | 5173  | Dashboard (sign up, create tokens, view tunnels) |

Tokens are stored in the database. Create them in the Web UI and use them with the CLI.

## Quick start

### 1. Start everything (“aws-local”)

```bash
npm run env:aws-local
# Or: docker compose -f docker-compose.aws-local.yml up -d --build
```

First run builds the image (server + API + frontend) and starts Postgres, then the three app services. Wait ~30–60s for the first build.

### 2. Open the app

- **Web UI:** http://localhost:5173  
  Sign up or log in (default admin: `admin@ducky.wtf` / `admin123` if you use the seed data).
- **API:** http://localhost:3002/health  
- **Tunnel server:** http://localhost:3000/metrics  

### 3. Create a token and run a tunnel

1. In the Web UI, go to **Auth Tokens** and create a token. Copy the token value.
2. Start the app you want to expose (e.g. a dev server on port 8080).
3. Build the CLI once, then start a tunnel:

   ```bash
   npm run build:cli
   node packages/cli/dist/index.js http 8080 \
     --authtoken YOUR_TOKEN_FROM_UI \
     --server-url ws://localhost:4000
   ```

4. Open the printed URL **with port 3000** in a browser: `http://<id>.localhost:3000` (so the request hits the tunnel server).

To get a **public URL** (internet), see [Dogfooding: get a public URL](#dogfooding-get-a-public-url).

## Commands reference

| Goal | Command |
|------|--------|
| Start full stack (background) | `npm run env:aws-local` |
| Start full stack (foreground) | `docker compose -f docker-compose.aws-local.yml up --build` |
| Stop | `npm run env:aws-local:down` |
| Logs | `docker compose -f docker-compose.aws-local.yml logs -f` |
| Tunnel to port 8080 | `node packages/cli/dist/index.js http 8080 --authtoken <token> --server-url ws://localhost:4000` |

## Overriding config

- **Tunnel domain:** `TUNNEL_DOMAIN=tunnel.local` so tunnel URLs use that instead of `localhost`.
- **JWT secret (API):** `JWT_SECRET=your-secret` when starting compose.

Example:

```bash
TUNNEL_DOMAIN=tunnel.local docker compose -f docker-compose.aws-local.yml up -d --build
```

## How this relates to AWS

- **AWS:** Same logical stack (DB → RDS, tunnel server → ECS, API → ECS or Lambda, UI → S3/CloudFront). Tokens in Secrets Manager or DB; tunnel server uses same ports behind an ALB.
- **aws-local:** Same stack in Docker on your machine. Postgres instead of RDS; all services in one compose. Use it to test the full product and dogfood the tunnel.

For deploying to real AWS, see [AWS_DEPLOYMENT.md](AWS_DEPLOYMENT.md) and [AWS_LOCAL_TESTING.md](AWS_LOCAL_TESTING.md).

## Dogfooding: get a public URL

To expose your local app to the **internet** using ducky, the tunnel server must be reachable at a public hostname.

### Option A: Use your deployed ducky (recommended)

If ducky is running on AWS (e.g. **staging** or **production**):

1. Deploy ducky (see [AWS_LOCAL_TESTING.md](AWS_LOCAL_TESTING.md) or [AWS_DEPLOYMENT.md](AWS_DEPLOYMENT.md)).
2. Get the WebSocket endpoint, e.g. `terraform output -raw tunnel_endpoint` → `wss://staging.ducky.wtf:4000`.
3. Create a token in that environment (Secrets Manager or DB).
4. Run the CLI from your machine:

   ```bash
   node packages/cli/dist/index.js http 8080 \
     --authtoken YOUR_STAGING_TOKEN \
     --server-url wss://staging.ducky.wtf
   ```

   The Public URL will be like `https://<id>.staging.ducky.wtf` and will work from the internet.

### Option B: Expose local ducky with Cloudflare Tunnel

To use the **local** aws-local stack from the internet, expose ports 3000 and 4000 with two [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/) quick tunnels. Set `TUNNEL_DOMAIN` to the HTTP tunnel hostname and use the WebSocket tunnel hostname in `--server-url wss://...`. See the previous version of this doc or the [Cloudflare Tunnel docs](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/) for the exact steps.

## Troubleshooting

**`ECONNREFUSED` on port 4000** — Stack not up yet. Run `npm run env:aws-local`, wait for the build and health checks (~30–60s on first run), then try the CLI again.

**Tunnel not found / invalid token** — Use a token created in the Web UI (Auth Tokens), not a hardcoded value. Ensure you’re logged in and the token is active.

**Web UI or API not loading** — Check that all four containers are running: `docker compose -f docker-compose.aws-local.yml ps`. If the API or web container exits, check logs: `docker compose -f docker-compose.aws-local.yml logs ducky-api ducky-web`.

**Access your app through the tunnel (locally)** — Use **port 3000** in the URL so the request hits the tunnel server: `http://<id>.localhost:3000` in the browser, or `curl http://<id>.localhost:3000/`.

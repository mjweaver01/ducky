<img src="packages/web-frontend/public/duck.svg" alt="duck" width="200">

# ducky

**Expose your local server to the internet in seconds.**

```bash
npm install -g @ducky/cli
ducky http 3000
# → https://abc123.ducky.wtf
```

---

## Using ducky.wtf

### 1. Install the CLI

```bash
npm install -g @ducky/cli
```

### 2. Start tunneling immediately (anonymous)

```bash
ducky http 3000
# → https://abc123.ducky.wtf (random URL each time)
```

No signup required! Just run it.

### 3. Login to keep your tunnels (optional)

```bash
ducky login
# Enter your email → click magic link → done!
```

### 4. Check your status

```bash
ducky status
```

**Benefits of logging in:**
- **Pro/Enterprise**: Get a static URL that never changes
- Keep tunnel history in your dashboard
- Manage multiple devices/tokens
- Access usage stats and analytics

### Plans

- **Free (Anonymous or Logged In)**: New random URL each time you connect
- **Pro/Enterprise**: Static URL that never changes — perfect for webhooks and integrations

---

## CLI Reference

```
ducky http <port|address:port>  Start HTTP tunnel
ducky login                      Login with magic link
ducky status                     Show login status
ducky config <subcommand>        Manage configuration

Flags:
  --authtoken <token>   Auth token (overrides saved config)
  --url <url>           Request a specific tunnel URL
  --server-url <url>    Override the tunnel server WebSocket URL
  --config <path>       Path to a custom config file
```

### Config commands

```bash
ducky config auth <token>           # Save auth token manually
ducky config add-server-url <url>   # Save server URL
```

### Examples

```bash
# First time - just run it (anonymous)
ducky http 3000

# Login later
ducky login

# Custom URL
ducky http 3000 --url https://myapp.ducky.wtf

# Specific address
ducky http 192.168.1.2:8080
```

---

## How it works

```
Internet → ducky.wtf tunnel server → WebSocket → ducky CLI → localhost:3000
```

When you run `ducky http 3000`, the CLI opens a persistent outbound WebSocket connection to our servers. Incoming HTTP traffic is forwarded over that connection to your local port — nothing on your machine needs to be publicly reachable.

---

## Features

- Public HTTPS URLs with automatic TLS
- Wildcard subdomain routing (`*.ducky.wtf`)
- **Static tunnel URLs** (Pro/Enterprise) — same URL every time you connect
- Custom domain support
- Token-based auth, manageable from the dashboard
- Rate limiting and request size protection
- Tunnel history and request stats in the dashboard
- REST API for programmatic access — see [API docs](https://ducky.wtf/docs/api)

---

## Contributing

This repo contains the full ducky stack: tunnel server, web backend, React frontend, CLI, and shared types.

### Local dev setup

**Prerequisites**: Node ≥ 25, Docker (for Postgres)

```bash
git clone https://github.com/your-org/ducky-wtf.git
cd ducky-wtf
npm install
npm run build
npm run dev
```

See [docs/QUICKSTART.md](docs/QUICKSTART.md) for the full guide.

`npm run dev` starts Postgres in Docker plus all services with hot reload:

| Service | URL |
|---|---|
| Web UI | http://localhost:5173 |
| API | http://localhost:3002 |
| Tunnel server | http://localhost:3000 |

Default login: `admin@ducky.wtf` / `admin123`

Create an auth token in the dashboard, then start a tunnel locally:

```bash
ducky config auth YOUR_TOKEN
# default server URL is already ws://localhost:3000/_tunnel
ducky http 8080
```

### Package structure

```
packages/
  shared/        # Shared TypeScript types
  database/      # PostgreSQL client + repositories (pg)
  server/        # Tunnel server — HTTP proxy + WebSocket registration
  web-backend/   # Express REST API
  web-frontend/  # React + Vite SPA
  cli/           # CLI binary (ducky)
```

### Running tests

```bash
# Automated E2E (spins up server + CLI via Docker Compose)
./test-e2e.sh

# Build check
npm run build
```

Tests also run automatically on every PR via GitHub Actions.

### Opening a PR

1. Fork the repo and create a branch from `master`
2. Make your changes — `npm run build` must pass with zero errors
3. Run `./test-e2e.sh` locally before pushing
4. Open a PR against `master` — CI runs build, E2E tests, and Docker image builds automatically

For larger changes, open an issue first to discuss the approach.

### Docs

All developer docs live in [`docs/`](docs/):

| Doc | Contents |
|---|---|
| [QUICKSTART.md](docs/QUICKSTART.md) | Get started in 2 minutes |
| [DEV_COMMANDS.md](docs/DEV_COMMANDS.md) | All `npm run` commands and dev workflows |
| [FEATURES.md](docs/FEATURES.md) | Complete feature list and technical documentation |
| [GETTING_LIVE.md](docs/GETTING_LIVE.md) | Deploy to Railway (production) |
| [RAILWAY_SETUP_FROM_SCRATCH.md](docs/RAILWAY_SETUP_FROM_SCRATCH.md) | Recreate the three Railway services (dashboard only) |
| [TESTING.md](docs/TESTING.md) | Local and CI testing guide |
| [DOMAIN.md](docs/DOMAIN.md) | DNS and domain configuration |

CI and Railway auto-deploy: [.github/CICD.md](.github/CICD.md)

---

## License

MIT

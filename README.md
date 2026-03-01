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

### 2. Create an account and get a token

Sign up at **[ducky.wtf](https://ducky.wtf)**, then go to **Dashboard → Auth Tokens → Create Token**.

### 3. Save your token

```bash
ducky config auth YOUR_TOKEN
```

### 4. Start a tunnel

```bash
# Expose port 3000
ducky http 3000

# Expose a specific address
ducky http 192.168.1.2:8080

# Request a specific subdomain
ducky http 3000 --url https://myapp.ducky.wtf
```

You'll get a public HTTPS URL instantly — no ports to open, no router config, outbound connection only.

---

## CLI Reference

```
ducky http <port|address:port> [flags]

Flags:
  --authtoken <token>   Auth token (overrides saved config)
  --url <url>           Request a specific tunnel URL
  --server-url <url>    Override the tunnel server WebSocket URL
  --config <path>       Path to a custom config file
```

### Config commands

```bash
ducky config auth <token>                   # Save auth token
ducky config add-server-url <url>           # Save server URL
```

Config is stored at `~/.ducky/config.json`.

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
| [DEV_COMMANDS.md](docs/DEV_COMMANDS.md) | All `npm run` commands and dev workflows |
| [GETTING_LIVE.md](docs/GETTING_LIVE.md) | Deploy to Railway (production) |
| [TESTING.md](docs/TESTING.md) | Local and CI testing guide |
| [DOMAIN.md](docs/DOMAIN.md) | DNS and domain configuration |
| [QUICKSTART_WEB_UI.md](docs/QUICKSTART_WEB_UI.md) | Full local stack walkthrough |

CI/CD setup: [.github/CICD.md](.github/CICD.md)

---

## License

MIT

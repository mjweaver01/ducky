# ducky Documentation

All project documentation is located in this directory.

## Documentation Index

### Getting Started
- **[QUICKSTART_WEB_UI.md](QUICKSTART_WEB_UI.md)** — Quick start guide for local development with the full web UI
- **[DEV_COMMANDS.md](DEV_COMMANDS.md)** — Developer commands and workflows

### Docker Compose (when to use which)

| File | Use when |
|------|----------|
| **docker-compose.dev.yml** | **Development** — Postgres + tunnel server in Docker; run API and frontend locally (`npm run dev:web-backend`, `npm run dev:web-frontend`) for hot reload. |
| **docker-compose.yml** | **Tunnel server only** — no DB, no API, no UI. Env-based tokens. Handy for CI or minimal tunnel-only tests. |

### Deployment
- **[GETTING_LIVE.md](GETTING_LIVE.md)** — Step-by-step guide to deploy ducky to Railway (DNS, schema, env vars)
- **[DOMAIN.md](DOMAIN.md)** — DNS and domain configuration for ducky.wtf

### Testing
- **[TESTING.md](TESTING.md)** — Local and CI testing guide

### CI / deploy
- **[../.github/CICD.md](../.github/CICD.md)** — GitHub Actions CI; Railway auto-deploys when repo is connected

---

## Quick Links

**For Users:**
- [Get Started](QUICKSTART_WEB_UI.md)
- [Get ducky live (step-by-step)](GETTING_LIVE.md)
- [Testing Guide](TESTING.md)

**For Developers:**
- [Dev Commands](DEV_COMMANDS.md)
- [Testing Guide](TESTING.md)

**For DevOps:**
- [Get live on Railway](GETTING_LIVE.md)
- [CI and deploy](../.github/CICD.md)
- [Domain Setup](DOMAIN.md)

---

**Main Documentation**: See [../README.md](../README.md) for project overview.

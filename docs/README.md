# 🦆 ducky Documentation

All project documentation is located in this directory.

## 📚 Documentation Index

### Getting Started
- **[QUICKSTART_WEB_UI.md](QUICKSTART_WEB_UI.md)** - Quick start guide for the web UI
- **[DEV_COMMANDS.md](DEV_COMMANDS.md)** - Developer commands and workflows

### Docker Compose (when to use which)
| File | Use when |
|------|----------|
| **docker-compose.aws-local.yml** | Run the **full stack** like production (Postgres + tunnel server + API + Web UI). One command: `npm run env:aws-local`. See [DOCKER_AWS_LOCAL.md](DOCKER_AWS_LOCAL.md). |
| **docker-compose.dev.yml** | **Development**: Postgres + tunnel server in Docker; run API and frontend **locally** (`npm run dev:web-backend`, `npm run dev:web-frontend`) for hot reload. |
| **docker-compose.yml** | **Tunnel server only** (no DB, no API, no UI). Env-based tokens. Handy for CI or minimal tunnel-only tests. |

### Deployment
- **[AWS_DEPLOYMENT.md](AWS_DEPLOYMENT.md)** - Complete AWS production deployment guide
- **[AWS_LOCAL_TESTING.md](AWS_LOCAL_TESTING.md)** - Test AWS infrastructure locally
- **[DOCKER_AWS_LOCAL.md](DOCKER_AWS_LOCAL.md)** - Run Docker like AWS locally and use the tunnel (ngrok clone)
- **[DOMAIN.md](DOMAIN.md)** - Domain configuration for ducky.wtf

### Testing
- **[TESTING.md](TESTING.md)** - Comprehensive testing guide (local, AWS, staging, production)

### Implementation Details
- **[WEB_UI_COMPLETE.md](WEB_UI_COMPLETE.md)** - Complete web UI implementation details

### CI/CD
- **[../.github/CICD.md](../.github/CICD.md)** - GitHub Actions CI/CD setup

---

## Quick Links

**For Users:**
- 🚀 [Get Started](QUICKSTART_WEB_UI.md)
- 🌐 [Deploy to AWS](AWS_DEPLOYMENT.md)
- ✅ [Testing Guide](TESTING.md)

**For Developers:**
- 💻 [Dev Commands](DEV_COMMANDS.md)
- 🐳 [Docker like AWS locally](DOCKER_AWS_LOCAL.md) — run & use tunnel
- 🧪 [Local AWS Testing](AWS_LOCAL_TESTING.md)
- 🔧 [Web UI Details](WEB_UI_COMPLETE.md)

**For DevOps:**
- ☁️ [AWS Deployment](AWS_DEPLOYMENT.md)
- 🤖 [CI/CD Setup](../.github/CICD.md)
- 📊 [Domain Setup](DOMAIN.md)

---

**Main Documentation**: See [../README.md](../README.md) for project overview.

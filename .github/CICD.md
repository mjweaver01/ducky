# CI/CD

This project uses GitHub Actions for CI. Railway handles deployment automatically when the repo is connected.

## Workflow Overview

### On Pull Request

- Build and lint checks (`.github/workflows/pr-checks.yml`)
- Run E2E tests (`test-e2e.sh`)
- Test all three Docker image builds (tunnel-server, web-backend, web-frontend)

### On Push to Master

- **Build & Test** (`.github/workflows/ci.yml`) — Full build and E2E test suite
- **Railway** — If the repo is connected via **Deploy from GitHub**, Railway auto-deploys on push (and can wait for CI to finish). No token or `railway up` in Actions is required.

## Railway Auto-Deploy

1. In Railway, create or open your project and connect the GitHub repo (**Deploy from GitHub repo** or **Add GitHub Repo**).
2. Configure the three services (Dockerfile path, env vars, etc.) per [RAILWAY_SETUP_FROM_SCRATCH.md](../docs/RAILWAY_SETUP_FROM_SCRATCH.md) and [GETTING_LIVE.md](../docs/GETTING_LIVE.md).
3. Push to `master` — GitHub Actions runs CI; Railway builds and deploys from the same push. You can configure Railway to wait for CI to pass before deploying if desired.

## Usage

### After Merging to Master

```bash
git push origin master
# CI runs in GitHub Actions; Railway auto-deploys from the repo.
```

### Manual CI Trigger

**Actions** → **CI** → **Run workflow**

### Rollback

- **Revert and push:** `git revert HEAD && git push origin master`
- **Railway dashboard:** Open the service → **Deployments** → redeploy a previous build

## Monitoring

### Railway (logs, status)

If you use the Railway CLI locally with `railway link`:

```bash
railway status
railway logs --service <service-name>
```

### Health checks

```bash
curl https://api.ducky.wtf/health
curl https://tunnel.ducky.wtf/metrics
curl -I https://ducky.wtf
```

## Troubleshooting

### CI failed (build or tests)

- Check GitHub Actions logs for the failing step.
- Run locally: `npm ci && npm run build && ./test-e2e.sh`

### Railway not deploying after push

- In Railway, each service must have **Dockerfile path** and **Root directory** set correctly (see [RAILWAY_SETUP_FROM_SCRATCH.md](../docs/RAILWAY_SETUP_FROM_SCRATCH.md)).
- Check **Watch Paths** in each service: empty or broad patterns (e.g. `**`) so pushes trigger builds.
- In Railway dashboard → **Deployments** for that service, check for failed or cancelled builds.

---

**Status:** CI in GitHub Actions; deployment via Railway auto-deploy (no `railway up` in CI).

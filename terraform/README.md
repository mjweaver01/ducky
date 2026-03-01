# Terraform Deployment

Production-ready Terraform for the ducky tunnel server on AWS: ECS Fargate, HTTPS by default, optional RDS for UI-granted keys, and wss via NLB.

## Architecture

- **VPC** with public subnets in 2 AZs
- **ALB** – HTTPS (443) and HTTP→HTTPS redirect; forwards to ECS on port 3000
- **NLB** (optional) – TLS 443 for WebSocket so CLI can use `wss://tunnel.ducky.wtf` with no port
- **ECS Fargate** – tunnel server (HTTP 3000 + WebSocket 4000)
- **RDS Postgres** (optional) – when `use_database_auth = true`, auth tokens are from the DB (keys granted via UI; users use CLI with saved key)
- **Secrets Manager** – RDS password and (legacy) token list
- **ACM** – certificate for `tunnel_domain` and `*.tunnel_domain`
- **CloudWatch** – logs with configurable retention

## Prerequisites

1. AWS credentials configured
2. Terraform >= 1.0
3. Domain for tunnel URLs (e.g. `ducky.wtf`)
4. Docker image built and pushed (e.g. to ECR)

## Quick start

1. Copy and edit tfvars:

```bash
cp terraform.tfvars.example terraform.tfvars
# Edit: tunnel_domain, use_database_auth, database_* or valid_tokens, docker_image
```

2. For database auth, set the DB password (do not commit):

```bash
export TF_VAR_database_password="your-secure-password"
# Or: terraform apply -var="database_password=..."
```

3. Apply:

```bash
terraform init
terraform plan -var-file=environments/production.tfvars  # or your tfvars
terraform apply -var-file=environments/production.tfvars
```

4. Create DNS records from the `dns_records_needed` and `certificate_validation_records` outputs (see below).

5. If using database auth, run DB migrations against the RDS endpoint (see **Database migrations**).

## Auth modes

- **Database auth (production)** – `use_database_auth = true`  
  Users get keys from the Web UI; they save the key and use the CLI with it. RDS stores tokens; set `database_username` and `database_password`.

- **Legacy tokens** – `use_database_auth = false`  
  Set `valid_tokens` (comma-separated). Tokens are stored in Secrets Manager and synced to the app.

## DNS

After apply, create:

1. **ALB** – `tunnel_domain` and `*.tunnel_domain` → ALB DNS name (e.g. CNAME).
2. **NLB (if `tunnel_subdomain` is set)** – `tunnel_subdomain.tunnel_domain` → NLB DNS name (e.g. `tunnel.ducky.wtf` → NLB).
3. **ACM validation** – create the CNAME records from the `certificate_validation_records` output so the certificate issues.

## Database migrations

When `use_database_auth = true`, run your schema (e.g. `database/schema.sql`) once RDS is up:

```bash
# From terraform output
terraform output -raw rds_endpoint
# Then run migrations (e.g. psql or your migration tool) against that endpoint
# Use database_name, database_username, and the same password you set in Terraform
```

## Outputs

| Output | Description |
|--------|-------------|
| `alb_dns_name` | ALB DNS for CNAME (HTTPS) |
| `https_endpoint` | `https://<tunnel_domain>` |
| `tunnel_endpoint` | WebSocket URL for CLI (e.g. `wss://tunnel.ducky.wtf`) |
| `tunnel_nlb_dns_name` | NLB DNS when using wss subdomain |
| `certificate_validation_records` | DNS records for ACM validation |
| `rds_endpoint` | RDS endpoint (when using database auth) |
| `ecs_cluster_name`, `ecs_service_name` | ECS identifiers |

## Variables (main ones)

- `tunnel_domain` – Base domain (e.g. `ducky.wtf`).
- `tunnel_subdomain` – Subdomain for wss (e.g. `tunnel` → `wss://tunnel.ducky.wtf`). Leave `""` to use port 4000 only (no NLB).
- `use_database_auth` – Use RDS for tokens (UI-granted keys).
- `valid_tokens` – Legacy comma-separated tokens (required if `use_database_auth = false`).
- `database_username` / `database_password` – Required when `use_database_auth = true`.
- `docker_image` – Full image URI.
- `log_retention_days` – CloudWatch log retention (default 30).

See `variables.tf` and `terraform.tfvars.example` for the full set.

## Scaling

```bash
terraform apply -var="desired_count=3" -var-file=environments/production.tfvars
```

## Cost (rough, us-east-1)

- ALB: ~\$16/mo  
- NLB: ~\$16/mo (if used)  
- ECS Fargate (1 task, 0.25 vCPU, 0.5 GB): ~\$4.50/mo  
- RDS db.t3.micro: ~\$15/mo (if used)  
- Logs/data transfer: variable  

## Cleanup

```bash
terraform destroy -var-file=environments/production.tfvars
```

## Notes

- Assigned tunnel URLs use **HTTPS** when `TUNNEL_PROTOCOL=https` (set by this Terraform in production).
- CLI users should set the server URL to the `tunnel_endpoint` output (e.g. `ducky config add-server-url wss://tunnel.ducky.wtf`) and use a key from the UI.

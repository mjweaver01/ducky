aws_region    = "us-east-1"
project_name  = "ducky"
tunnel_domain = "ducky.wtf"
tunnel_subdomain = "tunnel"

# Production: keys granted via UI, stored in RDS
use_database_auth = true
database_username = "ducky_admin"
database_password = "CHANGE_ME_STRONG_PASSWORD" # use -var or TF_VAR, never commit

# Legacy tokens (ignored when use_database_auth = true)
valid_tokens = ""

# Resources
task_cpu       = "512"
task_memory    = "1024"
desired_count  = 2
log_retention_days = 30

# Docker image (override during apply: -var docker_image=...)
docker_image = "placeholder"

aws_region    = "us-east-1"
project_name  = "ducky-staging"
tunnel_domain = "staging.ducky.wtf"
tunnel_subdomain = "tunnel"

# Staging: database auth (same flow as prod)
use_database_auth = true
database_username = "ducky"
database_password = "CHANGE_ME_STAGING"

valid_tokens = ""

task_cpu       = "256"
task_memory    = "512"
desired_count  = 1
log_retention_days = 14

docker_image = "placeholder"

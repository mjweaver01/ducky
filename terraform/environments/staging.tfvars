aws_region    = "us-east-1"
project_name  = "ngrok-clone-staging"
tunnel_domain = "staging.tunnel.yourdomain.com"

# Use comma-separated tokens (will be stored in Secrets Manager)
valid_tokens_list = ["staging-token-1", "staging-token-2"]

# Smaller resources for staging
task_cpu      = "256"
task_memory   = "512"
desired_count = 1

# Docker image (override with actual image during apply)
docker_image = "placeholder"

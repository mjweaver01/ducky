aws_region    = "us-east-1"
project_name  = "ngrok-clone"
tunnel_domain = "tunnel.yourdomain.com"

# Use comma-separated tokens (will be stored in Secrets Manager)
valid_tokens_list = ["prod-token-1", "prod-token-2", "prod-token-3"]

# Production resources
task_cpu      = "512"
task_memory   = "1024"
desired_count = 2

# Docker image (override with actual image during apply)
docker_image = "placeholder"

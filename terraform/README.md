# Terraform Deployment

This directory contains Terraform configuration to deploy the ducky server to AWS using ECS Fargate.

## Architecture

- VPC with public subnets across 2 availability zones
- Application Load Balancer for HTTP traffic (port 80/443)
- ECS Fargate cluster running the tunnel server
- Security groups for ALB and ECS tasks
- CloudWatch logs for monitoring

## Prerequisites

1. AWS account and credentials configured
2. Docker image built and pushed to ECR (or Docker Hub)
3. Domain name for tunnel URLs (optional but recommended)
4. Terraform installed (>= 1.0)

## Setup

1. Copy the example tfvars file:

```bash
cp terraform.tfvars.example terraform.tfvars
```

2. Edit `terraform.tfvars` with your values:
   - `aws_region`: AWS region to deploy to
   - `tunnel_domain`: Your domain for tunnel URLs (e.g., tunnel.example.com)
   - `valid_tokens`: Comma-separated authentication tokens
   - `docker_image`: Your Docker image URI

3. Build and push Docker image:

```bash
# Build
docker build -t ducky:latest .

# Tag for ECR (replace with your ECR URI)
docker tag ducky:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/ducky:latest

# Push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/ducky:latest
```

4. Initialize Terraform:

```bash
terraform init
```

5. Review the plan:

```bash
terraform plan
```

6. Apply the configuration:

```bash
terraform apply
```

## DNS Configuration

After deployment, Terraform will output the ALB DNS name. You need to configure DNS:

1. For wildcard subdomain support, create a CNAME record:
   ```
   *.tunnel.example.com CNAME <alb_dns_name>
   tunnel.example.com   CNAME <alb_dns_name>
   ```

2. For HTTPS, you'll need to:
   - Add an ACM certificate in AWS
   - Create an HTTPS listener on the ALB
   - Update security groups if needed

## Outputs

After deployment, Terraform provides:
- `alb_dns_name`: Load balancer DNS name
- `http_endpoint`: HTTP endpoint URL
- `tunnel_endpoint`: WebSocket endpoint for CLI connections
- `ecs_cluster_name`: ECS cluster name
- `ecs_service_name`: ECS service name

## Scaling

To scale the number of ECS tasks:

```bash
terraform apply -var="desired_count=3"
```

## Cleanup

To destroy all resources:

```bash
terraform destroy
```

## Cost Estimation

Approximate monthly costs (us-east-1):
- ALB: ~$16.20
- ECS Fargate (1 task, 0.25 vCPU, 0.5 GB): ~$4.50
- Data transfer: varies by usage
- CloudWatch logs: ~$0.50

Total: ~$21/month for minimal setup

## Notes

- Port 4000 (WebSocket) is exposed directly through the ALB
- For production, consider adding:
  - HTTPS/TLS termination
  - CloudWatch alarms
  - Auto-scaling policies
  - WAF rules
  - Backup and disaster recovery

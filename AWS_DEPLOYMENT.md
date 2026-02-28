# AWS Deployment with HTTPS

Complete guide for deploying ngrok-clone to AWS with automatic HTTPS using ACM (AWS Certificate Manager).

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **Domain Name** (e.g., from Route 53, Namecheap, GoDaddy)
3. **AWS CLI** installed and configured
4. **Terraform** installed (>= 1.0)
5. **Docker** installed

## Architecture Overview

```
Internet → Route 53 → ALB (HTTPS) → ECS Fargate → ngrok-clone server
                           ↓
                    ACM Certificate (auto-renewal)
```

The deployment includes:
- Application Load Balancer with HTTPS termination
- ACM certificate with automatic renewal
- ECS Fargate for container orchestration
- VPC with public subnets across 2 AZs
- Security groups for proper access control

## Step-by-Step Deployment

### Step 1: Prepare Your Domain

You'll need a domain or subdomain (e.g., `tunnel.yourdomain.com`). This can be:
- Registered in Route 53
- Registered elsewhere (Namecheap, GoDaddy, etc.)

### Step 2: Build and Push Docker Image

```bash
cd /Users/michaelweaver/Websites/ngrok-clone

# Set your AWS account ID and region
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export AWS_REGION=us-east-1

# Create ECR repository
aws ecr create-repository \
  --repository-name ngrok-clone \
  --region $AWS_REGION

# Login to ECR
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Build Docker image
docker build -t ngrok-clone:latest .

# Tag for ECR
docker tag ngrok-clone:latest \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/ngrok-clone:latest

# Push to ECR
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/ngrok-clone:latest
```

### Step 3: Generate Authentication Tokens

```bash
# Generate secure tokens for user authentication
openssl rand -hex 32
```

Save these tokens securely - users will need them to authenticate their CLI.

### Step 4: Configure Terraform

```bash
cd terraform

# Copy example tfvars
cp terraform.tfvars.example terraform.tfvars

# Edit with your values
nano terraform.tfvars
```

Update `terraform.tfvars`:

```hcl
# AWS Configuration
aws_region = "us-east-1"

# Project Configuration
project_name = "ngrok-clone"

# Your domain (IMPORTANT: This must be a domain you own)
tunnel_domain = "tunnel.yourdomain.com"

# Authentication tokens (comma-separated)
# Generate with: openssl rand -hex 32
valid_tokens = "token1,token2,token3"

# Docker image from ECR
docker_image = "123456789012.dkr.ecr.us-east-1.amazonaws.com/ngrok-clone:latest"

# ECS Task Configuration
task_cpu    = "256"   # 0.25 vCPU
task_memory = "512"   # 512 MB

# Number of tasks to run
desired_count = 1
```

### Step 5: Deploy Infrastructure

```bash
# Initialize Terraform
terraform init

# Review the plan
terraform plan

# Deploy
terraform apply
```

Terraform will create all necessary resources including the ACM certificate.

### Step 6: Configure DNS Records

After `terraform apply` completes, you'll see outputs including DNS records you need to create.

#### Option A: Using Route 53 (Recommended)

If your domain is in Route 53, Terraform can handle DNS automatically. Add this to your `main.tf`:

```hcl
data "aws_route53_zone" "main" {
  name = var.tunnel_domain
}

resource "aws_route53_record" "main" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = var.tunnel_domain
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "wildcard" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "*.${var.tunnel_domain}"
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.main.zone_id
}

resource "aws_acm_certificate_validation" "main" {
  certificate_arn         = aws_acm_certificate.main.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}
```

Then run `terraform apply` again.

#### Option B: Manual DNS Configuration (External Registrar)

If your domain is registered elsewhere, create these records in your registrar's DNS panel:

1. **Main domain record**:
   ```
   Type: CNAME
   Name: tunnel.yourdomain.com
   Value: <alb_dns_name from terraform output>
   TTL: 300
   ```

2. **Wildcard record**:
   ```
   Type: CNAME
   Name: *.tunnel.yourdomain.com
   Value: <alb_dns_name from terraform output>
   TTL: 300
   ```

3. **ACM Validation records** (from `certificate_validation_records` output):
   ```
   Type: CNAME
   Name: <from terraform output>
   Value: <from terraform output>
   TTL: 300
   ```

**Important**: The ACM certificate won't be issued until you create the validation records!

### Step 7: Wait for Certificate Validation

```bash
# Check certificate status
aws acm describe-certificate \
  --certificate-arn <arn_from_terraform_output> \
  --region us-east-1 \
  --query 'Certificate.Status'

# Wait for "ISSUED" status (usually 5-30 minutes)
```

### Step 8: Verify Deployment

```bash
# Test HTTPS endpoint (should return 404 - no tunnel)
curl https://tunnel.yourdomain.com

# Check ECS service status
aws ecs describe-services \
  --cluster ngrok-clone-cluster \
  --services ngrok-clone-service \
  --region us-east-1
```

### Step 9: Configure CLI

```bash
# Install the CLI (or use from local build)
npm install -g @ngrok-clone/cli

# Add authentication token
ngrok-clone config add-authtoken <one_of_your_tokens>

# Configure server URL (use wss:// for secure WebSocket)
ngrok-clone config add-server-url wss://tunnel.yourdomain.com:4000

# Start a tunnel
ngrok-clone http 3000
```

You should get an HTTPS URL like: `https://abc123.tunnel.yourdomain.com`

### Step 10: Test End-to-End

```bash
# Terminal 1: Start local service
node test-server.js

# Terminal 2: Start tunnel
ngrok-clone http 8080

# Terminal 3: Test the public HTTPS URL
curl https://<your-assigned-url>.tunnel.yourdomain.com/test
```

## DNS Configuration Details

### Required DNS Records

| Type | Name | Value | Purpose |
|------|------|-------|---------|
| CNAME | tunnel.yourdomain.com | <alb-dns-name> | Main domain |
| CNAME | *.tunnel.yourdomain.com | <alb-dns-name> | Wildcard for tunnels |
| CNAME | <validation-name> | <validation-value> | ACM validation |

### TTL Recommendations

- Development: 300 seconds (5 minutes)
- Production: 3600 seconds (1 hour)

### Propagation Time

- Route 53: Usually < 1 minute
- External registrars: 5 minutes to 48 hours (typically 15-30 minutes)

Check propagation:
```bash
dig tunnel.yourdomain.com
nslookup abc123.tunnel.yourdomain.com
```

## Security Best Practices

### 1. Use Strong Authentication Tokens

```bash
# Generate cryptographically secure tokens
openssl rand -hex 32
```

Never reuse tokens across environments.

### 2. Restrict Security Groups

The Terraform configuration includes proper security groups:
- ALB: Allows 80/443 from internet
- ECS: Only allows 3000 from ALB, 4000 from internet
- No SSH access needed (use ECS Exec if required)

### 3. Enable CloudWatch Logs

Already configured in Terraform:
```hcl
log_configuration = {
  logDriver = "awslogs"
  options = {
    "awslogs-group"         = "/ecs/ngrok-clone"
    "awslogs-region"        = var.aws_region
    "awslogs-stream-prefix" = "ecs"
  }
}
```

View logs:
```bash
aws logs tail /ecs/ngrok-clone --follow
```

### 4. Use Least Privilege IAM

The ECS task and execution roles have minimal permissions. Review in `main.tf`.

### 5. Enable Container Insights

Already enabled:
```hcl
setting {
  name  = "containerInsights"
  value = "enabled"
}
```

### 6. Rotate Tokens Regularly

Update tokens:
```bash
# Generate new token
NEW_TOKEN=$(openssl rand -hex 32)

# Update in Terraform
terraform apply -var="valid_tokens=$NEW_TOKEN,old_token_1"

# Notify users to update their CLI
```

### 7. Use SSL/TLS Best Practices

The ALB uses:
- TLS 1.3 and 1.2 only
- Modern cipher suites (ELBSecurityPolicy-TLS13-1-2-2021-06)
- Automatic HTTP → HTTPS redirect

### 8. Add WAF (Optional)

```hcl
resource "aws_wafv2_web_acl" "main" {
  name  = "${var.project_name}-waf"
  scope = "REGIONAL"

  default_action {
    allow {}
  }

  rule {
    name     = "RateLimitRule"
    priority = 1

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "RateLimitRule"
      sampled_requests_enabled  = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name               = "${var.project_name}-waf"
    sampled_requests_enabled  = true
  }
}

resource "aws_wafv2_web_acl_association" "main" {
  resource_arn = aws_lb.main.arn
  web_acl_arn  = aws_wafv2_web_acl.main.arn
}
```

## Monitoring and Alerts

### CloudWatch Alarms

```bash
# High CPU usage
aws cloudwatch put-metric-alarm \
  --alarm-name ngrok-clone-high-cpu \
  --alarm-description "Alert when CPU exceeds 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2

# Unhealthy targets
aws cloudwatch put-metric-alarm \
  --alarm-name ngrok-clone-unhealthy-targets \
  --alarm-description "Alert when targets are unhealthy" \
  --metric-name UnHealthyHostCount \
  --namespace AWS/ApplicationELB \
  --statistic Average \
  --period 60 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --evaluation-periods 2
```

### Key Metrics to Monitor

1. **ALB Metrics**:
   - TargetResponseTime
   - RequestCount
   - HTTPCode_Target_4XX_Count
   - HTTPCode_Target_5XX_Count

2. **ECS Metrics**:
   - CPUUtilization
   - MemoryUtilization

3. **Custom Metrics** (add to your app):
   - Active tunnels count
   - Requests per tunnel
   - Tunnel connection failures

## Scaling

### Vertical Scaling

Update task resources in `terraform.tfvars`:

```hcl
task_cpu    = "512"   # 0.5 vCPU
task_memory = "1024"  # 1 GB
```

Then: `terraform apply`

### Horizontal Scaling

```hcl
# Manual scaling
desired_count = 3

# Auto-scaling (add to main.tf)
resource "aws_appautoscaling_target" "ecs" {
  max_capacity       = 10
  min_capacity       = 1
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.app.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "ecs_cpu" {
  name               = "${var.project_name}-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = 70.0
  }
}
```

## Cost Optimization

### Estimated Monthly Costs (us-east-1)

| Resource | Configuration | Monthly Cost |
|----------|--------------|--------------|
| ALB | Standard | ~$16.20 |
| ECS Fargate | 1 task (0.25 vCPU, 0.5 GB) | ~$10.80 |
| Data Transfer | 1 TB out | ~$90.00 |
| CloudWatch Logs | 10 GB | ~$5.00 |
| ACM Certificate | Wildcard | $0.00 (free) |
| **Total** | | **~$122/month** |

### Cost Reduction Tips

1. **Use Fargate Spot** (up to 70% savings):
   ```hcl
   capacity_provider_strategy {
     capacity_provider = "FARGATE_SPOT"
     weight           = 100
   }
   ```

2. **Optimize Log Retention**:
   ```hcl
   retention_in_days = 7  # or 1 for development
   ```

3. **Use CloudFront** (if global distribution needed)
4. **Right-size resources** based on actual usage
5. **Set up budget alerts**:
   ```bash
   aws budgets create-budget \
     --account-id $AWS_ACCOUNT_ID \
     --budget file://budget.json \
     --notifications-with-subscribers file://notifications.json
   ```

## Troubleshooting

### Certificate Not Validating

```bash
# Check validation records exist
dig <validation-name>

# Check certificate status
aws acm describe-certificate \
  --certificate-arn <arn> \
  --region us-east-1
```

**Solution**: Ensure DNS validation records are created correctly.

### ECS Tasks Failing

```bash
# Check task logs
aws logs tail /ecs/ngrok-clone --follow

# Check task status
aws ecs describe-tasks \
  --cluster ngrok-clone-cluster \
  --tasks <task-id>
```

### ALB Health Checks Failing

The health check expects a 404 response (no tunnel). If it's failing:

```bash
# Check target health
aws elbv2 describe-target-health \
  --target-group-arn <arn>
```

### WebSocket Connection Issues

Ensure security groups allow port 4000:
- Check ALB security group
- Check ECS task security group
- Verify NLB or ALB configuration for WebSocket

### DNS Not Resolving

```bash
# Check DNS propagation
dig tunnel.yourdomain.com
nslookup *.tunnel.yourdomain.com

# Check Route 53 records (if using Route 53)
aws route53 list-resource-record-sets \
  --hosted-zone-id <zone-id>
```

## Updating the Deployment

### Update Server Code

```bash
# Rebuild and push image
docker build -t ngrok-clone:latest .
docker tag ngrok-clone:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/ngrok-clone:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/ngrok-clone:latest

# Force new deployment
aws ecs update-service \
  --cluster ngrok-clone-cluster \
  --service ngrok-clone-service \
  --force-new-deployment
```

### Update Infrastructure

```bash
cd terraform
terraform plan
terraform apply
```

## Cleanup

To destroy all resources:

```bash
cd terraform
terraform destroy

# Delete ECR images
aws ecr batch-delete-image \
  --repository-name ngrok-clone \
  --image-ids imageTag=latest

# Delete ECR repository
aws ecr delete-repository \
  --repository-name ngrok-clone \
  --force
```

## Production Checklist

- [ ] Domain purchased and DNS configured
- [ ] Authentication tokens generated and secured
- [ ] Docker image built and pushed to ECR
- [ ] Terraform variables configured
- [ ] Infrastructure deployed
- [ ] ACM certificate validated (Status: ISSUED)
- [ ] DNS records created and propagated
- [ ] HTTPS endpoint accessible
- [ ] CLI configured and tested
- [ ] CloudWatch logs enabled
- [ ] CloudWatch alarms configured
- [ ] Auto-scaling configured (if needed)
- [ ] Budget alerts set up
- [ ] Backup plan for tokens/configuration
- [ ] Documentation for users created
- [ ] Monitoring dashboard set up

## Support

For issues:
1. Check CloudWatch logs: `aws logs tail /ecs/ngrok-clone --follow`
2. Review ECS service events
3. Verify DNS and certificate status
4. Check security group rules
5. Review the troubleshooting section above

## Next Steps

- Set up custom domains per user
- Add traffic inspection UI
- Implement usage quotas
- Add billing/metering
- Multi-region deployment
- CDN integration with CloudFront

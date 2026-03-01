# AWS Production Deployment

Complete guide for deploying ducky to AWS with production-grade security, observability, and automatic HTTPS.

## Architecture

```
Internet → Route 53 → ALB (HTTPS/ACM) → ECS Fargate → Server
                                            ↓
                                    Secrets Manager (tokens)
```

## Prerequisites

- AWS account
- Domain name (e.g., `tunnel.yourdomain.com`)
- AWS CLI configured
- Terraform >= 1.0
- Docker

## Quick Deploy

```bash
# 1. Build and push Docker image
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export AWS_REGION=us-east-1

aws ecr create-repository --repository-name ducky --region $AWS_REGION
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

docker build -t ducky:latest .
docker tag ducky:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/ducky:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/ducky:latest

# 2. Generate auth tokens
openssl rand -hex 32  # Generate one per user

# 3. Configure Terraform
cd terraform
cp terraform.tfvars.example terraform.tfvars
nano terraform.tfvars  # Edit: tunnel_domain, valid_tokens, docker_image

# 4. Deploy
terraform init
terraform apply

# 5. Configure DNS (from terraform output)
# Point tunnel.yourdomain.com and *.tunnel.yourdomain.com to ALB
# Add ACM validation CNAME records

# 6. Wait for ACM validation (~5-30 min)
aws acm describe-certificate --certificate-arn <from_output> --region $AWS_REGION

# 7. Test
curl https://tunnel.yourdomain.com  # Should return 404 (expected)
```

## Infrastructure Components

### Networking
- **VPC**: 10.0.0.0/16 with DNS enabled
- **Subnets**: 2 public subnets across AZs
- **Internet Gateway**: For public access
- **Security Groups**: ALB (80/443) and ECS (3000/4000)

### Compute
- **ECS Cluster**: Fargate with Container Insights
- **Task Definition**: 0.25 vCPU, 0.5 GB memory
- **Auto-scaling**: Configurable (default: 1 task)

### Load Balancing
- **ALB**: Application Load Balancer
- **Listeners**: HTTPS (443) and HTTP→HTTPS redirect (80)
- **Target Group**: Health check on port 3000

### Security
- **ACM Certificate**: Wildcard cert with auto-renewal
- **Secrets Manager**: Encrypted token storage with auto-refresh
- **IAM Roles**: Least-privilege for ECS tasks

### Observability
- **CloudWatch Logs**: `/ecs/ducky` (7-day retention)
- **Metrics**: Built-in + Container Insights
- **Structured Logging**: JSON logs with metadata

## Security Features

### Rate Limiting
- 1000 requests/minute per tunnel
- 100 concurrent requests per tunnel
- 5 tunnels max per token
- 10MB request size limit

Configure via environment:
```hcl
MAX_TUNNELS_PER_TOKEN      = "5"
MAX_CONCURRENT_REQUESTS    = "100"
RATE_LIMIT_MAX_REQUESTS    = "1000"
```

### Token Management

Tokens stored in AWS Secrets Manager:
- Encrypted at rest
- Auto-refresh every 5 minutes
- No redeployment needed to rotate

**Rotate tokens**:
```bash
aws secretsmanager update-secret \
  --secret-id ducky/valid-tokens \
  --secret-string '{"tokens":["new-token1","new-token2"]}'
```

## DNS Configuration

### Required Records

```
Type   Name                          Value
A      tunnel.yourdomain.com         <alb-dns-name>
CNAME  *.tunnel.yourdomain.com       <alb-dns-name>
CNAME  <acm-validation-name>         <acm-validation-value>
```

### Using Route 53

Add to `terraform/main.tf`:

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

## Observability

### Logs

```bash
# Tail logs
aws logs tail /ecs/ducky --follow

# Query logs
aws logs filter-log-events \
  --log-group-name /ecs/ducky \
  --filter-pattern "ERROR"
```

### Metrics

Automatic metrics every 5 minutes:
```
📊 Metrics Summary
Tunnels:   Active: 5, Total: 12
Requests:  Total: 1543, Succeeded: 1520, Failed: 23
Performance: Avg: 45ms, P95: 120ms, P99: 250ms
```

### Alarms

Add to Terraform:

```hcl
resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  alarm_name          = "ducky-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 300
  statistic           = "Average"
  threshold           = 80

  dimensions = {
    ClusterName = aws_ecs_cluster.main.name
    ServiceName = aws_ecs_service.app.name
  }
}

resource "aws_cloudwatch_metric_alarm" "unhealthy_targets" {
  alarm_name          = "ducky-unhealthy-targets"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "UnHealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Average"
  threshold           = 0

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
    TargetGroup  = aws_lb_target_group.app.arn_suffix
  }
}
```

## Scaling

### Vertical Scaling

Update `terraform.tfvars`:
```hcl
task_cpu    = "512"   # 0.5 vCPU
task_memory = "1024"  # 1 GB
```

### Horizontal Scaling

```hcl
desired_count = 3  # Manual scaling
```

**Auto-scaling** (add to `main.tf`):

```hcl
resource "aws_appautoscaling_target" "ecs" {
  max_capacity       = 10
  min_capacity       = 1
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.app.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "ecs_cpu" {
  name               = "cpu-scaling"
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

### Current Costs (us-east-1)

| Resource | Config | Monthly |
|----------|--------|---------|
| ALB | Standard | $16 |
| ECS Fargate | 1 task, 0.25 vCPU, 0.5 GB | $11 |
| CloudWatch Logs | 10 GB | $5 |
| Secrets Manager | 1 secret | $0.40 |
| ACM Certificate | Wildcard | $0 |
| Data Transfer | 100 GB | $9 |
| **Total** | | **$41/month** |

### Reduce Costs

**Use Fargate Spot** (70% savings):
```hcl
capacity_provider_strategy {
  capacity_provider = "FARGATE_SPOT"
  weight           = 100
}
```

**Reduce log retention**:
```hcl
retention_in_days = 1  # Instead of 7
```

**Right-size tasks**:
```hcl
task_cpu    = "256"   # Match actual usage
task_memory = "512"
```

## Updates

### Update Code

```bash
# Rebuild and push
docker build -t ducky:latest .
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/ducky:latest

# Force new deployment
aws ecs update-service \
  --cluster ducky-cluster \
  --service ducky-service \
  --force-new-deployment \
  --region $AWS_REGION
```

### Update Infrastructure

```bash
cd terraform
terraform plan
terraform apply
```

## Troubleshooting

### Certificate Not Validating

```bash
# Check status
aws acm describe-certificate --certificate-arn <arn> --region $AWS_REGION

# Verify DNS records
dig <validation-name>
```

**Fix**: Ensure DNS validation records are correct.

### ECS Tasks Failing

```bash
# Check logs
aws logs tail /ecs/ducky --follow

# Check task status
aws ecs describe-tasks \
  --cluster ducky-cluster \
  --tasks <task-id> \
  --region $AWS_REGION
```

**Common issues**:
- Image pull errors (check ECR permissions)
- Secrets Manager permissions (check IAM role)
- Invalid environment variables

### Tunnel Connection Failed

```bash
# Test WebSocket
wscat -c wss://tunnel.yourdomain.com:4000

# Check security groups
aws ec2 describe-security-groups --group-ids <ecs-sg-id>
```

**Fix**: Ensure port 4000 is open in ECS security group.

### High Costs

```bash
# Check data transfer
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApplicationELB \
  --metric-name ProcessedBytes \
  --start-time $(date -u -d '7 days ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 86400 \
  --statistics Sum
```

**Solutions**: Use Fargate Spot, reduce log retention, add CloudFront.

## Cleanup

```bash
cd terraform
terraform destroy

# Delete ECR images
aws ecr batch-delete-image \
  --repository-name ducky \
  --image-ids imageTag=latest \
  --region $AWS_REGION

# Delete repository
aws ecr delete-repository \
  --repository-name ducky \
  --force \
  --region $AWS_REGION
```

## Production Checklist

- [ ] Domain purchased and DNS configured
- [ ] Auth tokens generated (`openssl rand -hex 32`)
- [ ] Docker image built and pushed to ECR
- [ ] `terraform.tfvars` configured
- [ ] `terraform apply` completed successfully
- [ ] DNS records created (A/CNAME + ACM validation)
- [ ] ACM certificate status: ISSUED
- [ ] HTTPS endpoint accessible
- [ ] CLI configured and tested
- [ ] CloudWatch alarms configured
- [ ] Auto-scaling configured (if needed)
- [ ] Budget alerts set up
- [ ] Token rotation process documented
- [ ] User onboarding guide created

## Support

**Check health**:
```bash
curl https://tunnel.yourdomain.com  # Should return 404
```

**View metrics**:
```bash
aws logs tail /ecs/ducky --follow | grep "Metrics Summary"
```

**Rotate tokens**:
```bash
aws secretsmanager update-secret \
  --secret-id ducky/valid-tokens \
  --secret-string '{"tokens":["token1","token2"]}'
```
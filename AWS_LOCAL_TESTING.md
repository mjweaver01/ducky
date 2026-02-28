# AWS Infrastructure Local Testing

Test your complete AWS deployment from your local machine before pushing to production.

## Overview

This guide shows you how to:
1. Deploy the full AWS infrastructure from your local machine
2. Test the deployment end-to-end
3. Validate that everything works correctly
4. Destroy the test environment when done

**Note**: This creates REAL AWS resources and will incur AWS costs (typically < $5 for a few hours of testing).

## Prerequisites

### 1. Install Required Tools

```bash
# AWS CLI
brew install awscli

# Terraform
brew tap hashicorp/tap
brew install hashicorp/tap/terraform

# jq (for JSON parsing)
brew install jq

# Docker (if not already installed)
# Download from https://www.docker.com/products/docker-desktop
```

### 2. Configure AWS Credentials

```bash
aws configure
# Enter your:
# - AWS Access Key ID
# - AWS Secret Access Key  
# - Default region (e.g., us-east-1)
# - Default output format (json)

# Verify credentials
aws sts get-caller-identity
```

### 3. Prepare Domain (Optional for full testing)

For complete HTTPS testing, you'll need:
- A domain name you control
- Access to configure DNS records (Route 53 recommended)

For basic testing without HTTPS, you can skip this and use the ALB DNS directly.

## Quick Start

### Option 1: Automated Test Script (Recommended)

```bash
# Test with staging environment
./test-aws-local.sh staging

# Or test with production settings
./test-aws-local.sh production
```

The script will:
1. ✅ Check prerequisites
2. ✅ Build the application
3. ✅ Build and push Docker image to ECR
4. ✅ Deploy infrastructure with Terraform
5. ✅ Wait for services to stabilize
6. ✅ Run smoke tests
7. ✅ Test full tunnel flow

### Option 2: Manual Step-by-Step

For more control or learning purposes:

#### Step 1: Build the Application

```bash
npm install
npm run build
```

#### Step 2: Build Docker Image

```bash
# Build image
docker build -t ngrok-clone-test:latest .

# Tag for ECR
AWS_REGION=us-east-1
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
docker tag ngrok-clone-test:latest ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/ngrok-clone-staging:latest
```

#### Step 3: Create ECR Repository and Push Image

```bash
# Create ECR repository
aws ecr create-repository \
    --repository-name ngrok-clone-staging \
    --region us-east-1 \
    --image-scanning-configuration scanOnPush=true

# Login to ECR
aws ecr get-login-password --region us-east-1 | \
    docker login --username AWS --password-stdin ${ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com

# Push image
docker push ${ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/ngrok-clone-staging:latest
```

#### Step 4: Configure Terraform Variables

Edit `terraform/environments/staging.tfvars`:

```hcl
aws_region    = "us-east-1"
project_name  = "ngrok-clone-staging"
tunnel_domain = "staging.tunnel.yourdomain.com"  # Change to your domain

valid_tokens_list = ["test-token-1", "test-token-2"]

task_cpu      = "256"
task_memory   = "512"
desired_count = 1

docker_image = "${ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/ngrok-clone-staging:latest"
```

#### Step 5: Deploy Infrastructure

```bash
cd terraform

# Initialize Terraform
terraform init

# Plan deployment
terraform plan -var-file=environments/staging.tfvars

# Apply (creates AWS resources)
terraform apply -var-file=environments/staging.tfvars

# Get outputs
terraform output
```

#### Step 6: Wait for Services

```bash
# Wait for ECS service to become healthy
aws ecs wait services-stable \
    --cluster ngrok-clone-staging-cluster \
    --services ngrok-clone-staging-service \
    --region us-east-1

# Check service status
aws ecs describe-services \
    --cluster ngrok-clone-staging-cluster \
    --services ngrok-clone-staging-service \
    --region us-east-1
```

#### Step 7: Run Smoke Tests

```bash
# Get ALB DNS
ALB_DNS=$(terraform output -raw alb_dns_name)

# Test health endpoint (expect 404)
curl -I http://${ALB_DNS}/

# Test metrics endpoint
curl http://${ALB_DNS}/metrics | jq
```

#### Step 8: Test Full Tunnel Flow

```bash
# Get auth token from Secrets Manager
SECRET_ARN=$(terraform output -raw secret_arn)
TOKEN=$(aws secretsmanager get-secret-value \
    --secret-id $SECRET_ARN \
    --query SecretString \
    --output text | jq -r '.tokens[0]')

# Start local test server
cd ../
node -e "
const http = require('http');
http.createServer((req, res) => {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('Hello from local server!');
}).listen(8080, () => console.log('Server on :8080'));
" &
LOCAL_SERVER_PID=$!

# Get tunnel endpoint
TUNNEL_ENDPOINT=$(terraform output -raw tunnel_endpoint)
TUNNEL_HOST=$(echo $TUNNEL_ENDPOINT | sed 's|wss://||')

# Start CLI tunnel
node packages/cli/dist/index.js http 8080 \
    --token $TOKEN \
    --server $TUNNEL_HOST &
CLI_PID=$!

# Wait for tunnel
sleep 5

# Get tunnel URL from metrics
TUNNEL_URL=$(curl -s http://${ALB_DNS}/metrics | jq -r '.tunnels[0].url')
echo "Tunnel URL: $TUNNEL_URL"

# Test tunnel
curl -H "Host: ${TUNNEL_URL#http://}" http://${ALB_DNS}/

# Cleanup
kill $LOCAL_SERVER_PID $CLI_PID
```

## Validation Checklist

After deployment, verify:

- [ ] **ECS Tasks Running**: `aws ecs describe-services --cluster ngrok-clone-staging-cluster --services ngrok-clone-staging-service`
- [ ] **ALB Healthy**: `curl -I http://<alb-dns>/` returns 404
- [ ] **Metrics Endpoint**: `curl http://<alb-dns>/metrics` returns JSON
- [ ] **Secrets Manager**: `aws secretsmanager get-secret-value --secret-id <arn>` returns tokens
- [ ] **Target Health**: Targets show as "healthy" in ALB console
- [ ] **CloudWatch Logs**: Logs appearing in `/ecs/ngrok-clone-staging`
- [ ] **Tunnel Connection**: CLI can connect via WebSocket
- [ ] **HTTP Forwarding**: Requests forwarded through tunnel successfully

## Monitoring

### View Logs

```bash
# Stream logs
aws logs tail /ecs/ngrok-clone-staging --follow

# Filter errors
aws logs tail /ecs/ngrok-clone-staging --filter-pattern "ERROR"

# Last hour
aws logs tail /ecs/ngrok-clone-staging --since 1h
```

### Check Service Health

```bash
# ECS service status
aws ecs describe-services \
    --cluster ngrok-clone-staging-cluster \
    --services ngrok-clone-staging-service \
    --query 'services[0].[status,runningCount,desiredCount,deployments]'

# Task details
aws ecs list-tasks \
    --cluster ngrok-clone-staging-cluster \
    --service-name ngrok-clone-staging-service

# Task health
aws ecs describe-tasks \
    --cluster ngrok-clone-staging-cluster \
    --tasks <task-arn>
```

### Check ALB Health

```bash
# Target group health
aws elbv2 describe-target-health \
    --target-group-arn <arn>

# ALB metrics
aws cloudwatch get-metric-statistics \
    --namespace AWS/ApplicationELB \
    --metric-name RequestCount \
    --dimensions Name=LoadBalancer,Value=<alb-name> \
    --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
    --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
    --period 300 \
    --statistics Sum
```

## Testing HTTPS (Optional)

To test HTTPS, you need to:

### 1. Configure DNS

```bash
# Get ACM certificate validation records
terraform output acm_validation_records

# Add CNAME records to your DNS (Route 53 example)
aws route53 change-resource-record-sets \
    --hosted-zone-id <your-zone-id> \
    --change-batch file://dns-records.json
```

### 2. Wait for Certificate Validation

```bash
# Check certificate status
aws acm describe-certificate \
    --certificate-arn $(terraform output -raw acm_certificate_arn) \
    --query 'Certificate.Status'

# Wait for ISSUED status (can take 5-30 minutes)
```

### 3. Point Domain to ALB

```bash
# Create A record (Route 53 example)
ALB_DNS=$(terraform output -raw alb_dns_name)
aws route53 change-resource-record-sets \
    --hosted-zone-id <your-zone-id> \
    --change-batch "{
        \"Changes\": [{
            \"Action\": \"UPSERT\",
            \"ResourceRecordSet\": {
                \"Name\": \"staging.tunnel.yourdomain.com\",
                \"Type\": \"CNAME\",
                \"TTL\": 300,
                \"ResourceRecords\": [{\"Value\": \"$ALB_DNS\"}]
            }
        }]
    }"
```

### 4. Test HTTPS

```bash
# Test HTTPS endpoint
curl -I https://staging.tunnel.yourdomain.com/

# Test with CLI
node packages/cli/dist/index.js http 8080 \
    --token <token> \
    --server staging.tunnel.yourdomain.com
```

## Troubleshooting

### Issue: ECS Tasks Not Starting

```bash
# Check task definition
aws ecs describe-task-definition \
    --task-definition ngrok-clone-staging-task

# Check task failures
aws ecs describe-tasks \
    --cluster ngrok-clone-staging-cluster \
    --tasks <task-arn> \
    --query 'tasks[0].[stoppedReason,containers[0].reason]'

# Check logs
aws logs tail /ecs/ngrok-clone-staging --since 10m
```

**Common causes**:
- Docker image not found in ECR
- IAM role lacks permissions
- Invalid environment variables
- Task memory/CPU too low

### Issue: ALB Returns 503

```bash
# Check target health
aws elbv2 describe-target-health \
    --target-group-arn <arn>

# Check security groups
aws ec2 describe-security-groups \
    --group-ids <sg-id>
```

**Common causes**:
- No healthy targets
- Security group blocking traffic
- Health check failing
- Tasks not registered with target group

### Issue: CLI Can't Connect

```bash
# Test WebSocket connectivity
curl -I http://<alb-dns>/ \
    -H "Upgrade: websocket" \
    -H "Connection: Upgrade"

# Check ALB listeners
aws elbv2 describe-listeners \
    --load-balancer-arn <arn>
```

**Common causes**:
- WebSocket upgrade not working
- Authentication token invalid
- ALB not routing WebSocket traffic
- Security group blocking port 3001

### Issue: Terraform Apply Fails

```bash
# Check state
terraform state list

# Validate configuration
terraform validate

# Check AWS quotas
aws service-quotas list-service-quotas \
    --service-code ecs
```

**Common causes**:
- AWS quota exceeded (ECS tasks, ALB rules)
- Invalid variable values
- Missing IAM permissions
- State file corrupted

## Cost Estimation

Hourly costs for staging environment:
- ECS Fargate: ~$0.02/hour (256 CPU, 512 MB)
- ALB: ~$0.03/hour
- ECR: ~$0.00 (first GB free)
- Secrets Manager: ~$0.05/month (prorated)
- CloudWatch Logs: ~$0.00 (first 5 GB free)

**Total**: ~$0.05/hour or ~$1.20 for 24 hours

## Cleanup

### Automated Cleanup

```bash
# Quick destroy
cd terraform
terraform destroy -var-file=environments/staging.tfvars -auto-approve

# Delete ECR images
aws ecr batch-delete-image \
    --repository-name ngrok-clone-staging \
    --image-ids imageTag=latest

# Delete ECR repository
aws ecr delete-repository \
    --repository-name ngrok-clone-staging \
    --force
```

### Manual Cleanup (if automated fails)

```bash
# 1. Delete ECS service
aws ecs update-service \
    --cluster ngrok-clone-staging-cluster \
    --service ngrok-clone-staging-service \
    --desired-count 0

aws ecs delete-service \
    --cluster ngrok-clone-staging-cluster \
    --service ngrok-clone-staging-service \
    --force

# 2. Delete ALB
aws elbv2 delete-load-balancer --load-balancer-arn <arn>

# 3. Delete target groups
aws elbv2 delete-target-group --target-group-arn <arn>

# 4. Delete ECS cluster
aws ecs delete-cluster --cluster ngrok-clone-staging-cluster

# 5. Run Terraform destroy
terraform destroy -var-file=environments/staging.tfvars
```

## Best Practices

### 1. Use Separate Environments

- **Staging**: For testing changes before production
- **Production**: For live traffic
- Different AWS accounts (recommended) or separate regions

### 2. Tag Resources

All resources are tagged with:
- `Environment`: staging/production
- `Project`: ngrok-clone
- `ManagedBy`: terraform

### 3. Monitor Costs

```bash
# Check costs for last 7 days
aws ce get-cost-and-usage \
    --time-period Start=$(date -d '7 days ago' +%Y-%m-%d),End=$(date +%Y-%m-%d) \
    --granularity DAILY \
    --metrics BlendedCost \
    --filter file://cost-filter.json

# cost-filter.json
{
    "Tags": {
        "Key": "Project",
        "Values": ["ngrok-clone"]
    }
}
```

### 4. Limit Test Duration

Set a reminder to destroy staging after testing:
```bash
# Run test, then auto-destroy after 4 hours
./test-aws-local.sh staging && \
    (sleep 14400; cd terraform; terraform destroy -var-file=environments/staging.tfvars -auto-approve) &
```

### 5. Version Control Terraform State

For team collaboration, use S3 backend:

```hcl
# Add to terraform/main.tf
terraform {
  backend "s3" {
    bucket         = "your-terraform-state"
    key            = "ngrok-clone/staging/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-lock"
  }
}
```

## Integration with CI/CD

This local testing workflow prepares you for CI/CD:

1. **Local Test First**: Validate changes locally with `./test-aws-local.sh staging`
2. **Commit & Push**: Changes go to feature branch
3. **PR Checks**: Automated tests run (see `.github/workflows/pr-checks.yml`)
4. **Merge to Master**: Triggers production deployment
5. **Production Deploy**: Identical to local process, fully automated

The local testing script uses the same commands and flow as the GitHub Actions workflow, ensuring consistency.

## Next Steps

After successful local testing:

1. ✅ **Document any environment-specific configuration**
2. ✅ **Set up monitoring and alerts**
3. ✅ **Configure DNS for production domain**
4. ✅ **Set up S3 backend for Terraform state**
5. ✅ **Configure GitHub Actions** (see `.github/CICD.md`)
6. ✅ **Create production tokens in Secrets Manager**
7. ✅ **Enable CloudWatch alarms**
8. ✅ **Set up backup/disaster recovery**

---

**Status**: Ready for local AWS testing ✅

Run `./test-aws-local.sh staging` to deploy and test your infrastructure.

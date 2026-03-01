# CI/CD Setup

This project uses GitHub Actions for continuous deployment to AWS.

## Workflow Overview

### On Pull Request
- ✅ Build and lint checks
- ✅ Run E2E tests
- ✅ Validate Terraform
- ✅ Test Docker build

### On Push to Master
1. **Build & Test** - Run full E2E test suite
2. **Docker Build** - Build and push image to ECR with git SHA tag
3. **Terraform Deploy** - Apply infrastructure changes
4. **ECS Update** - Force new deployment with latest image
5. **Smoke Test** - Verify production health
6. **Notify** - Report deployment status

## Initial Setup

### 1. Create AWS IAM User for CI/CD

```bash
# Create IAM user
aws iam create-user --user-name github-actions-ducky

# Create policy (save as github-actions-policy.json)
cat > github-actions-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ecs:UpdateService",
        "ecs:DescribeServices",
        "ecs:DescribeTasks",
        "ecs:ListTasks"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "elasticloadbalancing:DescribeLoadBalancers",
        "elasticloadbalancing:DescribeTargetGroups",
        "elasticloadbalancing:DescribeTargetHealth"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::your-terraform-state-bucket",
        "arn:aws:s3:::your-terraform-state-bucket/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:DeleteItem"
      ],
      "Resource": "arn:aws:dynamodb:*:*:table/terraform-state-lock"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ec2:*",
        "iam:*",
        "logs:*",
        "acm:*",
        "secretsmanager:*"
      ],
      "Resource": "*"
    }
  ]
}
EOF

# Attach policy
aws iam put-user-policy \
  --user-name github-actions-ducky \
  --policy-name GithubActionsPolicy \
  --policy-document file://github-actions-policy.json

# Create access key
aws iam create-access-key --user-name github-actions-ducky

# Save the AccessKeyId and SecretAccessKey
```

### 2. Configure Terraform Backend

Add to `terraform/main.tf`:

```hcl
terraform {
  backend "s3" {
    bucket         = "your-terraform-state-bucket"
    key            = "ducky/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}
```

Create S3 bucket and DynamoDB table:

```bash
# Create S3 bucket for state
aws s3api create-bucket \
  --bucket your-terraform-state-bucket \
  --region us-east-1

aws s3api put-bucket-versioning \
  --bucket your-terraform-state-bucket \
  --versioning-configuration Status=Enabled

aws s3api put-bucket-encryption \
  --bucket your-terraform-state-bucket \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# Create DynamoDB table for locking
aws dynamodb create-table \
  --table-name terraform-state-lock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

### 3. Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:

```
AWS_ACCESS_KEY_ID=<from step 1>
AWS_SECRET_ACCESS_KEY=<from step 1>
```

### 4. Configure Terraform Variables

Create `terraform/terraform.tfvars` (DO NOT commit this file):

```hcl
aws_region    = "us-east-1"
project_name  = "ducky"
tunnel_domain = "tunnel.yourdomain.com"
valid_tokens  = "token1,token2,token3"
docker_image  = "placeholder"  # Will be overridden by CI/CD

task_cpu      = "256"
task_memory   = "512"
desired_count = 1
```

Commit `terraform.tfvars.example` instead:

```bash
git add terraform/terraform.tfvars.example
git commit -m "Add terraform variables example"
```

### 5. Initial Manual Deploy

Before enabling CI/CD, do first deploy manually:

```bash
# Build and push initial image
docker build -t ducky:latest .
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account>.dkr.ecr.us-east-1.amazonaws.com
docker tag ducky:latest <account>.dkr.ecr.us-east-1.amazonaws.com/ducky:latest
docker push <account>.dkr.ecr.us-east-1.amazonaws.com/ducky:latest

# Deploy infrastructure
cd terraform
terraform init
terraform apply
```

## Usage

### Automatic Deployment

```bash
# Make changes
git add .
git commit -m "Update feature"
git push origin master

# CI/CD automatically:
# 1. Runs tests
# 2. Builds Docker image
# 3. Deploys to AWS
# 4. Verifies health
```

### Manual Deployment Trigger

```bash
# Trigger deployment from GitHub UI:
# Actions → Deploy to Production → Run workflow
```

### View Deployment Status

```bash
# GitHub UI: Actions tab shows progress

# Or via CLI
gh run list --workflow=deploy.yml --limit 5
gh run view <run-id>
```

### Rollback

```bash
# Option 1: Revert commit and push
git revert HEAD
git push origin master

# Option 2: Manual ECS update to previous image
aws ecs update-service \
  --cluster ducky-cluster \
  --service ducky-service \
  --task-definition ducky-task:previous \
  --force-new-deployment

# Option 3: Terraform rollback
cd terraform
git checkout <previous-commit>
terraform apply
```

## Monitoring Deployments

### Check Deployment Status

```bash
# View ECS service
aws ecs describe-services \
  --cluster ducky-cluster \
  --services ducky-service

# Check running tasks
aws ecs list-tasks \
  --cluster ducky-cluster \
  --service-name ducky-service

# View logs
aws logs tail /ecs/ducky --follow
```

### Deployment Metrics

```bash
# Deployment history
aws ecs describe-services \
  --cluster ducky-cluster \
  --services ducky-service \
  --query 'services[0].deployments'

# CloudWatch alarms
aws cloudwatch describe-alarms \
  --alarm-name-prefix ducky
```

## Troubleshooting

### Deployment Failed at Build

```bash
# Check GitHub Actions logs
gh run view <run-id>

# Common fixes:
# - npm ci failed: Update package-lock.json
# - Build failed: Fix TypeScript errors
# - Tests failed: Fix failing tests
```

### Deployment Failed at Docker Push

```bash
# Check ECR permissions
aws ecr describe-repositories --repository-names ducky

# Recreate ECR repository if needed
aws ecr create-repository --repository-name ducky
```

### Deployment Failed at Terraform

```bash
# Check Terraform state
cd terraform
terraform state list

# Check for drift
terraform plan

# If state is corrupted
terraform init -reconfigure
```

### Deployment Failed at ECS Update

```bash
# Check ECS service events
aws ecs describe-services \
  --cluster ducky-cluster \
  --services ducky-service \
  --query 'services[0].events[0:5]'

# Check task failures
aws ecs describe-tasks \
  --cluster ducky-cluster \
  --tasks $(aws ecs list-tasks --cluster ducky-cluster --service-name ducky-service --query 'taskArns[0]' --output text)
```

### Smoke Test Failed

```bash
# Check ALB target health
aws elbv2 describe-target-health \
  --target-group-arn <target-group-arn>

# Check security groups
aws ec2 describe-security-groups \
  --group-ids <ecs-sg-id>

# Manual health check
curl -I http://<alb-dns>/
```

## Security Best Practices

1. **Use IAM roles with minimal permissions**
2. **Store all secrets in GitHub Secrets**
3. **Enable branch protection on master**
4. **Require PR reviews before merge**
5. **Enable Terraform state locking**
6. **Use encrypted S3 bucket for state**
7. **Rotate AWS access keys regularly**
8. **Monitor CloudWatch for anomalies**

## Cost Considerations

CI/CD adds minimal cost:
- GitHub Actions: Free for public repos, ~$0.008/minute for private
- ECR Storage: ~$0.10/GB/month
- S3 State Storage: ~$0.023/GB/month
- DynamoDB Lock Table: ~$0 (PAY_PER_REQUEST with low usage)

**Estimated CI/CD cost**: < $5/month

## Advanced Configuration

### Multi-Environment Deployment

See `terraform/environments/` for staging/production separation:

```bash
# Staging
terraform workspace new staging
terraform apply -var-file=staging.tfvars

# Production
terraform workspace new production
terraform apply -var-file=production.tfvars
```

### Blue-Green Deployment

Modify workflow to:
1. Create new task definition
2. Update service with new task
3. Wait for stability
4. Gradually shift traffic
5. Rollback if errors detected

### Canary Deployment

Use ALB weighted target groups:
1. Deploy new version to 10% of traffic
2. Monitor metrics
3. Gradually increase to 100%
4. Rollback if issues

## Maintenance

### Update Dependencies

```bash
# Update npm packages
npm update
git add package-lock.json
git commit -m "Update dependencies"
git push

# Update Terraform providers
cd terraform
terraform init -upgrade
```

### Cleanup Old Images

```bash
# Delete old ECR images (keep last 10)
aws ecr list-images \
  --repository-name ducky \
  --query 'imageIds[10:]' \
  --output json | \
  jq -r '.[] | .imageDigest' | \
  xargs -I {} aws ecr batch-delete-image \
    --repository-name ducky \
    --image-ids imageDigest={}
```

---

**Status**: CI/CD Configured ✅

Push to master branch to trigger automatic deployment to production.

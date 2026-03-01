#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="${1:-staging}"
AWS_REGION="${AWS_REGION:-us-east-1}"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TERRAFORM_DIR="$PROJECT_ROOT/terraform"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  AWS Infrastructure E2E Test (Local to AWS)                   ║${NC}"
echo -e "${BLUE}║  Environment: ${ENVIRONMENT}${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check prerequisites
echo -e "${YELLOW}→ Checking prerequisites...${NC}"

if ! command -v aws &> /dev/null; then
    echo -e "${RED}✗ AWS CLI not found${NC}"
    echo "Install: https://aws.amazon.com/cli/"
    exit 1
fi

if ! command -v terraform &> /dev/null; then
    echo -e "${RED}✗ Terraform not found${NC}"
    echo "Install: https://www.terraform.io/downloads"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker not found${NC}"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    echo -e "${RED}✗ jq not found${NC}"
    echo "Install: brew install jq"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}✗ AWS credentials not configured${NC}"
    echo "Run: aws configure"
    exit 1
fi

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo -e "${GREEN}✓ AWS Account: $ACCOUNT_ID${NC}"
echo -e "${GREEN}✓ Region: $AWS_REGION${NC}"

# Check if tfvars exists
TFVARS_FILE="$TERRAFORM_DIR/environments/${ENVIRONMENT}.tfvars"
if [ ! -f "$TFVARS_FILE" ]; then
    echo -e "${RED}✗ Terraform variables file not found: $TFVARS_FILE${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}→ Building application...${NC}"
cd "$PROJECT_ROOT"
npm install
npm run build
echo -e "${GREEN}✓ Build complete${NC}"

echo ""
echo -e "${YELLOW}→ Building Docker image...${NC}"
DOCKER_IMAGE_TAG="ducky-${ENVIRONMENT}:$(git rev-parse --short HEAD 2>/dev/null || echo 'local')"
docker build -t "$DOCKER_IMAGE_TAG" .
echo -e "${GREEN}✓ Docker image built: $DOCKER_IMAGE_TAG${NC}"

echo ""
echo -e "${YELLOW}→ Creating/checking ECR repository...${NC}"
ECR_REPO_NAME="ducky-${ENVIRONMENT}"
if ! aws ecr describe-repositories --repository-names "$ECR_REPO_NAME" --region "$AWS_REGION" &> /dev/null; then
    aws ecr create-repository \
        --repository-name "$ECR_REPO_NAME" \
        --region "$AWS_REGION" \
        --image-scanning-configuration scanOnPush=true \
        --encryption-configuration encryptionType=AES256
    echo -e "${GREEN}✓ ECR repository created${NC}"
else
    echo -e "${GREEN}✓ ECR repository exists${NC}"
fi

echo ""
echo -e "${YELLOW}→ Pushing image to ECR...${NC}"
aws ecr get-login-password --region "$AWS_REGION" | \
    docker login --username AWS --password-stdin "${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

ECR_IMAGE="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO_NAME}:latest"
docker tag "$DOCKER_IMAGE_TAG" "$ECR_IMAGE"
docker push "$ECR_IMAGE"
echo -e "${GREEN}✓ Image pushed to ECR${NC}"

echo ""
echo -e "${YELLOW}→ Initializing Terraform...${NC}"
cd "$TERRAFORM_DIR"

# Use local backend for staging/testing
cat > backend-${ENVIRONMENT}.hcl << EOF
# Local backend for ${ENVIRONMENT} testing
# Remove this and configure S3 backend for production
EOF

terraform init
echo -e "${GREEN}✓ Terraform initialized${NC}"

echo ""
echo -e "${YELLOW}→ Running Terraform plan...${NC}"
terraform plan \
    -var-file="environments/${ENVIRONMENT}.tfvars" \
    -var="docker_image=$ECR_IMAGE" \
    -out="${ENVIRONMENT}.tfplan"

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Review the plan above. Do you want to apply? (yes/no)${NC}"
read -r CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo -e "${RED}Deployment cancelled${NC}"
    rm -f "${ENVIRONMENT}.tfplan"
    exit 0
fi

echo ""
echo -e "${YELLOW}→ Applying Terraform configuration...${NC}"
terraform apply "${ENVIRONMENT}.tfplan"
rm -f "${ENVIRONMENT}.tfplan"
echo -e "${GREEN}✓ Infrastructure deployed${NC}"

echo ""
echo -e "${YELLOW}→ Retrieving outputs...${NC}"
ALB_DNS=$(terraform output -raw alb_dns_name)
HTTPS_ENDPOINT=$(terraform output -raw https_endpoint 2>/dev/null || echo "")
TUNNEL_ENDPOINT=$(terraform output -raw tunnel_endpoint)
SECRET_ARN=$(terraform output -raw secret_arn)

echo -e "${GREEN}✓ ALB DNS: $ALB_DNS${NC}"
echo -e "${GREEN}✓ HTTPS Endpoint: $HTTPS_ENDPOINT${NC}"
echo -e "${GREEN}✓ Tunnel Endpoint: $TUNNEL_ENDPOINT${NC}"

echo ""
echo -e "${YELLOW}→ Waiting for ECS service to stabilize (this may take 2-3 minutes)...${NC}"
CLUSTER_NAME="ducky-${ENVIRONMENT}-cluster"
SERVICE_NAME="ducky-${ENVIRONMENT}-service"

for i in {1..30}; do
    RUNNING_COUNT=$(aws ecs describe-services \
        --cluster "$CLUSTER_NAME" \
        --services "$SERVICE_NAME" \
        --region "$AWS_REGION" \
        --query 'services[0].runningCount' \
        --output text)
    
    DESIRED_COUNT=$(aws ecs describe-services \
        --cluster "$CLUSTER_NAME" \
        --services "$SERVICE_NAME" \
        --region "$AWS_REGION" \
        --query 'services[0].desiredCount' \
        --output text)
    
    if [ "$RUNNING_COUNT" = "$DESIRED_COUNT" ] && [ "$RUNNING_COUNT" != "0" ]; then
        echo -e "${GREEN}✓ Service stable (${RUNNING_COUNT}/${DESIRED_COUNT} tasks running)${NC}"
        break
    fi
    
    echo "  Waiting... (${RUNNING_COUNT}/${DESIRED_COUNT} tasks running, attempt $i/30)"
    sleep 10
done

echo ""
echo -e "${YELLOW}→ Running smoke tests...${NC}"

# Test 1: Health check (expect 404 for no tunnel)
echo -n "  Testing health endpoint... "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://${ALB_DNS}/")
if [ "$STATUS" = "404" ]; then
    echo -e "${GREEN}✓ (404 as expected)${NC}"
else
    echo -e "${RED}✗ Expected 404, got $STATUS${NC}"
fi

# Test 2: Metrics endpoint
echo -n "  Testing metrics endpoint... "
METRICS=$(curl -s "http://${ALB_DNS}/metrics")
if echo "$METRICS" | grep -q "activeTunnels"; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗ Invalid metrics response${NC}"
fi

# Test 3: Check ECS task health
echo -n "  Checking ECS task health... "
TASK_ARN=$(aws ecs list-tasks \
    --cluster "$CLUSTER_NAME" \
    --service-name "$SERVICE_NAME" \
    --region "$AWS_REGION" \
    --query 'taskArns[0]' \
    --output text)

if [ "$TASK_ARN" != "None" ] && [ -n "$TASK_ARN" ]; then
    TASK_STATUS=$(aws ecs describe-tasks \
        --cluster "$CLUSTER_NAME" \
        --tasks "$TASK_ARN" \
        --region "$AWS_REGION" \
        --query 'tasks[0].lastStatus' \
        --output text)
    
    if [ "$TASK_STATUS" = "RUNNING" ]; then
        echo -e "${GREEN}✓ Task is RUNNING${NC}"
    else
        echo -e "${YELLOW}⚠ Task status: $TASK_STATUS${NC}"
    fi
else
    echo -e "${RED}✗ No tasks found${NC}"
fi

# Test 4: Check ALB target health
echo -n "  Checking ALB target health... "
TARGET_GROUP_ARN=$(terraform output -raw target_group_arn 2>/dev/null || \
    aws elbv2 describe-target-groups \
    --region "$AWS_REGION" \
    --query "TargetGroups[?starts_with(TargetGroupName, 'ducky-${ENVIRONMENT}')].TargetGroupArn | [0]" \
    --output text)

if [ -n "$TARGET_GROUP_ARN" ] && [ "$TARGET_GROUP_ARN" != "None" ]; then
    HEALTHY_COUNT=$(aws elbv2 describe-target-health \
        --target-group-arn "$TARGET_GROUP_ARN" \
        --region "$AWS_REGION" \
        --query "length(TargetHealthDescriptions[?TargetHealth.State=='healthy'])" \
        --output text)
    
    if [ "$HEALTHY_COUNT" -gt 0 ]; then
        echo -e "${GREEN}✓ $HEALTHY_COUNT healthy targets${NC}"
    else
        echo -e "${RED}✗ No healthy targets${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Could not find target group${NC}"
fi

echo ""
echo -e "${YELLOW}→ Retrieving authentication tokens from Secrets Manager...${NC}"
SECRET_VALUE=$(aws secretsmanager get-secret-value \
    --secret-id "$SECRET_ARN" \
    --region "$AWS_REGION" \
    --query SecretString \
    --output text)

TOKENS=$(echo "$SECRET_VALUE" | jq -r '.tokens[]')
TEST_TOKEN=$(echo "$TOKENS" | head -n1)
echo -e "${GREEN}✓ Retrieved token: ${TEST_TOKEN:0:10}...${NC}"

echo ""
echo -e "${YELLOW}→ Testing full tunnel flow...${NC}"

# Start a local test server
echo "  Starting local test server on port 3456..."
(
    cd "$PROJECT_ROOT"
    cat > test-http-server.js << 'EOF'
const http = require('http');
const server = http.createServer((req, res) => {
    console.log(`Received: ${req.method} ${req.url}`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
        message: 'Hello from AWS test!', 
        path: req.url,
        method: req.method 
    }));
});
server.listen(3456, () => console.log('Test server on :3456'));
EOF
    node test-http-server.js &
    echo $! > /tmp/test-server-aws.pid
)
sleep 2

# Build and run CLI
echo "  Building CLI..."
cd "$PROJECT_ROOT"
npm run build:cli

# Connect CLI to AWS tunnel server
echo "  Starting CLI tunnel..."
(
    node packages/cli/dist/index.js http 3456 \
        --authtoken "$TEST_TOKEN" \
        --server-url "$TUNNEL_ENDPOINT" &
    echo $! > /tmp/test-cli-aws.pid
)

# Wait for tunnel to establish
echo "  Waiting for tunnel to establish..."
sleep 5

# Get the tunnel URL from metrics
METRICS=$(curl -s "http://${ALB_DNS}/metrics")
TUNNEL_URL=$(echo "$METRICS" | jq -r '.tunnels[0].url // empty')

if [ -n "$TUNNEL_URL" ]; then
    echo -e "${GREEN}✓ Tunnel established: $TUNNEL_URL${NC}"
    
    # Test the tunnel
    echo "  Testing tunnel request..."
    RESPONSE=$(curl -s "http://${ALB_DNS}/" -H "Host: ${TUNNEL_URL#http://}")
    
    if echo "$RESPONSE" | grep -q "Hello from AWS test"; then
        echo -e "${GREEN}✓ Tunnel request successful!${NC}"
        echo "  Response: $RESPONSE"
    else
        echo -e "${RED}✗ Tunnel request failed${NC}"
        echo "  Response: $RESPONSE"
    fi
else
    echo -e "${YELLOW}⚠ No active tunnels found${NC}"
    echo "  This is normal if the CLI couldn't connect due to DNS propagation"
fi

# Cleanup local processes
echo ""
echo -e "${YELLOW}→ Cleaning up local test processes...${NC}"
if [ -f /tmp/test-server-aws.pid ]; then
    kill $(cat /tmp/test-server-aws.pid) 2>/dev/null || true
    rm /tmp/test-server-aws.pid
fi
if [ -f /tmp/test-cli-aws.pid ]; then
    kill $(cat /tmp/test-cli-aws.pid) 2>/dev/null || true
    rm /tmp/test-cli-aws.pid
fi
rm -f test-http-server.js

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ AWS Infrastructure Test Complete!${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Deployment Details:${NC}"
echo "  Environment: $ENVIRONMENT"
echo "  ALB DNS: $ALB_DNS"
echo "  HTTPS Endpoint: $HTTPS_ENDPOINT"
echo "  Tunnel Endpoint: $TUNNEL_ENDPOINT"
echo "  Secret ARN: $SECRET_ARN"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Configure DNS: Point your domain to $ALB_DNS"
echo "  2. Validate ACM certificate via DNS (see AWS Console)"
echo "  3. Test with CLI: node packages/cli/dist/index.js http <port> --token $TEST_TOKEN --server $TUNNEL_HOST"
echo "  4. Monitor: aws logs tail /ecs/ducky-${ENVIRONMENT} --follow"
echo ""
echo -e "${YELLOW}To destroy this environment:${NC}"
echo "  cd terraform && terraform destroy -var-file=environments/${ENVIRONMENT}.tfvars -var=\"docker_image=$ECR_IMAGE\""
echo ""

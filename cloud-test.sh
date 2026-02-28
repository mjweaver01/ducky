#!/bin/bash

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

ENVIRONMENT="${1:-staging}"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  🦆 ducky - Cloud Mode (AWS Infrastructure Test)              ║${NC}"
echo -e "${BLUE}║  Environment: ${ENVIRONMENT}${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check prerequisites
echo -e "${YELLOW}→ Checking prerequisites...${NC}"

MISSING_DEPS=0

if ! command -v aws &> /dev/null; then
    echo -e "${RED}✗ AWS CLI not found${NC}"
    echo "  Install: https://aws.amazon.com/cli/"
    MISSING_DEPS=1
fi

if ! command -v terraform &> /dev/null; then
    echo -e "${RED}✗ Terraform not found${NC}"
    echo "  Install: https://www.terraform.io/downloads"
    MISSING_DEPS=1
fi

if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker not found${NC}"
    MISSING_DEPS=1
fi

if ! command -v jq &> /dev/null; then
    echo -e "${RED}✗ jq not found${NC}"
    echo "  Install: brew install jq"
    MISSING_DEPS=1
fi

if [ $MISSING_DEPS -eq 1 ]; then
    echo ""
    echo -e "${RED}Missing required dependencies. Please install them and try again.${NC}"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}✗ AWS credentials not configured${NC}"
    echo "  Run: aws configure"
    exit 1
fi

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION="${AWS_REGION:-us-east-1}"

echo -e "${GREEN}✓ AWS Account: $ACCOUNT_ID${NC}"
echo -e "${GREEN}✓ Region: $AWS_REGION${NC}"
echo ""

# Run the full AWS test
echo -e "${YELLOW}→ Running full AWS infrastructure test...${NC}"
echo ""
echo -e "${BLUE}This will:${NC}"
echo "  1. Build application"
echo "  2. Build and push Docker image to ECR"
echo "  3. Deploy infrastructure with Terraform"
echo "  4. Wait for services to stabilize"
echo "  5. Run smoke tests"
echo "  6. Test full tunnel flow"
echo ""
echo -e "${YELLOW}Press Ctrl+C to cancel, or wait 5 seconds to continue...${NC}"
sleep 5

./test-aws-local.sh "$ENVIRONMENT"

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Cloud test complete!${NC}"
echo ""
echo -e "${YELLOW}To destroy the infrastructure:${NC}"
echo "  cd terraform"
echo "  terraform destroy -var-file=environments/${ENVIRONMENT}.tfvars -auto-approve"
echo ""

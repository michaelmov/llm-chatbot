#!/usr/bin/env bash
set -euo pipefail

# Deploy script for the LLM Chatbot to AWS ECS
# Usage: ./scripts/deploy.sh
#
# Prerequisites:
#   - AWS CLI configured with appropriate credentials
#   - Docker running locally
#   - Terraform applied (infrastructure exists)
#   - Run from the terraform/ directory

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TERRAFORM_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_ROOT="$(cd "$TERRAFORM_DIR/.." && pwd)"

cd "$TERRAFORM_DIR"

echo "==> Reading Terraform outputs..."
AWS_REGION=$(aws configure get region 2>/dev/null || echo "us-east-1")
ALB_DNS=$(terraform output -raw alb_dns_name_raw)
ECR_BACKEND=$(terraform output -raw ecr_backend_url)
ECR_FRONTEND=$(terraform output -raw ecr_frontend_url)
CLUSTER_NAME=$(terraform output -raw ecs_cluster_name)
BACKEND_SERVICE=$(terraform output -raw backend_service_name)
FRONTEND_SERVICE=$(terraform output -raw frontend_service_name)
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "  ALB DNS:      $ALB_DNS"
echo "  ECR Backend:  $ECR_BACKEND"
echo "  ECR Frontend: $ECR_FRONTEND"
echo "  Cluster:      $CLUSTER_NAME"
echo ""

# Login to ECR
echo "==> Logging into ECR..."
aws ecr get-login-password --region "$AWS_REGION" | \
  docker login --username AWS --password-stdin "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"

# Build and push backend
echo ""
echo "==> Building backend Docker image..."
cd "$PROJECT_ROOT"
docker build --platform linux/amd64 -t "$ECR_BACKEND:latest" -f backend/Dockerfile .

echo "==> Pushing backend image to ECR..."
docker push "$ECR_BACKEND:latest"

# Build and push frontend (with ALB URL baked in)
echo ""
echo "==> Building frontend Docker image (with ALB URL: $ALB_DNS)..."
docker build \
  --platform linux/amd64 \
  -t "$ECR_FRONTEND:latest" \
  -f frontend/Dockerfile \
  --build-arg "NEXT_PUBLIC_API_URL=http://$ALB_DNS" \
  .

echo "==> Pushing frontend image to ECR..."
docker push "$ECR_FRONTEND:latest"

# Update ECS services to desired_count=1 and force new deployment
echo ""
echo "==> Starting ECS services..."
aws ecs update-service \
  --cluster "$CLUSTER_NAME" \
  --service "$BACKEND_SERVICE" \
  --desired-count 1 \
  --force-new-deployment \
  --region "$AWS_REGION" \
  --no-cli-pager > /dev/null

aws ecs update-service \
  --cluster "$CLUSTER_NAME" \
  --service "$FRONTEND_SERVICE" \
  --desired-count 1 \
  --force-new-deployment \
  --region "$AWS_REGION" \
  --no-cli-pager > /dev/null

echo ""
echo "==> Deployment initiated!"
echo ""
echo "Services are starting up. It may take 2-3 minutes for tasks to become healthy."
echo ""
echo "Monitor progress:"
echo "  ./scripts/status.sh"
echo ""
echo "Check backend health:"
echo "  curl http://$ALB_DNS/health"
echo ""
echo "Open the app:"
echo "  http://$ALB_DNS"
echo ""
echo "==> Don't forget to run the database migration!"
echo "  RDS endpoint: $(cd "$TERRAFORM_DIR" && terraform output -raw rds_hostname)"
echo ""
echo "  cd $PROJECT_ROOT/backend"
echo "  DATABASE_URL=\"postgresql://chatbot:YOUR_PASSWORD@$(cd "$TERRAFORM_DIR" && terraform output -raw rds_hostname):5432/chatbot\" npx drizzle-kit push"
echo ""
echo "  Note: You may need to temporarily allow your IP in the RDS security group."
echo "  Your public IP: $(curl -s ifconfig.me)"
echo "  RDS SG ID: Run 'aws ec2 describe-security-groups --filters Name=group-name,Values=chatbot-rds-sg --query SecurityGroups[0].GroupId --output text'"

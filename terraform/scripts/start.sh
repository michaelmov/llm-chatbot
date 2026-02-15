#!/usr/bin/env bash
set -euo pipefail

# Start all ECS services by scaling to desired_count=1
# Usage: ./scripts/start.sh
#
# Prerequisites:
#   - AWS CLI configured with appropriate credentials
#   - Terraform applied (infrastructure exists)
#   - Run from the terraform/ directory

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TERRAFORM_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$TERRAFORM_DIR"

echo "==> Reading Terraform outputs..."
AWS_REGION=$(aws configure get region 2>/dev/null || echo "us-east-1")
CLUSTER_NAME=$(terraform output -raw ecs_cluster_name)
BACKEND_SERVICE=$(terraform output -raw backend_service_name)
FRONTEND_SERVICE=$(terraform output -raw frontend_service_name)
REDIS_SERVICE=$(terraform output -raw redis_service_name)
ALB_DNS=$(terraform output -raw alb_dns_name_raw)

echo "  Cluster: $CLUSTER_NAME"
echo ""

echo "==> Scaling Redis to 1..."
aws ecs update-service \
  --cluster "$CLUSTER_NAME" \
  --service "$REDIS_SERVICE" \
  --desired-count 1 \
  --region "$AWS_REGION" \
  --no-cli-pager > /dev/null

echo "==> Scaling backend to 1..."
aws ecs update-service \
  --cluster "$CLUSTER_NAME" \
  --service "$BACKEND_SERVICE" \
  --desired-count 1 \
  --region "$AWS_REGION" \
  --no-cli-pager > /dev/null

echo "==> Scaling frontend to 1..."
aws ecs update-service \
  --cluster "$CLUSTER_NAME" \
  --service "$FRONTEND_SERVICE" \
  --desired-count 1 \
  --region "$AWS_REGION" \
  --no-cli-pager > /dev/null

echo ""
echo "==> All services scaling up!"
echo ""
echo "It may take ~60 seconds for tasks to become healthy."
echo ""
echo "Monitor progress:"
echo "  ./scripts/status.sh"
echo ""
echo "Open the app:"
echo "  http://$ALB_DNS"

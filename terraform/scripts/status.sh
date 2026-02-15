#!/usr/bin/env bash
set -euo pipefail

# Show status of all ECS services
# Usage: ./scripts/status.sh
#
# Prerequisites:
#   - AWS CLI configured with appropriate credentials
#   - Terraform applied (infrastructure exists)
#   - Run from the terraform/ directory

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TERRAFORM_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$TERRAFORM_DIR"

AWS_REGION=$(aws configure get region 2>/dev/null || echo "us-east-1")
CLUSTER_NAME=$(terraform output -raw ecs_cluster_name)
BACKEND_SERVICE=$(terraform output -raw backend_service_name)
FRONTEND_SERVICE=$(terraform output -raw frontend_service_name)

aws ecs describe-services \
  --cluster "$CLUSTER_NAME" \
  --services "$BACKEND_SERVICE" "$FRONTEND_SERVICE" \
  --region "$AWS_REGION" \
  --query 'services[].{Service:serviceName,Desired:desiredCount,Running:runningCount,Status:status}' \
  --output table

#!/usr/bin/env bash
set -euo pipefail

WORKSPACE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
FIRST_RUN=false

# Detect Codespaces environment
if [[ -n "${CODESPACE_NAME:-}" && -n "${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-}" ]]; then
  BACKEND_PUBLIC_URL="https://${CODESPACE_NAME}-3001.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
  FRONTEND_PUBLIC_URL="https://${CODESPACE_NAME}-3000.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
  echo "Codespaces detected: ${CODESPACE_NAME}"
else
  BACKEND_PUBLIC_URL="http://localhost:3001"
  FRONTEND_PUBLIC_URL="http://localhost:3000"
  echo "Local devcontainer detected"
fi

# Generate BETTER_AUTH_SECRET if not already set
if [[ -z "${BETTER_AUTH_SECRET:-}" ]]; then
  BETTER_AUTH_SECRET=$(openssl rand -base64 32)
fi

# --- backend/.env ---
cat > "${WORKSPACE_DIR}/backend/.env" <<EOF
# Server
PORT=3001

# LLM Provider
LLM_PROVIDER=anthropic

# Model Configuration
MODEL_NAME=claude-3-5-sonnet-latest
MODEL_TEMPERATURE=0.3
MODEL_MAX_TOKENS=4096

# API Keys (set via Codespaces secrets)
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-}
WEATHER_API_KEY=${WEATHER_API_KEY:-}

# Database (uses docker service hostname)
DATABASE_URL=postgresql://chatbot:chatbot_dev@postgres:5432/chatbot

# Authentication
BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}

# URLs
BACKEND_URL=${BACKEND_PUBLIC_URL}
FRONTEND_URL=${FRONTEND_PUBLIC_URL}

# Cookie settings for Codespaces (HTTPS proxy, cross-subdomain)
COOKIE_SECURE=false
EOF

echo "Generated backend/.env"

# --- frontend/.env.local ---
cat > "${WORKSPACE_DIR}/frontend/.env.local" <<EOF
# Browser-side API calls (goes through Codespaces port forwarding)
NEXT_PUBLIC_API_URL=${BACKEND_PUBLIC_URL}

# Server-side middleware calls (within the same container)
BACKEND_URL=http://localhost:3001
EOF

echo "Generated frontend/.env.local"

# --- First run: install dependencies and push schema ---
if [[ ! -d "${WORKSPACE_DIR}/node_modules" ]]; then
  FIRST_RUN=true
  echo ""
  echo "First run detected — installing dependencies..."
  cd "${WORKSPACE_DIR}"
  npm install --legacy-peer-deps
  echo ""
  echo "Pushing database schema..."
  npm run db:push
fi

# --- Summary ---
echo ""
echo "=============================="
echo "  Setup complete"
echo "=============================="
echo ""
echo "  Frontend : ${FRONTEND_PUBLIC_URL}"
echo "  Backend  : ${BACKEND_PUBLIC_URL}"
echo "  Database : postgresql://chatbot:chatbot_dev@postgres:5432/chatbot"
echo ""

if [[ -z "${ANTHROPIC_API_KEY:-}" ]]; then
  echo "  WARNING: ANTHROPIC_API_KEY is not set. Add it as a Codespaces secret."
fi
if [[ -z "${WEATHER_API_KEY:-}" ]]; then
  echo "  WARNING: WEATHER_API_KEY is not set. Add it as a Codespaces secret."
fi

if [[ "${FIRST_RUN}" == "true" ]]; then
  echo ""
  echo "  Run 'npm run dev' to start the application."
fi

echo ""

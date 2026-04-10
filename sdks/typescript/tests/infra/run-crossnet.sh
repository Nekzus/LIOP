#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"

echo "🔍 Validating docker-compose.yml..."
docker compose config --quiet

echo "🔨 Building LIOP test images..."
docker compose build

echo "🚀 Starting LIOP test mesh..."
docker compose up --abort-on-container-exit --exit-code-from test-runner
EXIT_CODE=$?

echo "🧹 Cleaning up..."
docker compose down -v --remove-orphans
exit $EXIT_CODE

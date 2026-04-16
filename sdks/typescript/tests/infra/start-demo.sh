#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"

docker compose config --quiet
docker compose build nexus vault bank oracle
docker compose up -d nexus vault bank oracle

echo "⏳ Waiting for mesh convergence..."
sleep 20

echo "═══════════════════════════════════════"
echo "  🌐 LIOP Demo Mesh — READY"
echo "═══════════════════════════════════════"
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "  Auto-Discovery URL: http://localhost:13000"
echo "  Next: run in PowerShell:"
echo "    .\tests\infra\setup-claude-desktop.ps1"
echo "═══════════════════════════════════════"

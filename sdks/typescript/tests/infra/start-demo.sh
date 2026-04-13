#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"

# ─── WSL2 DNS Auto-Repair ──────────────────────────────────────────────────
# WSL2 sometimes loses DNS resolution (uses [::1]:53 which fails).
# This block fixes it automatically before any network operations.
CURRENT_NS=$(grep '^nameserver' /etc/resolv.conf 2>/dev/null | head -1 | awk '{print $2}' || echo "")
if [[ "$CURRENT_NS" == "::1" || "$CURRENT_NS" == "127.0.0.1" || -z "$CURRENT_NS" ]]; then
  echo "🔧 Fixing WSL2 DNS (was: ${CURRENT_NS:-empty})..."
  echo "nameserver 8.8.8.8" | sudo tee /etc/resolv.conf > /dev/null
  echo "✅ DNS set to 8.8.8.8"
fi

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

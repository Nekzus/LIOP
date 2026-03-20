Write-Host "Iniciando NMP Industrial Demo..." -ForegroundColor Cyan

# Start The Vault in a new window
Start-Process "cmd.exe" -ArgumentList "/k title THE VAULT && npx tsx 1-the-vault.ts"
Write-Host "-> The Vault (Data Server) iniciado."
Start-Sleep -Seconds 3

# Start The Sentinel in a new window
Start-Process "cmd.exe" -ArgumentList "/k title THE SENTINEL && npx tsx 2-the-sentinel.ts"
Write-Host "-> The Sentinel (Gateway) iniciado."
Start-Sleep -Seconds 5

# Run the MCP Client in the current window
Write-Host "`nEjecutando MCP Client (Claude Desktop Simulator)..." -ForegroundColor Yellow
npx tsx 3-mcp-client.ts

Write-Host "`nDemo completada. Revisa las dos ventanas abiertas para ver el flujo P2P y gRPC." -ForegroundColor Green
Write-Host "Cierra las ventanas manualmente cuando termines." -ForegroundColor Gray

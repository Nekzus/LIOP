Write-Host "Starting NMP Industrial Demo..." -ForegroundColor Cyan

# Start The Vault in a new window
Start-Process "cmd.exe" -ArgumentList "/k title THE VAULT && npx tsx 1-the-vault.ts"
Write-Host "-> The Vault (Data Server) started."
Start-Sleep -Seconds 3

# Start The Sentinel in a new window
Start-Process "cmd.exe" -ArgumentList "/k title THE SENTINEL && npx tsx 2-the-sentinel.ts"
Write-Host "-> The Sentinel (Gateway) started."
Start-Sleep -Seconds 5

# Run the MCP Client in the current window
Write-Host "`nRunning MCP Client (Claude Desktop Simulator)..." -ForegroundColor Yellow
npx tsx 3-mcp-client.ts

Write-Host "`nDemo complete. Check the two open windows to see the P2P and gRPC flow." -ForegroundColor Green
Write-Host "Close the windows manually when finished." -ForegroundColor Gray

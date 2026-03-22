$workingDir = "z:\Nekzus-Solutions\Active-Projects\NMP-v1.0-alpha\sdks\typescript"
$demoDir = "$workingDir\examples\industrial-demo"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "🧹 NMP MESH CLEANUP & RESET TOOL" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# 1. Kill all Node processes
Write-Host "Stopping all Node.js processes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# 2. Clean up identity and multiaddr files
Write-Host "Cleaning up local mesh metadata..." -ForegroundColor Yellow
Remove-Item "$demoDir\*.multiaddr" -ErrorAction SilentlyContinue
Remove-Item "$demoDir\*-identity.json" -ErrorAction SilentlyContinue
Remove-Item "$workingDir\nexus.multiaddr" -ErrorAction SilentlyContinue
Remove-Item "$workingDir\vault.multiaddr" -ErrorAction SilentlyContinue
Remove-Item "$workingDir\bank.multiaddr" -ErrorAction SilentlyContinue
Remove-Item "$workingDir\oracle.multiaddr" -ErrorAction SilentlyContinue

# 3. Clean up P2P Persistent Identities (optional, but good for total reset)
Remove-Item "$HOME\.nmp\identity.json" -ErrorAction SilentlyContinue

# 4. Rebuild SDK to be sure
Write-Host "Rebuilding NMP SDK..." -ForegroundColor Yellow
cd $workingDir
pnpm run build

Write-Host "`n[CLEANUP COMPLETE] You can now run run-multi-node.ps1" -ForegroundColor Green

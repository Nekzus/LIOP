$demoPath = "z:\Nekzus-Solutions\Active-Projects\\NMP-v1.0-alpha\\sdks\typescript\examples\industrial-demo"
$workingDir = "z:\Nekzus-Solutions\Active-Projects\\NMP-v1.0-alpha\\sdks\typescript"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "🌌 Neural Mesh Protocol (LIOP) - Multi-Node Demo" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Rebuilding TypeScript and linking agent..." -ForegroundColor Yellow

cd $workingDir
pnpm run build

Write-Host "Starting The Nexus (Bootstrap Directory)..." -ForegroundColor Green
Start-Process -FilePath "cmd.exe" -ArgumentList "/k pnpm tsx examples/industrial-demo/0-the-nexus.ts" -WorkingDirectory $workingDir -WindowStyle Normal

Start-Sleep -Seconds 3

Write-Host "Starting The Vault (Medical Data)..." -ForegroundColor Green
Start-Process -FilePath "cmd.exe" -ArgumentList "/k pnpm tsx examples/industrial-demo/1-the-vault.ts" -WorkingDirectory $workingDir -WindowStyle Normal

Write-Host "Starting The Bank (Financial Data)..." -ForegroundColor Green
Start-Process -FilePath "cmd.exe" -ArgumentList "/k pnpm tsx examples/industrial-demo/2-the-bank.ts" -WorkingDirectory $workingDir -WindowStyle Normal

Write-Host "Starting The Oracle (Market Data)..." -ForegroundColor Green
Start-Process -FilePath "cmd.exe" -ArgumentList "/k pnpm tsx examples/industrial-demo/3-the-oracle.ts" -WorkingDirectory $workingDir -WindowStyle Normal

Write-Host "`n[Mesh Initialization Complete]" -ForegroundColor Cyan
Write-Host "You can now open Claude Desktop. Claude connect secretly via STDIO to LIOP-Agent,"
Write-Host "and the Agent will resolve tools via The Nexus to interact with the nodes."

$sdkDist = (Resolve-Path "$PSScriptRoot\..\..\dist\bin\agent.js").Path

$config = @{
    mcpServers = @{
        "liop-mesh" = @{
            command = "node"
            args = @($sdkDist)
            env = @{
                LIOP_NEXUS_URL = "http://localhost:13000"
                LIOP_LOG_LEVEL = "info"
            }
        }
    }
}

# Merge or create claude_desktop_config.json
$claudeConfig = "$env:APPDATA\Claude\claude_desktop_config.json"
$dir = Split-Path $claudeConfig -Parent
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }

if (Test-Path $claudeConfig) {
    $existing = Get-Content $claudeConfig -Raw | ConvertFrom-Json
    if (-not $existing.mcpServers) { 
        $existing | Add-Member -NotePropertyName mcpServers -NotePropertyValue @{} 
    }
    $existing.mcpServers | Add-Member -NotePropertyName "liop-mesh" `
        -NotePropertyValue $config.mcpServers."liop-mesh" -Force
    $existing | ConvertTo-Json -Depth 5 | Set-Content $claudeConfig -Encoding UTF8
} else {
    $config | ConvertTo-Json -Depth 5 | Set-Content $claudeConfig -Encoding UTF8
}

Write-Host ""
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  🧠 Claude Desktop → LIOP Mesh" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  SDK auto-discovery: LIOP_NEXUS_URL" -ForegroundColor DarkGray
Write-Host "  Config: $claudeConfig" -ForegroundColor DarkGray
Write-Host "  Reiniciá Claude Desktop para activar." -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan

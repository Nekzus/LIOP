# Get absolute paths reliably even if files don't exist yet
$agentJsRelative = "../../dist/bin/agent.js"

$sdkDist = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot $agentJsRelative)).Replace('\', '/')

# ─── Nexus URL Resolution (No WSL) ────────────────────────────────────────────
# Docker Desktop publishes ports on the host loopback by default.
# You can override the host/port if your setup differs.
$nexusHost = if ($env:LIOP_NEXUS_HOST) { $env:LIOP_NEXUS_HOST } else { "127.0.0.1" }
$nexusPort = if ($env:LIOP_NEXUS_PORT) { $env:LIOP_NEXUS_PORT } else { "13000" }
$nexusUrl = "http://${nexusHost}:${nexusPort}"

# ─── liop-mesh (Local SDK — Development Mode) ──────────────────────────────
# NODE_ENV=development enables Docker address mapping and port remapping.
$liopLocal = @{
    command = "node"
    args = @($sdkDist)
    env = @{
        NODE_ENV = "development"
        LIOP_NEXUS_URL = $nexusUrl
        LIOP_LOG_LEVEL = "info"
        LIOP_USE_PUBLISHED_GRPC_PORTS = "1"
    }
}

# ─── liop-mesh-npm (NPM Package — Production Mode) ─────────────────────────
# No NODE_ENV → production defaults. No Docker hacks. Pure Zero-Trust.
$liopNpm = @{
    command = "npx.cmd"
    args = @("-y", "@nekzus/liop@latest")
    env = @{
        LIOP_NEXUS_URL = $nexusUrl
        LIOP_LOG_LEVEL = "info"
        NODE_OPTIONS = "--use-system-ca"
    }
}

# Target file
$claudeConfig = "$env:APPDATA/Claude/claude_desktop_config.json"
$dir = Split-Path $claudeConfig -Parent
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }

# Smart Merge
$finalObj = @{ mcpServers = @{} }
if (Test-Path $claudeConfig) {
    try {
        $finalObj = Get-Content $claudeConfig -Raw | ConvertFrom-Json
        if (-not $finalObj.mcpServers) { $finalObj | Add-Member -NotePropertyName mcpServers -NotePropertyValue @{} }
    } catch {
        Write-Warning "Existing config corrupt or empty. Creating new one."
    }
}

# Update or insert both servers
foreach ($entry in @(@{ name = "liop-mesh"; config = $liopLocal }, @{ name = "liop-mesh-npm"; config = $liopNpm })) {
    if ($finalObj.mcpServers.PSObject.Properties[$entry.name]) {
        $finalObj.mcpServers.($entry.name) = $entry.config
    } else {
        $finalObj.mcpServers | Add-Member -NotePropertyName $entry.name -NotePropertyValue $entry.config
    }
}

# Save strictly as UTF8 NO BOM (Native .NET call)
$jsonString = $finalObj | ConvertTo-Json -Depth 10
[IO.File]::WriteAllText($claudeConfig, $jsonString)

Write-Host ""
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  🧠 Claude Desktop → LIOP Mesh" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Config: $claudeConfig" -ForegroundColor DarkGray
Write-Host "  LIOP_NEXUS_URL: $nexusUrl" -ForegroundColor DarkGray
Write-Host "───────────────────────────────────────────" -ForegroundColor DarkGray
Write-Host "  ✅ liop-mesh      (local SDK, dev mode)" -ForegroundColor Green
Write-Host "  ✅ liop-mesh-npm  (NPM package, prod mode)" -ForegroundColor Green
Write-Host "───────────────────────────────────────────" -ForegroundColor DarkGray
Write-Host "  Reinicia Claude Desktop para activar." -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan


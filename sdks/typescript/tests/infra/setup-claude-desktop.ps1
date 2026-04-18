# Get absolute paths reliably even if files don't exist yet
$agentJsRelative = "../../dist/bin/agent.js"
$beaconRelative = "nexus-data/nexus.multiaddr"

$sdkDist = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot $agentJsRelative)).Replace('\', '/')
$nexusBeacon = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot $beaconRelative)).Replace('\', '/')

# ─── Nexus URL Resolution (No WSL) ────────────────────────────────────────────
# Docker Desktop publishes ports on the host loopback by default.
# You can override the host/port if your setup differs.
$nexusHost = if ($env:LIOP_NEXUS_HOST) { $env:LIOP_NEXUS_HOST } else { "127.0.0.1" }
$nexusPort = if ($env:LIOP_NEXUS_PORT) { $env:LIOP_NEXUS_PORT } else { "13000" }
$nexusUrl = "http://${nexusHost}:${nexusPort}"

# Config template
$liopConfig = @{
    command = "node"
    args = @($sdkDist)
    env = @{
        LIOP_NEXUS_URL = $nexusUrl
        LIOP_BOOTSTRAP_FILE = $nexusBeacon
        LIOP_LOG_LEVEL = "info"
        LIOP_MCP_COMPACT_TOOL_DESCRIPTIONS = "1"
        LIOP_INITIAL_DISCOVERY_TIMEOUT_MS = "20000"
        LIOP_TOOLS_LIST_TAIL_POLL_MS = "8000"
        LIOP_USE_PUBLISHED_GRPC_PORTS = "1"
        LIOP_RESPECT_PLAIN_TOOL_PAYLOAD = "1"
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

# Update or insert only our server
if ($finalObj.mcpServers.PSObject.Properties["liop-mesh"]) {
    $finalObj.mcpServers."liop-mesh" = $liopConfig
} else {
    $finalObj.mcpServers | Add-Member -NotePropertyName "liop-mesh" -NotePropertyValue $liopConfig
}

# Save strictly as UTF8 NO BOM (Native .NET call)
$jsonString = $finalObj | ConvertTo-Json -Depth 10
[IO.File]::WriteAllText($claudeConfig, $jsonString)

Write-Host ""
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  🧠 Claude Desktop → LIOP Mesh" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  SDK auto-discovery: LIOP_NEXUS_URL" -ForegroundColor DarkGray
Write-Host "  Config: $claudeConfig" -ForegroundColor DarkGray
Write-Host "  Reinicia Claude Desktop para activar." -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan

# Get absolute paths reliably even if files don't exist yet
$agentJsRelative = "../../dist/bin/agent.js"
$beaconRelative = "nexus-data/nexus.multiaddr"

$sdkDist = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot $agentJsRelative)).Replace('\', '/')
$nexusBeacon = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot $beaconRelative)).Replace('\', '/')

# ─── Nexus URL Resolution ─────────────────────────────────────────────────────
# In WSL2 Mirror-mode, 127.0.0.1 may work for HTTP but fail for P2P (port 4001).
# We prioritize the REAL WSL2 network IP discovered via hostname -I.
$nexusHost = "127.0.0.1"

try {
    # Get all IPs from WSL and pick the first non-bridge one (usually the real eth0)
    $wslIps = wsl -- hostname -I
    $candidate = ($wslIps | Out-String).Split(' ')[0].Trim()
    if ($candidate -match '^\d{1,3}(\.\d{1,3}){3}$') {
        $nexusHost = $candidate
        Write-Host "  [WSL2] Real Network IP detected: $nexusHost" -ForegroundColor DarkCyan
    }
} catch {
    Write-Warning "Could not detect WSL2 IP. Falling back to 127.0.0.1."
}

# Overwrite if we have a vEthernet-WSL adapter (sometimes more reliable than hostname -I)
$vEthWsl = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object { $_.InterfaceAlias -match "WSL" -and $_.IPAddress -match '^172\.' } |
    Select-Object -First 1 -ExpandProperty IPAddress)

if ($vEthWsl) {
    if ($nexusHost -eq "127.0.0.1") {
        $nexusHost = $vEthWsl
        Write-Host "  [WSL2] vEthernet-WSL IP detected: $nexusHost" -ForegroundColor DarkCyan
    }
}

$nexusUrl = "http://${nexusHost}:13000"

# Config template
$liopConfig = @{
    command = "node"
    args = @($sdkDist)
    env = @{
        LIOP_NEXUS_URL = $nexusUrl
        LIOP_BOOTSTRAP_FILE = $nexusBeacon
        LIOP_LOG_LEVEL = "info"
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

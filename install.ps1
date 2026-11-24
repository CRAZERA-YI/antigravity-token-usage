#Requires -Version 5.1
param(
    [string]$TargetDir = (Join-Path $env:USERPROFILE ".gemini\config\plugins\token-usage")
)

$ErrorActionPreference = "Stop"

Write-Host "==> Installing Antigravity Token Usage Plugin..." -ForegroundColor Cyan

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Node.js (>= 18) is required. Please install Node.js first: https://nodejs.org/" -ForegroundColor Red
    exit 1
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$manifestPath = Join-Path $scriptDir "plugin.json"
$bundlePath = Join-Path $scriptDir "server\bundle.mjs"

if (-not (Test-Path $manifestPath) -or -not (Test-Path $bundlePath)) {
    Write-Host "[ERROR] Please run install.ps1 from the cloned repository root (missing plugin.json or server/bundle.mjs)." -ForegroundColor Red
    exit 1
}

if (Test-Path $TargetDir) {
    Write-Host "==> Updating existing installation at $TargetDir" -ForegroundColor Yellow
}

New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $TargetDir "server") -Force | Out-Null

$filesToCopy = @("plugin.json", "mcp_config.json", "README.md", "README.zh-CN.md", "LICENSE")
foreach ($file in $filesToCopy) {
    $src = Join-Path $scriptDir $file
    if (Test-Path $src) {
        Copy-Item -Path $src -Destination (Join-Path $TargetDir $file) -Force
    }
}

Copy-Item -Path $bundlePath -Destination (Join-Path $TargetDir "server\bundle.mjs") -Force

$dirsToCopy = @("assets", "skills", "ui")
foreach ($dir in $dirsToCopy) {
    $src = Join-Path $scriptDir $dir
    $dst = Join-Path $TargetDir $dir
    if (Test-Path $src) {
        New-Item -ItemType Directory -Path $dst -Force | Out-Null
        Copy-Item -Path (Join-Path $src "*") -Destination $dst -Recurse -Force
    }
}

Write-Host ""
Write-Host "[OK] Installed successfully to: $TargetDir" -ForegroundColor Green
Write-Host "     No npm install required - Antigravity discovers it automatically." -ForegroundColor Gray
Write-Host ""
Write-Host "How to use / 使用方法:" -ForegroundColor Cyan
Write-Host "  1. Open 'Token Usage' from Antigravity's left sidebar or side pane '+' menu."
Write-Host "     在 Antigravity 左侧边栏或右侧辅助面板 '+' 菜单中打开 Token Usage。"
Write-Host "  2. Or ask in chat: 'Open the Token Usage dashboard' / '打开 Token 用量面板'."

# KardexCare - NSSM Service Uninstall Script
# Run this script as Administrator

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "KardexCare - Service Uninstall" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

$projectRoot = "c:\KardexCare"
$nssmPath = Join-Path $projectRoot "nssm.exe"

if (-not (Test-Path $nssmPath)) {
    Write-Host "ERROR: NSSM not found at: $nssmPath" -ForegroundColor Red
    Write-Host "Cannot uninstall services without NSSM" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Stop and remove Backend Service
Write-Host "[1/2] Removing Backend Service..." -ForegroundColor Yellow
& $nssmPath stop KardexTicketManagementBackend 2>$null
Start-Sleep -Seconds 2
& $nssmPath remove KardexTicketManagementBackend confirm
Write-Host "✓ Backend service removed" -ForegroundColor Green
Write-Host ""

# Stop and remove Frontend Service
Write-Host "[2/2] Removing Frontend Service..." -ForegroundColor Yellow
& $nssmPath stop KardexTicketManagementFrontend 2>$null
Start-Sleep -Seconds 2
& $nssmPath remove KardexTicketManagementFrontend confirm
Write-Host "✓ Frontend service removed" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Uninstall Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Services have been removed from Windows." -ForegroundColor Green
Write-Host "The applications will no longer start automatically." -ForegroundColor Yellow
Write-Host ""
Write-Host "Note: Log files are preserved in:" -ForegroundColor Gray
Write-Host "  - backend\logs\" -ForegroundColor Gray
Write-Host "  - frontend\logs\" -ForegroundColor Gray
Write-Host ""

Read-Host "Press Enter to exit"

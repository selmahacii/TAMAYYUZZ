#!/usr/bin/env pwsh
# Tamayuz Platform - Local Development Startup Script
# Usage: .\start-dev.ps1
# Prerequisites: PostgreSQL 18 running, pnpm installed

Write-Host "=== Tamayuz Platform Local Dev ===" -ForegroundColor Cyan

# Set env vars
$env:DATABASE_URL = "postgresql://postgres@127.0.0.1:5432/tamayuz"
$env:SESSION_SECRET = "tamayuz-dev-secret-2026-local"
$env:NODE_ENV = "development"

# Start API backend (port 3001)
Write-Host "[1/2] Starting API Backend on http://localhost:3001..." -ForegroundColor Yellow
$backend = Start-Process -FilePath "powershell" -ArgumentList @(
  "-NoProfile", "-Command",
  '$env:DATABASE_URL="postgresql://postgres@127.0.0.1:5432/tamayuz"; $env:SESSION_SECRET="tamayuz-dev-secret-2026-local"; $env:PORT="3001"; $env:NODE_ENV="development"; node --enable-source-maps ".\artifacts\api-server\dist\index.mjs"'
) -PassThru -WorkingDirectory $PSScriptRoot

Start-Sleep -Seconds 3

# Verify backend
try {
  $health = Invoke-RestMethod -Uri "http://localhost:3001/api/healthz" -TimeoutSec 5
  if ($health.status -eq "ok") {
    Write-Host "[OK] API Backend is UP (status: ok)" -ForegroundColor Green
  }
} catch {
  Write-Host "[!] API Backend may still be starting..." -ForegroundColor Yellow
}

# Start Frontend (port 5173)
Write-Host "[2/2] Starting Frontend on http://localhost:5173..." -ForegroundColor Yellow
$frontend = Start-Process -FilePath "powershell" -ArgumentList @(
  "-NoProfile", "-Command",
  '$env:PORT="5173"; $env:BASE_PATH="/"; $env:NODE_ENV="development"; pnpm --filter "@workspace/smart-training" run dev'
) -PassThru -WorkingDirectory $PSScriptRoot

Write-Host ""
Write-Host "=== Platform Running ===" -ForegroundColor Green
Write-Host "  Frontend:  http://localhost:5173" -ForegroundColor Cyan
Write-Host "  API:       http://localhost:3001" -ForegroundColor Cyan
Write-Host "  Health:    http://localhost:3001/api/healthz" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Test Users:" -ForegroundColor Yellow
Write-Host "    Student: student@tamayuz.com / Student123!" -ForegroundColor White
Write-Host "    Coach:   coach@tamayuz.com / Coach123!" -ForegroundColor White
Write-Host "    Admin:   superadmin@tamayuz.com / Admin@2026!" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop both servers" -ForegroundColor Gray

try {
  while ($true) {
    Start-Sleep -Seconds 2
    $b_running = Get-Process -Id $backend.Id -ErrorAction SilentlyContinue
    $f_running = Get-Process -Id $frontend.Id -ErrorAction SilentlyContinue
    if (-not $b_running -and -not $f_running) {
      break
    }
  }
} finally {
  Write-Host "Stopping servers..." -ForegroundColor Gray
  Stop-Process -Id $backend.Id -ErrorAction SilentlyContinue
  Stop-Process -Id $frontend.Id -ErrorAction SilentlyContinue
  Write-Host "Servers stopped." -ForegroundColor Gray
}

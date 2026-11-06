#!/usr/bin/env pwsh
# Rebuild and restart the API server after code changes
Write-Host "Rebuilding API Server..." -ForegroundColor Yellow
pnpm --filter "@workspace/api-server" run build --ignore-scripts
if ($LASTEXITCODE -eq 0) {
  Write-Host "[✓] Build successful" -ForegroundColor Green
  Write-Host "Restart the API server (run start-dev.ps1) to apply changes." -ForegroundColor Cyan
} else {
  Write-Host "[FAIL] Build failed. Check errors above." -ForegroundColor Red
}

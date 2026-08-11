# Build + zip dist/ pour deploiement direct sur Hostinger public_html
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-and-zip-dist.ps1

$ErrorActionPreference = 'Stop'
$proj = Split-Path -Parent $PSScriptRoot
Set-Location $proj

python (Join-Path $PSScriptRoot 'build-and-zip-dist.py')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "Deploiement manuel Hostinger :" -ForegroundColor Cyan
Write-Host "  1. hPanel > Fichiers > public_html"
Write-Host "  2. Supprimer anciens assets/ et index.html"
Write-Host "  3. Extraire le zip virtuel-rt-dist-*.zip (contenu a la racine)"
Write-Host ""
Write-Host "Deploiement CI GitHub :" -ForegroundColor Cyan
Write-Host "  powershell -File scripts/set-github-secrets.ps1"
Write-Host "  git push origin master"

# Cree un zip Hostinger SANS supprimer node_modules (evite erreur OneDrive 0x80004005)
# Usage:
#   powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\user\OneDrive\Desktop\Virtuel.fr\Nouveau dossier\extracted\virtuel-st\scripts\zip-for-hostinger.ps1"

$ErrorActionPreference = 'Stop'

if (Test-Path (Join-Path $PSScriptRoot '..\package.json')) {
  $proj = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
} elseif (Test-Path (Join-Path (Get-Location) 'package.json')) {
  $proj = (Get-Location).Path
} else {
  throw "Impossible de trouver package.json (lance le script depuis le projet)."
}

$outDir = Split-Path $proj -Parent
$outZip = Join-Path $outDir 'virtuel-st-HOSTINGER.zip'
$stage = Join-Path $env:TEMP 'virtuel-st-hostinger-stage'

Write-Host "Projet : $proj"
Write-Host "Zip    : $outZip"

if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
New-Item -ItemType Directory -Path $stage | Out-Null

$excludeDirs = @(
  'node_modules', '.git', 'coverage', 'dist', '.e2e', 'storybook-static',
  '.husky', 'playwright-report', 'test-results', '.turbo', '.vite'
)

$xdArgs = foreach ($d in $excludeDirs) { @('/XD', $d) }
& robocopy $proj $stage /E /NFL /NDL /NJH /NJS /nc /ns /np @xdArgs /XF '.env.local' '.env' | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy a echoue (code $LASTEXITCODE)" }

if (-not (Test-Path "$stage\package.json")) { throw 'package.json manquant dans le staging' }
if (Test-Path "$stage\node_modules") { throw 'node_modules encore present - abort' }

if (Test-Path $outZip) { Remove-Item $outZip -Force }
Compress-Archive -Path "$stage\*" -DestinationPath $outZip -CompressionLevel Optimal -Force
Remove-Item $stage -Recurse -Force -ErrorAction SilentlyContinue

$size = [math]::Round((Get-Item $outZip).Length / 1MB, 2)
Write-Host ""
Write-Host "OK - zip pret ($size Mo) :"
Write-Host $outZip
Write-Host ""
Write-Host "Sur Hostinger > Deployements :"
Write-Host "  - Importer ce zip"
Write-Host "  - Prereglement : Vite"
Write-Host "  - Build : npm run build"
Write-Host "  - Dossier de sortie : dist"
Write-Host "  - Node : 20 ou 22"
Write-Host "  - Variables : VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY"

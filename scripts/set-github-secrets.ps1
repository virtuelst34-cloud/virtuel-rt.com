# Configure les secrets GitHub Actions depuis .env.local
# Prérequis : gh auth login (une seule fois)
# Usage : .\scripts\set-github-secrets.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$envFile = Join-Path $root ".env.local"

if (-not (Test-Path $envFile)) {
  Write-Error "Fichier .env.local introuvable : $envFile"
}

$vars = @{}
Get-Content $envFile | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -notmatch '=') { return }
  $parts = $_ -split '=', 2
  $vars[$parts[0].Trim()] = $parts[1].Trim()
}

$required = @("VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY")
foreach ($name in $required) {
  if (-not $vars[$name]) {
    Write-Error "Variable manquante dans .env.local : $name"
  }
}

$ghCmd = $null
$ghFound = Get-Command gh -ErrorAction SilentlyContinue
if ($ghFound) { $ghCmd = $ghFound.Source }
if (-not $ghCmd) {
  $ghCmd = "C:\Program Files\GitHub CLI\gh.exe"
}
if (-not (Test-Path $ghCmd)) {
  Write-Error "GitHub CLI (gh) non trouvé. Installez-le : winget install GitHub.cli"
}

& $ghCmd auth status 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Connexion GitHub requise. Exécutez : gh auth login" -ForegroundColor Yellow
  & $ghCmd auth login
}

$repo = "virtuelst34-cloud/virtuel-rt.com"
Write-Host "Configuration des secrets pour $repo..." -ForegroundColor Cyan

& $ghCmd secret set VITE_SUPABASE_URL --body $vars["VITE_SUPABASE_URL"] -R $repo
& $ghCmd secret set VITE_SUPABASE_ANON_KEY --body $vars["VITE_SUPABASE_ANON_KEY"] -R $repo

if ($vars["VITE_SENTRY_DSN"]) {
  & $ghCmd secret set VITE_SENTRY_DSN --body $vars["VITE_SENTRY_DSN"] -R $repo
}

@("VITE_BASE44_APP_ID", "VITE_BASE44_APP_BASE_URL", "VITE_BASE44_API_KEY") | ForEach-Object {
  & $ghCmd secret delete $_ -R $repo 2>$null
}

Write-Host "`nSecrets actifs :" -ForegroundColor Green
& $ghCmd secret list -R $repo

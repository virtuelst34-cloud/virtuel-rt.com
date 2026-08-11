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

function Set-GhSecret {
  param([string]$Name, [string]$Value)
  # Passe la valeur via stdin pour éviter l'expansion PowerShell des $ dans les mots de passe
  $Value | & $ghCmd secret set $Name -R $repo --body -
}

Set-GhSecret "VITE_SUPABASE_URL" $vars["VITE_SUPABASE_URL"]
Set-GhSecret "VITE_SUPABASE_ANON_KEY" $vars["VITE_SUPABASE_ANON_KEY"]

if ($vars["VITE_SENTRY_DSN"]) {
  Set-GhSecret "VITE_SENTRY_DSN" $vars["VITE_SENTRY_DSN"]
}

# Secrets FTP Hostinger (ajoutez-les dans .env.local)
$ftpKeys = @("FTP_SERVER", "FTP_USERNAME", "FTP_PASSWORD", "FTP_SERVER_DIR")
$ftpMissing = @()
foreach ($key in $ftpKeys) {
  if ($key -eq "FTP_SERVER_DIR") { continue }
  if (-not $vars[$key]) { $ftpMissing += $key }
}

if ($ftpMissing.Count -gt 0) {
  Write-Host ""
  Write-Host "FTP non configure. Ajoutez dans .env.local :" -ForegroundColor Yellow
  Write-Host "  FTP_SERVER=ftp.virtuel-rt.com"
  Write-Host "  FTP_USERNAME=u123456789"
  Write-Host "  FTP_PASSWORD=votre_mot_de_passe"
  Write-Host "  FTP_SERVER_DIR=/domains/virtuel-rt.com/public_html/"
  Write-Host ""
  Write-Host "Trouvez-les dans hPanel > Fichiers > Comptes FTP" -ForegroundColor Yellow
} else {
  Set-GhSecret "FTP_SERVER" $vars["FTP_SERVER"]
  Set-GhSecret "FTP_USERNAME" $vars["FTP_USERNAME"]
  Set-GhSecret "FTP_PASSWORD" $vars["FTP_PASSWORD"]
  if ($vars["FTP_SERVER_DIR"]) {
    Set-GhSecret "FTP_SERVER_DIR" $vars["FTP_SERVER_DIR"]
  }
  Write-Host "Secrets FTP configures." -ForegroundColor Green
}

@("VITE_BASE44_APP_ID", "VITE_BASE44_APP_BASE_URL", "VITE_BASE44_API_KEY") | ForEach-Object {
  & $ghCmd secret delete $_ -R $repo 2>$null
}

Write-Host "`nSecrets actifs :" -ForegroundColor Green
& $ghCmd secret list -R $repo

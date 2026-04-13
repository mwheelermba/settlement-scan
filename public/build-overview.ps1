# Embeds overview-screenshots into overview-template.html -> overview.html
# Uses correct image/jpeg vs image/png from file bytes (files may be JPEG with .png extension).

$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$base = Join-Path $here "overview-screenshots"
$template = Join-Path $here "overview-template.html"
$out = Join-Path $here "overview.html"

function Get-DataUri([string]$path) {
  $bytes = [IO.File]::ReadAllBytes($path)
  $mime = "application/octet-stream"
  if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xFF -and $bytes[1] -eq 0xD8 -and $bytes[2] -eq 0xFF) {
    $mime = "image/jpeg"
  }
  elseif ($bytes.Length -ge 8 -and $bytes[0] -eq 0x89 -and $bytes[1] -eq 0x50 -and $bytes[2] -eq 0x4E -and $bytes[3] -eq 0x47) {
    $mime = "image/png"
  }
  $b64 = [Convert]::ToBase64String($bytes)
  return "data:$mime;base64,$b64"
}

$html = [IO.File]::ReadAllText($template, [Text.Encoding]::UTF8)

$map = @{
  "PLACEHOLDER_PROFILE"     = Join-Path $base "profile.png"
  "PLACEHOLDER_MATCHES"     = Join-Path $base "matches.png"
  "PLACEHOLDER_BROWSE"      = Join-Path $base "browse.png"
  "PLACEHOLDER_DETAILS"     = Join-Path $base "match-details.png"
  "PLACEHOLDER_SETTLEMENT"  = Join-Path $base "settlement.png"
  "PLACEHOLDER_SAVED"       = Join-Path $base "saved.png"
}

foreach ($key in $map.Keys) {
  $p = $map[$key]
  if (-not (Test-Path $p)) { throw "Missing file: $p" }
  $uri = Get-DataUri $p
  $html = $html.Replace($key, $uri)
}

[IO.File]::WriteAllText($out, $html, [Text.Encoding]::UTF8)
Write-Host "Wrote $out ($([math]::Round((Get-Item $out).Length / 1KB)) KB)"

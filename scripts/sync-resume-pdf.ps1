$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$builtPdfPath = Join-Path $repoRoot "build\Resume-Miles Scheetz.pdf"
$publicPdfPath = Join-Path $repoRoot "public\Resume-Miles Scheetz.pdf"

if (-not (Test-Path -LiteralPath $builtPdfPath)) {
  throw "Could not find built resume PDF: $builtPdfPath"
}

New-Item -ItemType Directory -Force -Path (Split-Path -Parent $publicPdfPath) | Out-Null
Copy-Item -LiteralPath $builtPdfPath -Destination $publicPdfPath -Force

Write-Host "Synced build\Resume-Miles Scheetz.pdf to public\Resume-Miles Scheetz.pdf"

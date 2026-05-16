$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$texName = "Resume-Miles Scheetz.tex"
$pdfName = "Resume-Miles Scheetz.pdf"
$texPath = Join-Path $repoRoot $texName
$buildDir = Join-Path $repoRoot "build"
$sourcePdfPath = Join-Path $buildDir $pdfName
$publicPdfPath = Join-Path $repoRoot "public\resume.pdf"

if (-not (Test-Path -LiteralPath $texPath)) {
  throw "Could not find LaTeX source: $texPath"
}

$pdflatexCommand = Get-Command pdflatex -ErrorAction SilentlyContinue
$pdflatex = if ($pdflatexCommand) {
  $pdflatexCommand.Source
} else {
  $miktexPath = Join-Path $env:LOCALAPPDATA "Programs\MiKTeX\miktex\bin\x64\pdflatex.exe"
  if (Test-Path -LiteralPath $miktexPath) {
    $miktexPath
  } else {
    throw "Could not find pdflatex. Install MiKTeX, restart your terminal, then rerun this script."
  }
}

Push-Location $repoRoot
try {
  New-Item -ItemType Directory -Force -Path $buildDir | Out-Null

  for ($pass = 1; $pass -le 2; $pass++) {
    & $pdflatex -interaction=nonstopmode -halt-on-error -file-line-error -output-directory $buildDir $texName
    if ($LASTEXITCODE -ne 0) {
      throw "pdflatex failed on pass $pass with exit code $LASTEXITCODE."
    }
  }

  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $publicPdfPath) | Out-Null
  Copy-Item -LiteralPath $sourcePdfPath -Destination $publicPdfPath -Force

  Write-Host "Built build\$pdfName and copied it to public\resume.pdf"
} finally {
  Pop-Location
}

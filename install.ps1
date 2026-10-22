# KASSETE — one-line Windows installer
#
#   irm https://raw.githubusercontent.com/NOOBHEKER/KASSETE/main/install.ps1 | iex
#
# Downloads the newest release installer and runs it silently. KASSETE lands in
# your user profile with Desktop + Start Menu shortcuts.

$ErrorActionPreference = 'Stop'
$repo = 'NOOBHEKER/KASSETE'

Write-Host ''
Write-Host '  KASSETE — a cassette deck for your PC' -ForegroundColor DarkYellow
Write-Host '  -------------------------------------' -ForegroundColor DarkGray

$release = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/releases/latest" `
  -Headers @{ 'User-Agent' = 'KASSETE-installer' }

$asset = $release.assets |
  Where-Object { $_.name -like '*setup.exe' } |
  Select-Object -First 1

if (-not $asset) {
  throw 'No installer found in the latest release. Download it by hand from the Releases page.'
}

$tmp = Join-Path $env:TEMP $asset.name
Write-Host "  Downloading $($asset.name) ..." -ForegroundColor Gray
Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $tmp -UseBasicParsing

Write-Host '  Installing ...' -ForegroundColor Gray
$proc = Start-Process -FilePath $tmp -ArgumentList '/S' -PassThru -Wait

if ($proc.ExitCode -ne 0) {
  throw "The installer exited with code $($proc.ExitCode)."
}

Write-Host ''
Write-Host '  Done. Look for the cassette on your Desktop or in the Start Menu.' -ForegroundColor Green
Write-Host '  Your music stays where it is — nothing is uploaded.' -ForegroundColor DarkGray

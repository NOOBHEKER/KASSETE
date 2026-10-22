<#
  install-local.ps1 — put KASSETE where Windows apps live and give it a face.

  After `npm run tauri build`, run:

      powershell -ExecutionPolicy Bypass -File tools\install-local.ps1 -Launch

  It copies kassete.exe to %LOCALAPPDATA%\Programs\KASSETE and creates a
  Desktop + Start Menu shortcut, so the app launches from an icon instead of
  from a folder somewhere on G:.

  Add -Uninstall to remove both shortcuts and the installed copy.
#>
param(
  [switch]$Launch,
  [switch]$Uninstall
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$dest = Join-Path $env:LOCALAPPDATA 'Programs\KASSETE'
$exe = Join-Path $dest 'KASSETE.exe'
$icon = Join-Path $root 'src-tauri\icons\icon.ico'

$shortcuts = @(
  (Join-Path ([Environment]::GetFolderPath('Desktop')) 'KASSETE.lnk'),
  (Join-Path ([Environment]::GetFolderPath('Programs')) 'KASSETE.lnk')
)

if ($Uninstall) {
  Get-Process kassete -ErrorAction SilentlyContinue | Stop-Process -Force
  foreach ($path in $shortcuts) {
    if (Test-Path $path) { Remove-Item $path -Force }
  }
  if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
  Write-Host 'KASSETE removed. The app library in %APPDATA% was left alone.' -ForegroundColor Yellow
  return
}

$built = Join-Path $root 'src-tauri\target\release\kassete.exe'
if (-not (Test-Path $built)) {
  throw "kassete.exe is missing. Build it first:  npm run tauri build"
}

New-Item -ItemType Directory -Force -Path $dest | Out-Null

# A running copy locks the binary, so close it before replacing.
Get-Process kassete -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Milliseconds 300
Copy-Item $built $exe -Force

$shell = New-Object -ComObject WScript.Shell
foreach ($path in $shortcuts) {
  $lnk = $shell.CreateShortcut($path)
  $lnk.TargetPath = $exe
  $lnk.WorkingDirectory = $dest
  if (Test-Path $icon) { $lnk.IconLocation = "$icon,0" }
  $lnk.Description = 'KASSETE - a cassette deck for your PC'
  $lnk.Save()
}

Write-Host ''
Write-Host '  KASSETE is installed.' -ForegroundColor Green
Write-Host "  App:      $exe"
Write-Host "  Desktop:  $($shortcuts[0])"
Write-Host "  Start:    $($shortcuts[1])"
Write-Host ''

if ($Launch) {
  Start-Process $exe
  Write-Host '  Launched. Look for the cassette in the tray.' -ForegroundColor DarkGray
}

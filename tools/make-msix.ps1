<#
  make-msix.ps1 — wrap the built KASSETE.exe in an MSIX for Microsoft Store.

  Usage:
      powershell -ExecutionPolicy Bypass -File tools\make-msix.ps1
      ... -IdentityName "YourPublisher.KASSETE" -Publisher "CN=XXXXXXXX-...."

  The default Identity values are placeholders. Partner Center assigns the real
  pair when you reserve the app name; copy them from
  Partner Center -> App identity into this script (or pass them as arguments),
  then upload the .msix from the release\ folder. The Store signs the package
  for you, so no local certificate is needed to submit.

  A locally produced MSIX is unsigned; install it only after signing with
  signtool and a trusted certificate (Store submissions do not need this).
#>
param(
  [string]$IdentityName = 'Kassete.CassetteDeck',
  [string]$Publisher = 'CN=KASSETE',
  [string]$DisplayName = 'KASSETE',
  [string]$Version = '1.0.0.0',
  [string]$Architecture = 'x64'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$release = Join-Path $root 'release'
$layout = Join-Path $root 'build\msix\layout'
$assets = Join-Path $layout 'Assets'
$exe = Join-Path $root 'src-tauri\target\release\kassete.exe'

if (-not (Test-Path $exe)) {
  throw "kassete.exe is missing. Build it first:  npm run tauri build"
}

if (Test-Path $layout) { Remove-Item $layout -Recurse -Force }
New-Item -ItemType Directory -Force -Path $assets | Out-Null

Copy-Item $exe (Join-Path $layout 'kassete.exe') -Force

$icons = Join-Path $root 'src-tauri\icons'
$map = @{
  'StoreLogo.png'        = 'StoreLogo.png'
  'Square44x44Logo.png'  = 'Square44x44Logo.png'
  'Square71x71Logo.png'  = 'Square71x71Logo.png'
  'Square150x150Logo.png'= 'Square150x150Logo.png'
  'Square310x310Logo.png'= 'Square310x310Logo.png'
}
foreach ($key in $map.Keys) {
  $src = Join-Path $icons $key
  if (Test-Path $src) { Copy-Item $src (Join-Path $assets $map[$key]) -Force }
}

# A wide tile is required alongside Square310x310Logo, so compose one.
Add-Type -AssemblyName System.Drawing
$wide = New-Object System.Drawing.Bitmap 310, 150
$gfx = [System.Drawing.Graphics]::FromImage($wide)
$gfx.Clear([System.Drawing.ColorTranslator]::FromHtml('#FDF8EE'))
$gfx.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$logo = [System.Drawing.Image]::FromFile((Join-Path $icons 'icon-1024.png'))
$gfx.DrawImage($logo, 90, 10, 130, 130)
$wide.Save((Join-Path $assets 'Wide310x150Logo.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$gfx.Dispose(); $wide.Dispose(); $logo.Dispose()
$manifest = @"
<?xml version="1.0" encoding="utf-8"?>
<Package
  xmlns="http://schemas.microsoft.com/appx/manifest/foundation/windows10"
  xmlns:uap="http://schemas.microsoft.com/appx/manifest/uap/windows10"
  xmlns:uap10="http://schemas.microsoft.com/appx/manifest/uap/windows10/10"
  xmlns:rescap="http://schemas.microsoft.com/appx/manifest/foundation/windows10/restrictedcapabilities"
  IgnorableNamespaces="uap uap10 rescap">

  <Identity Name="$IdentityName" Publisher="$Publisher" Version="$Version" ProcessorArchitecture="$Architecture" />

  <Properties>
    <DisplayName>$DisplayName</DisplayName>
    <PublisherDisplayName>KASSETE</PublisherDisplayName>
    <Logo>Assets\StoreLogo.png</Logo>
  </Properties>

  <Dependencies>
    <TargetDeviceFamily Name="Windows.Desktop" MinVersion="10.0.17763.0" MaxVersionTested="10.0.22621.0" />
  </Dependencies>

  <Resources>
    <Resource Language="en-us" />
  </Resources>

  <Applications>
    <Application Id="KASSETE" Executable="kassete.exe" EntryPoint="Windows.FullTrustApplication">
      <uap:VisualElements
        DisplayName="$DisplayName"
        Description="A cassette deck for your PC - real tapes, real reels, real hiss."
        BackgroundColor="transparent"
        Square150x150Logo="Assets\Square150x150Logo.png"
        Square44x44Logo="Assets\Square44x44Logo.png">
        <uap:DefaultTile
          Wide310x150Logo="Assets\Wide310x150Logo.png"
          Square71x71Logo="Assets\Square71x71Logo.png"
          Square310x310Logo="Assets\Square310x310Logo.png" />
      </uap:VisualElements>
    </Application>
  </Applications>

  <Capabilities>
    <rescap:Capability Name="runFullTrust" />
  </Capabilities>
</Package>
"@

Set-Content -Path (Join-Path $layout 'AppxManifest.xml') -Value $manifest -Encoding UTF8

$makeappx = 'C:\Program Files (x86)\Windows Kits\10\bin\10.0.22621.0\x64\makeappx.exe'
if (-not (Test-Path $makeappx)) {
  $found = Get-ChildItem 'C:\Program Files (x86)\Windows Kits\10\bin' -Recurse -Filter makeappx.exe -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -match '\\x64\\' } | Select-Object -First 1
  if ($found) {
    $makeappx = $found.FullName
  } else {
    $cmd = Get-Command makeappx.exe -ErrorAction SilentlyContinue
    if ($cmd) { $makeappx = $cmd.Source } else { throw 'makeappx.exe not found. Install the Windows SDK.' }
  }
}

New-Item -ItemType Directory -Force -Path $release | Out-Null
$out = Join-Path $release "KASSETE_${Version}_${Architecture}.msix"
if (Test-Path $out) { Remove-Item $out -Force }

& $makeappx pack /d $layout /p $out /o
if ($LASTEXITCODE -ne 0) { throw "makeappx failed with exit code $LASTEXITCODE" }

$size = [math]::Round((Get-Item $out).Length / 1MB, 2)
Write-Host ''
Write-Host "  MSIX built: $out ($size MB)" -ForegroundColor Green
Write-Host '  Store upload: Partner Center -> your app -> Packages -> upload this file.'
Write-Host '  Before submitting, set -IdentityName and -Publisher to the values Partner Center shows.' -ForegroundColor DarkGray

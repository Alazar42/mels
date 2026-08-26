param (
    [string]$ConfigFile = "msix-config.json",
    [string]$PackageName,
    [string]$Publisher,
    [string]$PublisherDisplayName,
    [string]$DisplayName,
    [string]$Version,
    [string]$OutputDir = "build\bin",
    [string]$OutputMsix = "build\bin\mels.msix"
)

$ErrorActionPreference = "Stop"

Write-Host "=== Starting MSIX Packaging for Mels ===" -ForegroundColor Cyan

# Load config file if available
$config = @{}
if (Test-Path $ConfigFile) {
    try {
        $config = Get-Content -Raw $ConfigFile | ConvertFrom-Json
        Write-Host "Loaded configuration from $ConfigFile" -ForegroundColor DarkGray
    } catch {
        Write-Warning "Could not parse $ConfigFile, falling back to defaults."
    }
}

# Resolve values: CLI args > Config file > Defaults
if (-not $PackageName) { $PackageName = if ($config.PackageName) { $config.PackageName } else { "ADWA1888.MelsDesktopClient" } }
if (-not $Publisher) { $Publisher = if ($config.Publisher) { $config.Publisher } else { "CN=ADWA1888" } }
if (-not $PublisherDisplayName) { $PublisherDisplayName = if ($config.PublisherDisplayName) { $config.PublisherDisplayName } else { "ADWA1888" } }
if (-not $DisplayName) { $DisplayName = if ($config.DisplayName) { $config.DisplayName } else { "Mels Desktop Client" } }
if (-not $Version) { $Version = if ($config.Version) { $config.Version } else { "1.0.0.0" } }

Write-Host "Package Identity Name : $PackageName"
Write-Host "Publisher             : $Publisher"
Write-Host "Publisher Display Name: $PublisherDisplayName"
Write-Host "Display Name          : $DisplayName"
Write-Host "Version               : $Version"

# 1. Locate makeappx.exe
$makeappxPath = Get-ChildItem -Path "C:\Program Files (x86)\Windows Kits\10\bin" -Filter "makeappx.exe" -Recurse -ErrorAction SilentlyContinue | 
    Where-Object { $_.FullName -like "*\x64\makeappx.exe" } | 
    Select-Object -First 1 -ExpandProperty FullName

if (-not $makeappxPath) {
    throw "makeappx.exe was not found in C:\Program Files (x86)\Windows Kits\10\bin. Please ensure Windows 10/11 SDK is installed."
}
Write-Host "Found MakeAppx at: $makeappxPath" -ForegroundColor Green

# 2. Check binary
$exeSource = "build\bin\mels.exe"
if (-not (Test-Path $exeSource)) {
    Write-Host "Binary not found at $exeSource. Building with Wails..." -ForegroundColor Yellow
    wails build -clean -platform windows/amd64
    if (-not (Test-Path $exeSource)) {
        throw "Failed to build $exeSource with Wails."
    }
}

# 3. Setup staging folder
$stagingDir = "build\msix_staging"
if (Test-Path $stagingDir) {
    Remove-Item -Path $stagingDir -Recurse -Force
}
New-Item -ItemType Directory -Path "$stagingDir\Assets" -Force | Out-Null
New-Item -ItemType Directory -Path (Split-Path $OutputMsix) -Force -ErrorAction SilentlyContinue | Out-Null

# Copy executable
Copy-Item -Path $exeSource -Destination "$stagingDir\mels.exe" -Force
Write-Host "Copied $exeSource -> $stagingDir\mels.exe"

# 4. Generate App Icons using System.Drawing
Write-Host "Generating visual assets from appicon.png..." -ForegroundColor Cyan
Add-Type -AssemblyName System.Drawing

$sourceIconPath = Resolve-Path "appicon.png"
$sourceImg = [System.Drawing.Image]::FromFile($sourceIconPath)

function Resize-Icon {
    param (
        [System.Drawing.Image]$Source,
        [int]$CanvasWidth,
        [int]$CanvasHeight,
        [int]$IconWidth,
        [int]$IconHeight,
        [string]$TargetPath
    )

    $canvas = New-Object System.Drawing.Bitmap($CanvasWidth, $CanvasHeight)
    $graphics = [System.Drawing.Graphics]::FromImage($canvas)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.Clear([System.Drawing.Color]::Transparent)

    $destX = [int](($CanvasWidth - $IconWidth) / 2)
    $destY = [int](($CanvasHeight - $IconHeight) / 2)

    $graphics.DrawImage($Source, $destX, $destY, $IconWidth, $IconHeight)
    $graphics.Dispose()

    $canvas.Save($TargetPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $canvas.Dispose()
}

# Generate required MSIX asset sizes
Resize-Icon -Source $sourceImg -CanvasWidth 44  -CanvasHeight 44  -IconWidth 44  -IconHeight 44  -TargetPath "$stagingDir\Assets\Square44x44Logo.png"
Resize-Icon -Source $sourceImg -CanvasWidth 50  -CanvasHeight 50  -IconWidth 50  -IconHeight 50  -TargetPath "$stagingDir\Assets\StoreLogo.png"
Resize-Icon -Source $sourceImg -CanvasWidth 150 -CanvasHeight 150 -IconWidth 150 -IconHeight 150 -TargetPath "$stagingDir\Assets\Square150x150Logo.png"
Resize-Icon -Source $sourceImg -CanvasWidth 310 -CanvasHeight 310 -IconWidth 310 -IconHeight 310 -TargetPath "$stagingDir\Assets\Square310x310Logo.png"
Resize-Icon -Source $sourceImg -CanvasWidth 310 -CanvasHeight 150 -IconWidth 140 -IconHeight 140 -TargetPath "$stagingDir\Assets\Wide310x150Logo.png"
Resize-Icon -Source $sourceImg -CanvasWidth 620 -CanvasHeight 300 -IconWidth 200 -IconHeight 200 -TargetPath "$stagingDir\Assets\SplashScreen.png"

$sourceImg.Dispose()
Write-Host "Visual assets generated successfully." -ForegroundColor Green

# 5. Create AppxManifest.xml
$manifestContent = @"
<?xml version="1.0" encoding="utf-8"?>
<Package xmlns="http://schemas.microsoft.com/appx/manifest/foundation/windows10"
         xmlns:uap="http://schemas.microsoft.com/appx/manifest/uap/windows10"
         xmlns:rescap="http://schemas.microsoft.com/appx/manifest/foundation/windows10/restrictedcapabilities"
         IgnorableNamespaces="uap rescap">

  <Identity Name="$PackageName"
            Publisher="$Publisher"
            Version="$Version"
            ProcessorArchitecture="x64" />

  <Properties>
    <DisplayName>$DisplayName</DisplayName>
    <PublisherDisplayName>$PublisherDisplayName</PublisherDisplayName>
    <Logo>Assets\StoreLogo.png</Logo>
  </Properties>

  <Dependencies>
    <TargetDeviceFamily Name="Windows.Desktop" MinVersion="10.0.17763.0" MaxVersionTested="10.0.26100.0" />
  </Dependencies>

  <Resources>
    <Resource Language="en-us" />
  </Resources>

  <Applications>
    <Application Id="App"
                 Executable="mels.exe"
                 EntryPoint="Windows.FullTrustApplication">
      <uap:VisualElements DisplayName="$DisplayName"
                          Description="$DisplayName"
                          BackgroundColor="transparent"
                          Square150x150Logo="Assets\Square150x150Logo.png"
                          Square44x44Logo="Assets\Square44x44Logo.png">
        <uap:DefaultTile Wide310x150Logo="Assets\Wide310x150Logo.png"
                         Square310x310Logo="Assets\Square310x310Logo.png"
                         ShortName="$DisplayName">
          <uap:ShowNameOnTiles>
            <uap:ShowOn Tile="square150x150Logo" />
            <uap:ShowOn Tile="wide310x150Logo" />
            <uap:ShowOn Tile="square310x310Logo" />
          </uap:ShowNameOnTiles>
        </uap:DefaultTile>
        <uap:SplashScreen Image="Assets\SplashScreen.png" />
      </uap:VisualElements>
    </Application>
  </Applications>

  <Capabilities>
    <rescap:Capability Name="runFullTrust" />
  </Capabilities>
</Package>
"@

$manifestPath = "$stagingDir\AppxManifest.xml"
Set-Content -Path $manifestPath -Value $manifestContent -Encoding UTF8
Write-Host "Created AppxManifest.xml at $manifestPath" -ForegroundColor Green

# 6. Run makeappx.exe
Write-Host "Building MSIX package with makeappx.exe..." -ForegroundColor Cyan
& $makeappxPath pack /d $stagingDir /p $OutputMsix /o /v

if ($LASTEXITCODE -eq 0 -and (Test-Path $OutputMsix)) {
    $sizeMb = [math]::Round(((Get-Item $OutputMsix).Length / 1MB), 2)
    Write-Host "`nSUCCESS! MSIX Package created: $OutputMsix ($sizeMb MB)" -ForegroundColor Green
} else {
    throw "MakeAppx failed to create MSIX package."
}

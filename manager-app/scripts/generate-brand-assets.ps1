$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$managerRoot = Split-Path -Parent $scriptDir
$buildDir = Join-Path $managerRoot "build"
$iconsDir = Join-Path $buildDir "icons"

New-Item -ItemType Directory -Force -Path $buildDir | Out-Null
New-Item -ItemType Directory -Force -Path $iconsDir | Out-Null

function New-RoundedRectPath {
  param(
    [float] $X,
    [float] $Y,
    [float] $Width,
    [float] $Height,
    [float] $Radius
  )

  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $diameter = $Radius * 2
  $path.AddArc($X, $Y, $diameter, $diameter, 180, 90)
  $path.AddArc($X + $Width - $diameter, $Y, $diameter, $diameter, 270, 90)
  $path.AddArc($X + $Width - $diameter, $Y + $Height - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($X, $Y + $Height - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()
  return $path
}

function New-IconBitmap {
  param(
    [int] $Size
  )

  $bitmap = New-Object System.Drawing.Bitmap $Size, $Size
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.Clear([System.Drawing.Color]::Transparent)

  $outerPadding = [int]($Size * 0.08)
  $outerSize = $Size - ($outerPadding * 2)
  $cornerRadius = [single]($Size * 0.18)
  $outerRect = New-Object System.Drawing.RectangleF $outerPadding, $outerPadding, $outerSize, $outerSize
  $outerPath = New-RoundedRectPath $outerRect.X $outerRect.Y $outerRect.Width $outerRect.Height $cornerRadius

  $gradient = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.PointF 0, 0),
    (New-Object System.Drawing.PointF $Size, $Size),
    ([System.Drawing.Color]::FromArgb(255, 13, 27, 43)),
    ([System.Drawing.Color]::FromArgb(255, 2, 132, 199))
  )
  $graphics.FillPath($gradient, $outerPath)

  $overlayBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.PointF $outerPadding, $outerPadding),
    (New-Object System.Drawing.PointF ($Size - $outerPadding), ($Size - $outerPadding)),
    ([System.Drawing.Color]::FromArgb(70, 14, 165, 233)),
    ([System.Drawing.Color]::FromArgb(0, 14, 165, 233))
  )
  $graphics.FillPath($overlayBrush, $outerPath)

  $innerGlow = New-Object System.Drawing.RectangleF ($Size * 0.18), ($Size * 0.16), ($Size * 0.64), ($Size * 0.64)
  $glowBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(32, 255, 255, 255))
  $graphics.FillEllipse($glowBrush, $innerGlow)

  $ringPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(52, 226, 232, 240)), ($Size * 0.035)
  $graphics.DrawArc($ringPen, $Size * 0.19, $Size * 0.24, $Size * 0.62, $Size * 0.62, 198, 238)

  $accentPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 240, 249, 255)), ($Size * 0.065)
  $accentPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $accentPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $graphics.DrawLine(
    $accentPen,
    (New-Object System.Drawing.PointF ($Size * 0.29), ($Size * 0.74)),
    (New-Object System.Drawing.PointF ($Size * 0.50), ($Size * 0.28))
  )
  $graphics.DrawLine(
    $accentPen,
    (New-Object System.Drawing.PointF ($Size * 0.71), ($Size * 0.74)),
    (New-Object System.Drawing.PointF ($Size * 0.50), ($Size * 0.28))
  )

  $bridgePen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 34, 211, 238)), ($Size * 0.06)
  $bridgePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $bridgePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $graphics.DrawLine(
    $bridgePen,
    (New-Object System.Drawing.PointF ($Size * 0.39), ($Size * 0.56)),
    (New-Object System.Drawing.PointF ($Size * 0.61), ($Size * 0.56))
  )

  $pilotDotBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 125, 211, 252))
  $pilotDotRect = New-Object System.Drawing.RectangleF ($Size * 0.65), ($Size * 0.24), ($Size * 0.11), ($Size * 0.11)
  $graphics.FillEllipse($pilotDotBrush, $pilotDotRect)

  $haloPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(180, 125, 211, 252)), ($Size * 0.02)
  $graphics.DrawEllipse($haloPen, $Size * 0.61, $Size * 0.20, $Size * 0.19, $Size * 0.19)

  $graphics.Dispose()
  $outerPath.Dispose()
  $gradient.Dispose()
  $overlayBrush.Dispose()
  $glowBrush.Dispose()
  $ringPen.Dispose()
  $accentPen.Dispose()
  $bridgePen.Dispose()
  $pilotDotBrush.Dispose()
  $haloPen.Dispose()

  return $bitmap
}

function Save-BitmapPng {
  param(
    [System.Drawing.Bitmap] $Bitmap,
    [string] $Path
  )

  $Bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
}

function New-IcoFromPng {
  param(
    [byte[]] $PngBytes,
    [string] $OutputPath,
    [int] $Size
  )

  $stream = New-Object System.IO.FileStream($OutputPath, [System.IO.FileMode]::Create)
  $writer = New-Object System.IO.BinaryWriter($stream)

  $writer.Write([UInt16]0)
  $writer.Write([UInt16]1)
  $writer.Write([UInt16]1)
  $writer.Write([byte]0)
  $writer.Write([byte]0)
  $writer.Write([byte]0)
  $writer.Write([byte]0)
  $writer.Write([UInt16]1)
  $writer.Write([UInt16]32)
  $writer.Write([UInt32]$PngBytes.Length)
  $writer.Write([UInt32]22)
  $writer.Write($PngBytes)
  $writer.Flush()
  $writer.Dispose()
  $stream.Dispose()
}

$sourceSvg = @'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0d1b2b"/>
      <stop offset="100%" stop-color="#0284c7"/>
    </linearGradient>
  </defs>
  <rect x="82" y="82" width="860" height="860" rx="182" fill="url(#bg)"/>
  <path d="M297 758L512 288L727 758" fill="none" stroke="#f0f9ff" stroke-linecap="round" stroke-width="68"/>
  <path d="M398 572H626" fill="none" stroke="#22d3ee" stroke-linecap="round" stroke-width="62"/>
  <path d="M678 232c44 0 80 36 80 80s-36 80-80 80-80-36-80-80 36-80 80-80Z" fill="none" stroke="#7dd3fc" stroke-width="18" opacity="0.72"/>
  <circle cx="678" cy="288" r="54" fill="#7dd3fc"/>
</svg>
'@

Set-Content -LiteralPath (Join-Path $buildDir "icon-source.svg") -Value $sourceSvg -Encoding utf8

$sizes = @(1024, 512, 256, 128, 64, 32)
$png256Bytes = $null

foreach ($size in $sizes) {
  $bitmap = New-IconBitmap -Size $size
  $pngPath =
    if ($size -eq 1024) {
      Join-Path $buildDir "icon.png"
    } else {
      Join-Path $iconsDir ("{0}x{0}.png" -f $size)
    }

  Save-BitmapPng -Bitmap $bitmap -Path $pngPath

  if ($size -eq 256) {
    $memory = New-Object System.IO.MemoryStream
    $bitmap.Save($memory, [System.Drawing.Imaging.ImageFormat]::Png)
    $png256Bytes = $memory.ToArray()
    $memory.Dispose()
  }

  $bitmap.Dispose()
}

if (-not $png256Bytes) {
  throw "Impossible de générer le PNG 256x256 pour l'icône Windows."
}

New-IcoFromPng -PngBytes $png256Bytes -OutputPath (Join-Path $buildDir "icon.ico") -Size 256

Copy-Item -LiteralPath (Join-Path $buildDir "icon.png") -Destination (Join-Path $buildDir "icon-1024.png") -Force
Copy-Item -LiteralPath (Join-Path $buildDir "icon.ico") -Destination (Join-Path $buildDir "installerHeaderIcon.ico") -Force

Write-Output "AIPilot Manager brand assets generated."

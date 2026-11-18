# Renders img/icon-192.png and img/icon-512.png (same drawing as img/icon.svg, full-bleed so it also works as maskable).
# Usage: powershell -ExecutionPolicy Bypass -File tools/icons.ps1
Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $PSScriptRoot
foreach ($size in 192, 512) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.Clear([System.Drawing.ColorTranslator]::FromHtml('#1d2b3a'))
  # draw in a 64-unit grid, scaled into the inner 80% (maskable safe zone)
  $s = $size / 64 * 0.8; $o = $size * 0.1
  $g.TranslateTransform($o, $o); $g.ScaleTransform($s, $s)
  $light = [System.Drawing.ColorTranslator]::FromHtml('#f2efe8')
  $coral = [System.Drawing.ColorTranslator]::FromHtml('#f08a62')
  $pl = New-Object System.Drawing.Pen $light, 4; $pl.StartCap = 'Round'; $pl.EndCap = 'Round'; $pl.LineJoin = 'Round'
  $pc = New-Object System.Drawing.Pen $coral, 4; $pc.StartCap = 'Round'; $pc.EndCap = 'Round'; $pc.LineJoin = 'Round'
  $g.DrawLines($pl, [System.Drawing.PointF[]]@((New-Object System.Drawing.PointF 10, 52), (New-Object System.Drawing.PointF 28, 52), (New-Object System.Drawing.PointF 32, 38)))
  $g.FillEllipse((New-Object System.Drawing.SolidBrush $light), 4.8, 46.8, 6.4, 6.4)
  $g.DrawLines($pc, [System.Drawing.PointF[]]@((New-Object System.Drawing.PointF 18, 30), (New-Object System.Drawing.PointF 32, 34), (New-Object System.Drawing.PointF 46, 28)))
  $g.DrawLine($pc, 30, 34, 24, 24); $g.DrawLine($pc, 34, 34, 40, 24)
  $g.FillEllipse((New-Object System.Drawing.SolidBrush $coral), 46.4, 22.4, 7.2, 7.2)
  $bmp.Save((Join-Path $root "img/icon-$size.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}
"ok"

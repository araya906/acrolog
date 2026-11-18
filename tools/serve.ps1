# Minimal static server for local testing (no Python/Node needed): http://localhost:8000/
# Usage: powershell -ExecutionPolicy Bypass -File tools/serve.ps1 [-Port 8000]
param([int]$Port = 8000)
$root = Split-Path -Parent $PSScriptRoot
$types = @{ ".html" = "text/html; charset=utf-8"; ".js" = "text/javascript; charset=utf-8"; ".css" = "text/css; charset=utf-8";
  ".svg" = "image/svg+xml"; ".png" = "image/png"; ".json" = "application/json"; ".webmanifest" = "application/manifest+json" }
$l = New-Object System.Net.HttpListener
$l.Prefixes.Add("http://localhost:$Port/")
$l.Start()
"Serving $root on http://localhost:$Port/"
while ($l.IsListening) {
  $c = $l.GetContext()
  $path = [Uri]::UnescapeDataString($c.Request.Url.AbsolutePath.TrimStart('/'))
  if ($path -eq '') { $path = 'index.html' }
  $file = [IO.Path]::GetFullPath((Join-Path $root $path))
  if ($file.StartsWith($root) -and (Test-Path $file -PathType Leaf)) {
    $bytes = [IO.File]::ReadAllBytes($file)
    $c.Response.ContentType = $types[[IO.Path]::GetExtension($file)]
    $c.Response.Headers.Add("Cache-Control", "no-cache")
    $c.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  } else { $c.Response.StatusCode = 404 }
  $c.Response.Close()
}

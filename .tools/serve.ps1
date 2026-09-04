param(
    [int]$Port = 4177,
    [string]$Root = (Split-Path -Parent $PSScriptRoot)
)

$Root = (Resolve-Path $Root).Path
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Serving $Root at http://localhost:$Port/  (Ctrl+C to stop)"

$mime = @{
    '.html' = 'text/html; charset=utf-8'
    '.css'  = 'text/css; charset=utf-8'
    '.js'   = 'application/javascript; charset=utf-8'
    '.json' = 'application/json; charset=utf-8'
    '.svg'  = 'image/svg+xml'
    '.png'  = 'image/png'
    '.jpg'  = 'image/jpeg'
    '.ico'  = 'image/x-icon'
    '.woff2'= 'font/woff2'
}

try {
    while ($listener.IsListening) {
        $ctx = $listener.GetContext()
        $rel = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart('/')
        if ([string]::IsNullOrWhiteSpace($rel)) { $rel = 'index.html' }
        $path = Join-Path $Root $rel
        if (Test-Path $path -PathType Container) { $path = Join-Path $path 'index.html' }

        $full = $null
        if (Test-Path $path -PathType Leaf) { $full = (Resolve-Path $path).Path }

        if ($full -and $full.StartsWith($Root, [StringComparison]::OrdinalIgnoreCase)) {
            $bytes = [System.IO.File]::ReadAllBytes($full)
            $ext = [System.IO.Path]::GetExtension($full).ToLower()
            $ctx.Response.ContentType = $(if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' })
            $ctx.Response.Headers.Add('Cache-Control', 'no-store')
            $ctx.Response.StatusCode = 200
            $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
            Write-Host "200 /$rel"
        } else {
            $body = [Text.Encoding]::UTF8.GetBytes("404 Not Found: /$rel")
            $ctx.Response.StatusCode = 404
            $ctx.Response.ContentType = 'text/plain; charset=utf-8'
            $ctx.Response.OutputStream.Write($body, 0, $body.Length)
            Write-Host "404 /$rel"
        }
        $ctx.Response.Close()
    }
} finally {
    $listener.Stop(); $listener.Close()
}

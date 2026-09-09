# optimize-images.ps1 — сжатие галереи и hero (запуск из корня проекта)
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$backupDir = Join-Path $PSScriptRoot "img\_orig"
if (-not (Test-Path $backupDir)) { New-Item -ItemType Directory -Path $backupDir | Out-Null }

$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
$ep = New-Object System.Drawing.Imaging.EncoderParameters(1)
$ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, 85L)

Get-ChildItem (Join-Path $PSScriptRoot "img") -Include *.jpg,*.jpeg -Recurse |
    Where-Object { $_.FullName -notmatch "_orig" } |
    ForEach-Object {
        $before = [math]::Round($_.Length / 1KB, 1)
        # бэкап оригинала до изменений
        Copy-Item $_.FullName (Join-Path $backupDir $_.Name) -Force
        $img = [System.Drawing.Image]::FromFile($_.FullName)
        $maxW = if ($_.Name -like "hero-*") { 1600 } else { 1200 }
        if ($img.Width -gt $maxW) {
            $newH = [int]($img.Height * $maxW / $img.Width)
            $bmp = New-Object System.Drawing.Bitmap($maxW, $newH)
            $g = [System.Drawing.Graphics]::FromImage($bmp)
            $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $g.DrawImage($img, 0, 0, $maxW, $newH)
            $g.Dispose(); $img.Dispose()
            $bmp.Save($_.FullName, $jpegCodec, $ep)
            $bmp.Dispose()
        } else {
            $img.Dispose()
        }
        $after = [math]::Round((Get-Item $_.FullName).Length / 1KB, 1)
        Write-Host ("{0}: {1} KB -> {2} KB" -f $_.Name, $before, $after)
    }
    
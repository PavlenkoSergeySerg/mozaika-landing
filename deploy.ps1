# deploy.ps1 — помощник деплоя am-52.ru (запускать из корня проекта)
# Использование: .\deploy.ps1 "текст коммита"
param(
    [Parameter(Mandatory = $true)][string]$Message
)

$ErrorActionPreference = "Stop"

# --- 1. Автообновление ?v= в index.html на дату деплоя ---
$v = Get-Date -Format "yyyyMMdd"
$path = Join-Path $PSScriptRoot "index.html"
$content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
$updated = [regex]::Replace($content, '\?v=\d{8}', "?v=$v")

if ($updated -ne $content) {
    [System.IO.File]::WriteAllText($path, $updated, (New-Object System.Text.UTF8Encoding($false)))
    Write-Host ("[OK] ?v= -> " + $v + " (index.html)") -ForegroundColor Green
}
else {
    Write-Host ("[!!] ?v= не найден или уже " + $v + " - проверь ссылки css/js вручную!") -ForegroundColor Yellow
}

# --- 2. Показать, что уходит в коммит ---
git status --short

# --- 3. Коммит и пуш ---
git add -A
git commit -m $Message
git push origin main

# --- 4. Напомнить, какие файлы залить на хостинг ---
Write-Host ""
Write-Host "=== ЗАЛЕЙТЕ В ISPmanager (с заменой): ===" -ForegroundColor Cyan
git diff --name-only HEAD~1 HEAD | ForEach-Object { Write-Host ("   " + $_) }
Write-Host "=========================================" -ForegroundColor Cyan
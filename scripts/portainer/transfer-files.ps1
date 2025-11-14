# Transfer files to Portainer server
param(
    [string]$Host = "192.168.7.116",
    [string]$User = "tcrowden",
    [string]$RemotePath = "~/rook-platform"
)

$localPath = "C:\Projects\RookIT\RookIT"
Set-Location $localPath

Write-Host "📦 Transferring files to $User@$Host:$RemotePath" -ForegroundColor Cyan

# Essential files
$files = @(
    "docker-compose.portainer.yml",
    "env.portainer.example",
    "Dockerfile",
    "nginx.conf"
)

# Essential directories
$dirs = @(
    "apps",
    "db",
    "scripts",
    "docs",
    "kong"
)

Write-Host "`n📄 Transferring files..." -ForegroundColor Yellow
foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "  → $file" -ForegroundColor Gray
        scp $file "${User}@${Host}:${RemotePath}/" 2>&1 | Out-Null
    }
}

Write-Host "`n📁 Transferring directories..." -ForegroundColor Yellow
foreach ($dir in $dirs) {
    if (Test-Path $dir) {
        Write-Host "  → $dir/" -ForegroundColor Gray
        scp -r $dir "${User}@${Host}:${RemotePath}/" 2>&1 | Out-Null
    }
}

Write-Host "`n✅ File transfer complete!" -ForegroundColor Green
Write-Host "`nNext: Create .env.portainer on the server and deploy" -ForegroundColor Cyan


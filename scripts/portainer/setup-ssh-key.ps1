# SSH Key Setup Script for Portainer Deployment
# This script helps copy your SSH public key to the server

param(
    [Parameter(Mandatory=$true)]
    [string]$ServerHost = "192.168.7.116",
    
    [Parameter(Mandatory=$true)]
    [string]$Username
)

$sshKeyPath = "$env:USERPROFILE\.ssh\id_ed25519.pub"

if (-not (Test-Path $sshKeyPath)) {
    Write-Host "❌ SSH key not found at $sshKeyPath" -ForegroundColor Red
    Write-Host "Generating new SSH key..." -ForegroundColor Yellow
    ssh-keygen -t ed25519 -C "$env:USERNAME@$env:COMPUTERNAME" -f "$env:USERPROFILE\.ssh\id_ed25519" -N '""'
    $sshKeyPath = "$env:USERPROFILE\.ssh\id_ed25519.pub"
}

Write-Host "📋 Your SSH Public Key:" -ForegroundColor Cyan
$publicKey = Get-Content $sshKeyPath -Raw
Write-Host $publicKey.Trim() -ForegroundColor Yellow
Write-Host ""

Write-Host "🔐 Copying key to server..." -ForegroundColor Cyan
Write-Host "You will be prompted for your password once." -ForegroundColor Yellow
Write-Host ""

# Method 1: Try using ssh-copy-id (if available via WSL or Git Bash)
$sshCopyIdCmd = "ssh-copy-id -i `"$sshKeyPath`" ${Username}@${ServerHost}"

# Method 2: Manual copy via SSH
$manualCommands = @"
mkdir -p ~/.ssh
chmod 700 ~/.ssh
echo '$($publicKey.Trim())' >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
"@

Write-Host "Attempting automatic key copy..." -ForegroundColor Yellow
try {
    # Try to use ssh with a here-document approach
    $tempScript = [System.IO.Path]::GetTempFileName()
    $manualCommands | Out-File -FilePath $tempScript -Encoding utf8
    
    ssh "${Username}@${ServerHost}" "bash -s" < $tempScript
    Remove-Item $tempScript
    
    Write-Host "✅ Key copied successfully!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Automatic copy failed. Please run manually:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "SSH into the server:" -ForegroundColor Cyan
    Write-Host "  ssh ${Username}@${ServerHost}" -ForegroundColor White
    Write-Host ""
    Write-Host "Then run these commands:" -ForegroundColor Cyan
    Write-Host $manualCommands -ForegroundColor White
    Write-Host ""
    Write-Host "Or copy this single command:" -ForegroundColor Cyan
    Write-Host "  echo '$($publicKey.Trim())' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys" -ForegroundColor White
}

Write-Host ""
Write-Host "🧪 Testing SSH connection..." -ForegroundColor Cyan
Start-Sleep -Seconds 2

try {
    $result = ssh -o ConnectTimeout=5 -o BatchMode=yes "${Username}@${ServerHost}" "echo 'SSH key authentication works!'" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ SSH key authentication is working!" -ForegroundColor Green
        Write-Host "You can now proceed with automated deployment." -ForegroundColor Green
    } else {
        Write-Host "❌ SSH key authentication failed. Please check the setup." -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Connection test failed: $_" -ForegroundColor Red
    Write-Host "Please verify the key was copied correctly." -ForegroundColor Yellow
}


# Fix Keycloak User - Clear Required Actions and Set Permanent Password
param(
    [string]$UserEmail = "tcrowden@rookapp.io",
    [string]$KeycloakUrl = "http://localhost:8080",
    [string]$AdminUser = "admin",
    [string]$AdminPass = "admin"
)

Write-Host "Fixing Keycloak user: $UserEmail" -ForegroundColor Cyan

# Get admin token
$body = @{
    grant_type = "password"
    client_id = "admin-cli"
    username = $AdminUser
    password = $AdminPass
}
$queryString = ($body.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }) -join '&'
try {
    $tokenResponse = Invoke-RestMethod -Uri "$KeycloakUrl/realms/master/protocol/openid-connect/token" `
        -Method Post -ContentType "application/x-www-form-urlencoded" `
        -Body $queryString
    $accessToken = $tokenResponse.access_token
    Write-Host "Got admin token" -ForegroundColor Green
} catch {
    Write-Host "Failed to get admin token: $_" -ForegroundColor Red
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $accessToken"
    "Content-Type" = "application/json"
}

# Find user
Write-Host "Searching for user..." -ForegroundColor Yellow
try {
    $users = Invoke-RestMethod -Uri "$KeycloakUrl/admin/realms/rook/users?email=$UserEmail" `
        -Method Get -Headers $headers
    
    if ($users.Count -eq 0) {
        Write-Host "User not found by email, trying username..." -ForegroundColor Yellow
        $username = $UserEmail.Split('@')[0]
        $users = Invoke-RestMethod -Uri "$KeycloakUrl/admin/realms/rook/users?username=$username" `
            -Method Get -Headers $headers
    }
    
    if ($users.Count -eq 0) {
        Write-Host "User not found!" -ForegroundColor Red
        exit 1
    }
    
    $user = $users[0]
    $userId = $user.id
    Write-Host "Found user: $($user.username) (ID: $userId)" -ForegroundColor Green
} catch {
    Write-Host "Failed to find user: $_" -ForegroundColor Red
    exit 1
}

# Get full user details
$fullUser = Invoke-RestMethod -Uri "$KeycloakUrl/admin/realms/rook/users/$userId" `
    -Method Get -Headers $headers

Write-Host "Current user state:" -ForegroundColor Yellow
Write-Host "  Email verified: $($fullUser.emailVerified)"
Write-Host "  Enabled: $($fullUser.enabled)"
Write-Host "  Required actions: $($fullUser.requiredActions -join ', ')"
Write-Host ""

# Update user to clear required actions and verify email
$updateData = @{
    emailVerified = $true
    enabled = $true
    requiredActions = @()
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "$KeycloakUrl/admin/realms/rook/users/$userId" `
        -Method Put -Headers $headers -Body $updateData | Out-Null
    Write-Host "Cleared required actions and verified email" -ForegroundColor Green
} catch {
    Write-Host "Failed to update user: $_" -ForegroundColor Yellow
}

# Reset password to make it permanent
Write-Host "Resetting password to make it permanent..." -ForegroundColor Yellow
$passwordData = @{
    type = "password"
    value = "Hello@22"
    temporary = $false
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "$KeycloakUrl/admin/realms/rook/users/$userId/reset-password" `
        -Method Put -Headers $headers -Body $passwordData | Out-Null
    Write-Host "Password reset and set as permanent" -ForegroundColor Green
} catch {
    Write-Host "Failed to reset password: $_" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "User should now be ready to login!" -ForegroundColor Green
Write-Host "Try logging in with: $UserEmail / Hello@22" -ForegroundColor Cyan

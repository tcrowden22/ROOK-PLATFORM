# Fix Keycloak User Email
# Ensures the admin@rook.io user has the email field set correctly
param(
    [string]$UserEmail = "admin@rook.io",
    [string]$KeycloakUrl = "http://localhost:8080",
    [string]$AdminUser = "admin",
    [string]$AdminPass = "admin",
    [string]$RealmName = "rook"
)

Write-Host "Fixing Keycloak user email: $UserEmail" -ForegroundColor Cyan

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
    Write-Host "[OK] Got admin token" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Failed to get admin token: $_" -ForegroundColor Red
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $accessToken"
    "Content-Type" = "application/json"
}

# Find user by username (admin)
$username = $UserEmail.Split('@')[0]
Write-Host "Searching for user with username: $username" -ForegroundColor Yellow
try {
    $users = Invoke-RestMethod -Uri "$KeycloakUrl/admin/realms/$RealmName/users?username=$username" `
        -Method Get -Headers $headers
    
    if ($users.Count -eq 0) {
        Write-Host "[ERROR] User not found!" -ForegroundColor Red
        exit 1
    }
    
    $user = $users[0]
    $userId = $user.id
    Write-Host "[OK] Found user: $($user.username) (ID: $userId)" -ForegroundColor Green
    Write-Host "  Current email: $($user.email)" -ForegroundColor Gray
    Write-Host "  Email verified: $($user.emailVerified)" -ForegroundColor Gray
} catch {
    Write-Host "[ERROR] Failed to find user: $_" -ForegroundColor Red
    exit 1
}

# Get full user details
$fullUser = Invoke-RestMethod -Uri "$KeycloakUrl/admin/realms/$RealmName/users/$userId" `
    -Method Get -Headers $headers

Write-Host ""
Write-Host "Current user state:" -ForegroundColor Yellow
Write-Host "  Username: $($fullUser.username)"
Write-Host "  Email: $($fullUser.email)"
Write-Host "  Email verified: $($fullUser.emailVerified)"
Write-Host "  Enabled: $($fullUser.enabled)"
Write-Host ""

# Update user to set email
$updateData = @{
    email = $UserEmail
    emailVerified = $true
    enabled = $true
    username = $username
    firstName = "Admin"
    lastName = "User"
    requiredActions = @()
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "$KeycloakUrl/admin/realms/$RealmName/users/$userId" `
        -Method Put -Headers $headers -Body $updateData | Out-Null
    Write-Host "[OK] Updated user email to: $UserEmail" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Failed to update user: $_" -ForegroundColor Red
    exit 1
}

# Verify the update
$updatedUser = Invoke-RestMethod -Uri "$KeycloakUrl/admin/realms/$RealmName/users/$userId" `
    -Method Get -Headers $headers

Write-Host ""
Write-Host "Updated user state:" -ForegroundColor Green
Write-Host "  Username: $($updatedUser.username)"
Write-Host "  Email: $($updatedUser.email)"
Write-Host "  Email verified: $($updatedUser.emailVerified)"
Write-Host ""
Write-Host "[OK] User email fixed!" -ForegroundColor Green
Write-Host "You can now login with: $UserEmail / admin" -ForegroundColor Cyan


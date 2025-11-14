# Test Keycloak Login Script
# Usage: .\scripts\test-keycloak-login.ps1 <email> <password>

param(
    [string]$Email = "admin@rook.local",
    [string]$Password = "admin"
)

$KeycloakUrl = "http://localhost:8080"
$Realm = "rook"
$ClientId = "rook-app"

Write-Host "Testing Keycloak Authentication..." -ForegroundColor Cyan
Write-Host "  Email: $Email"
Write-Host "  Realm: $Realm"
Write-Host "  Client: $ClientId"
Write-Host ""

$tokenUrl = "$KeycloakUrl/realms/$Realm/protocol/openid-connect/token"

$body = @{
    grant_type = "password"
    client_id = $ClientId
    username = $Email
    password = $Password
}

$bodyString = ($body.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }) -join '&'

try {
    $response = Invoke-WebRequest -Uri $tokenUrl `
        -Method Post `
        -Body $bodyString `
        -ContentType "application/x-www-form-urlencoded" `
        -UseBasicParsing `
        -ErrorAction Stop
    
    Write-Host "✓ SUCCESS!" -ForegroundColor Green
    $data = $response.Content | ConvertFrom-Json
    Write-Host "  Access Token: $($data.access_token.Substring(0, 50))..." -ForegroundColor Gray
    Write-Host ""
    Write-Host "Authentication successful!" -ForegroundColor Green
} catch {
    Write-Host "✗ FAILED" -ForegroundColor Red
    Write-Host "  Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Yellow
    
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $responseBody = $reader.ReadToEnd()
    $reader.Close()
    
    Write-Host "  Response: $responseBody" -ForegroundColor Yellow
    
    try {
        $errorData = $responseBody | ConvertFrom-Json
        Write-Host ""
        Write-Host "Error Details:" -ForegroundColor Red
        Write-Host "  Error: $($errorData.error)" -ForegroundColor Yellow
        Write-Host "  Description: $($errorData.error_description)" -ForegroundColor Yellow
        
        if ($errorData.error -eq "invalid_client") {
            Write-Host ""
            Write-Host "Possible fixes:" -ForegroundColor Cyan
            Write-Host "  1. Check that client '$ClientId' exists in realm '$Realm'" -ForegroundColor White
            Write-Host "  2. Enable 'Direct Access Grants' in client settings" -ForegroundColor White
        } elseif ($errorData.error -eq "invalid_grant") {
            Write-Host ""
            Write-Host "Possible fixes:" -ForegroundColor Cyan
            Write-Host "  1. Check that user '$Email' exists in Keycloak" -ForegroundColor White
            Write-Host "  2. Verify the password is correct" -ForegroundColor White
            Write-Host "  3. Make sure user account is enabled" -ForegroundColor White
            Write-Host "  4. Check if 'Direct Access Grants' is enabled at realm level" -ForegroundColor White
        }
    } catch {
        Write-Host "  Could not parse error response" -ForegroundColor Yellow
    }
}


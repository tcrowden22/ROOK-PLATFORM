# Configure Keycloak Realm for Rook
param(
    [string]$KeycloakUrl = "http://localhost:8080",
    [string]$AdminUser = "admin",
    [string]$AdminPass = "admin"
)

Write-Host "Configuring Keycloak realm 'rook'..." -ForegroundColor Cyan

# Get admin token
Write-Host "Getting admin token..." -ForegroundColor Yellow
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

# Update realm with Odin branding
Write-Host "Updating realm with Odin branding..." -ForegroundColor Yellow
$realmConfig = @{
    displayName = "Odin"
    displayNameHtml = "<strong>Odin</strong> SSO"
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "$KeycloakUrl/admin/realms/rook" `
        -Method Put -Headers $headers -Body $realmConfig | Out-Null
    Write-Host "Updated realm display name to Odin" -ForegroundColor Green
} catch {
    Write-Host "Failed to update realm: $_" -ForegroundColor Yellow
}

# Create client
Write-Host "Creating client 'rook-app'..." -ForegroundColor Yellow
try {
    $clients = Invoke-RestMethod -Uri "$KeycloakUrl/admin/realms/rook/clients?clientId=rook-app" `
        -Method Get -Headers $headers -ErrorAction SilentlyContinue
    $clientExists = $clients -and $clients.Count -gt 0
} catch {
    $clientExists = $false
}

if (-not $clientExists) {
    $clientConfig = @{
        clientId = "rook-app"
        enabled = $true
        publicClient = $true
        standardFlowEnabled = $true
        implicitFlowEnabled = $false
        directAccessGrantsEnabled = $true
        redirectUris = @("http://localhost:5173/*")
        webOrigins = @("http://localhost:5173")
        protocol = "openid-connect"
        attributes = @{
            "pkce.code.challenge.method" = "S256"
        }
    } | ConvertTo-Json -Depth 10
    
    try {
        Invoke-RestMethod -Uri "$KeycloakUrl/admin/realms/rook/clients" `
            -Method Post -Headers $headers -Body $clientConfig | Out-Null
        Write-Host "Created client 'rook-app'" -ForegroundColor Green
    } catch {
        Write-Host "Failed to create client: $_" -ForegroundColor Yellow
    }
} else {
    Write-Host "Client 'rook-app' already exists" -ForegroundColor Gray
}

# Create roles
Write-Host "Creating roles..." -ForegroundColor Yellow
$roles = @("admin", "agent", "user")
foreach ($role in $roles) {
    try {
        Invoke-RestMethod -Uri "$KeycloakUrl/admin/realms/rook/roles/$role" `
            -Method Get -Headers $headers -ErrorAction Stop | Out-Null
        Write-Host "  Role $role exists" -ForegroundColor Gray
    } catch {
        $roleConfig = @{ name = $role } | ConvertTo-Json
        try {
            Invoke-RestMethod -Uri "$KeycloakUrl/admin/realms/rook/roles" `
                -Method Post -Headers $headers -Body $roleConfig | Out-Null
            Write-Host "  Created role $role" -ForegroundColor Green
        } catch {
            Write-Host "  Failed to create role $role : $_" -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Write-Host "Keycloak realm configuration complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Create users in Keycloak Admin Console: $KeycloakUrl" -ForegroundColor White
Write-Host "2. Assign roles (admin, agent, or user) to users" -ForegroundColor White
Write-Host "3. Login page will show Odin instead of Keycloak" -ForegroundColor White
Write-Host ""

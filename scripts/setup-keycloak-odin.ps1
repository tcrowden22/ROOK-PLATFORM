# Keycloak Setup Script with Odin Branding
# Creates the 'rook' realm, 'rook-app' client, and configures Odin branding

param(
    [string]$KeycloakUrl = "http://localhost:8080",
    [string]$AdminUser = "admin",
    [string]$AdminPass
)

if (-not $AdminPass) {
    $AdminPass = $env:KEYCLOAK_ADMIN_PASSWORD
    if (-not $AdminPass) {
        $AdminPass = "admin"
    }
}

Write-Host "Setting up Keycloak with Odin branding..." -ForegroundColor Cyan

# Wait for Keycloak
Write-Host "Waiting for Keycloak..." -ForegroundColor Yellow
$maxWait = 120
$elapsed = 0
while ($elapsed -lt $maxWait) {
    try {
        $response = Invoke-WebRequest -Uri "$KeycloakUrl/health/ready" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "✓ Keycloak ready" -ForegroundColor Green
            break
        }
    } catch {
        Start-Sleep -Seconds 2
        $elapsed += 2
        if ($elapsed % 10 -eq 0) {
            $seconds = $elapsed.ToString()
            Write-Host "  Still waiting... ($seconds seconds)" -ForegroundColor Gray
        }
    }
}

if ($elapsed -ge $maxWait) {
    Write-Host "X Keycloak did not become ready" -ForegroundColor Red
    exit 1
}

# Get admin token
Write-Host "Getting admin token..." -ForegroundColor Yellow
try {
    $body = @{
        grant_type = "password"
        client_id = "admin-cli"
        username = $AdminUser
        password = $AdminPass
    }
    $queryString = ($body.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }) -join '&'
    $tokenResponse = Invoke-RestMethod -Uri "$KeycloakUrl/realms/master/protocol/openid-connect/token" `
        -Method Post -ContentType "application/x-www-form-urlencoded" `
        -Body $queryString
    $accessToken = $tokenResponse.access_token
    Write-Host "✓ Got admin token" -ForegroundColor Green
} catch {
    Write-Host "X Failed to get admin token: $_" -ForegroundColor Red
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $accessToken"
    "Content-Type" = "application/json"
}

# Create or update realm
Write-Host "Setting up 'rook' realm..." -ForegroundColor Yellow
try {
    $realmCheck = Invoke-RestMethod -Uri "$KeycloakUrl/admin/realms/rook" `
        -Method Get -Headers $headers -ErrorAction SilentlyContinue
    Write-Host "  Realm 'rook' exists, updating..." -ForegroundColor Gray
    $realmExists = $true
} catch {
    $realmExists = $false
}

$realmConfig = @{
    realm = "rook"
    enabled = $true
    displayName = "Odin"
    displayNameHtml = "<strong>Odin</strong> SSO"
    loginTheme = "keycloak"
    accountTheme = "keycloak"
    adminTheme = "keycloak"
    emailTheme = "keycloak"
} | ConvertTo-Json

try {
    if ($realmExists) {
        Invoke-RestMethod -Uri "$KeycloakUrl/admin/realms/rook" `
            -Method Put -Headers $headers -Body $realmConfig | Out-Null
        Write-Host "  ✓ Updated realm with Odin branding" -ForegroundColor Gray
    } else {
        Invoke-RestMethod -Uri "$KeycloakUrl/admin/realms" `
            -Method Post -Headers $headers -Body $realmConfig | Out-Null
        Write-Host "  ✓ Created realm with Odin branding" -ForegroundColor Gray
    }
} catch {
            Write-Host "  X Failed to configure realm: $_" -ForegroundColor Yellow
}

# Create or update client
Write-Host "Setting up 'rook-app' client..." -ForegroundColor Yellow
try {
    $clients = Invoke-RestMethod -Uri "$KeycloakUrl/admin/realms/rook/clients?clientId=rook-app" `
        -Method Get -Headers $headers
    $clientExists = $clients.Count -gt 0
} catch {
    $clientExists = $false
}

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
    if ($clientExists) {
        $clientId = $clients[0].id
        Invoke-RestMethod -Uri "$KeycloakUrl/admin/realms/rook/clients/$clientId" `
            -Method Put -Headers $headers -Body $clientConfig | Out-Null
        Write-Host "  ✓ Updated client" -ForegroundColor Gray
    } else {
        Invoke-RestMethod -Uri "$KeycloakUrl/admin/realms/rook/clients" `
            -Method Post -Headers $headers -Body $clientConfig | Out-Null
        Write-Host "  ✓ Created client" -ForegroundColor Gray
    }
} catch {
            Write-Host "  X Failed to configure client: $_" -ForegroundColor Yellow
}

# Create roles
Write-Host "Creating roles..." -ForegroundColor Yellow
$roles = @("admin", "agent", "user")
foreach ($role in $roles) {
    try {
        Invoke-RestMethod -Uri "$KeycloakUrl/admin/realms/rook/roles/$role" `
            -Method Get -Headers $headers -ErrorAction Stop | Out-Null
        Write-Host "  ✓ Role '$role' exists" -ForegroundColor Gray
    } catch {
        $roleConfig = @{ name = $role } | ConvertTo-Json
        try {
            Invoke-RestMethod -Uri "$KeycloakUrl/admin/realms/rook/roles" `
                -Method Post -Headers $headers -Body $roleConfig | Out-Null
            Write-Host "  ✓ Created role '$role'" -ForegroundColor Gray
        } catch {
            Write-Host "  X Failed to create role '$role': $_" -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Write-Host "✓ Keycloak setup complete with Odin branding!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Create users in Keycloak Admin Console: $KeycloakUrl" -ForegroundColor White
Write-Host "2. Assign roles (admin, agent, or user) to users" -ForegroundColor White
Write-Host "3. Login page will show 'Odin' instead of 'Keycloak'" -ForegroundColor White
Write-Host ""


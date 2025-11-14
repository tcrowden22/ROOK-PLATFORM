#!/usr/bin/env pwsh
# Keycloak Setup Script for Rook Platform
# Creates the 'rook' realm and 'rook-app' client

$KEYCLOAK_URL = "http://localhost:8080"
$ADMIN_USER = "admin"
$ADMIN_PASS = $env:KEYCLOAK_ADMIN_PASSWORD
if (-not $ADMIN_PASS) {
    $ADMIN_PASS = "admin"
}

Write-Host "Setting up Keycloak realm and client..." -ForegroundColor Cyan

# Wait for Keycloak to be ready
Write-Host "Waiting for Keycloak to be ready..." -ForegroundColor Yellow
$maxWait = 120
$elapsed = 0
while ($elapsed -lt $maxWait) {
    try {
        $response = Invoke-WebRequest -Uri "$KEYCLOAK_URL/health/ready" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "✓ Keycloak is ready!" -ForegroundColor Green
            break
        }
    } catch {
        Start-Sleep -Seconds 2
        $elapsed += 2
        Write-Host "Waiting... ($elapsed seconds)" -ForegroundColor Gray
    }
}

if ($elapsed -ge $maxWait) {
    Write-Host "✗ Keycloak did not become ready in time" -ForegroundColor Red
    exit 1
}

# Get admin access token
Write-Host "Getting admin access token..." -ForegroundColor Yellow
try {
    $tokenResponse = Invoke-RestMethod -Uri "$KEYCLOAK_URL/realms/master/protocol/openid-connect/token" `
        -Method Post `
        -ContentType "application/x-www-form-urlencoded" `
        -Body "grant_type=password&client_id=admin-cli&username=$ADMIN_USER&password=$ADMIN_PASS"
    
    $accessToken = $tokenResponse.access_token
    Write-Host "✓ Got admin token" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to get admin token: $_" -ForegroundColor Red
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $accessToken"
    "Content-Type" = "application/json"
}

# Check if realm exists
Write-Host "Checking if 'rook' realm exists..." -ForegroundColor Yellow
try {
    $realmCheck = Invoke-RestMethod -Uri "$KEYCLOAK_URL/admin/realms/rook" `
        -Method Get `
        -Headers $headers `
        -ErrorAction Stop
    Write-Host "✓ Realm 'rook' already exists" -ForegroundColor Green
} catch {
    # Realm doesn't exist, create it
    Write-Host "Creating 'rook' realm..." -ForegroundColor Yellow
    $realmConfig = @{
        realm = "rook"
        enabled = $true
        displayName = "Rook IT Operations Platform"
    } | ConvertTo-Json
    
    try {
        Invoke-RestMethod -Uri "$KEYCLOAK_URL/admin/realms" `
            -Method Post `
            -Headers $headers `
            -Body $realmConfig `
            -ErrorAction Stop
        Write-Host "✓ Created 'rook' realm" -ForegroundColor Green
    } catch {
        Write-Host "✗ Failed to create realm: $_" -ForegroundColor Red
        exit 1
    }
}

# Check if client exists
Write-Host "Checking if 'rook-app' client exists..." -ForegroundColor Yellow
try {
    $clientCheck = Invoke-RestMethod -Uri "$KEYCLOAK_URL/admin/realms/rook/clients?clientId=rook-app" `
        -Method Get `
        -Headers $headers `
        -ErrorAction Stop
    
    if ($clientCheck.Count -gt 0) {
        Write-Host "✓ Client 'rook-app' already exists" -ForegroundColor Green
    } else {
        throw "Client not found"
    }
} catch {
    # Client doesn't exist, create it
    Write-Host "Creating 'rook-app' client..." -ForegroundColor Yellow
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
        Invoke-RestMethod -Uri "$KEYCLOAK_URL/admin/realms/rook/clients" `
            -Method Post `
            -Headers $headers `
            -Body $clientConfig `
            -ErrorAction Stop
        Write-Host "✓ Created 'rook-app' client" -ForegroundColor Green
    } catch {
        Write-Host "✗ Failed to create client: $_" -ForegroundColor Red
        exit 1
    }
}

# Create roles
Write-Host "Creating roles..." -ForegroundColor Yellow
$roles = @("admin", "agent", "user")
foreach ($role in $roles) {
    try {
        $roleCheck = Invoke-RestMethod -Uri "$KEYCLOAK_URL/admin/realms/rook/roles/$role" `
            -Method Get `
            -Headers $headers `
            -ErrorAction Stop
        Write-Host "  ✓ Role '$role' already exists" -ForegroundColor Gray
    } catch {
        $roleConfig = @{
            name = $role
        } | ConvertTo-Json
        
        try {
            Invoke-RestMethod -Uri "$KEYCLOAK_URL/admin/realms/rook/roles" `
                -Method Post `
                -Headers $headers `
                -Body $roleConfig `
                -ErrorAction Stop
            Write-Host "  ✓ Created role '$role'" -ForegroundColor Gray
        } catch {
            Write-Host "  ✗ Failed to create role '$role': $_" -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Write-Host "✓ Keycloak setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Access Keycloak Admin Console: http://localhost:8080" -ForegroundColor White
Write-Host "2. Login with: admin / $ADMIN_PASS" -ForegroundColor White
Write-Host "3. Create users in the 'rook' realm" -ForegroundColor White
Write-Host "4. Assign roles to users (admin, agent, or user)" -ForegroundColor White
Write-Host ""


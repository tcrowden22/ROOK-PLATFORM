# Keycloak Standard Setup Script
# Automatically creates the 'rook' realm, 'rook-app' client, roles, and standard admin user
# Usage: .\scripts\setup-keycloak-standard.ps1

param(
    [string]$KeycloakUrl = "http://localhost:8080",
    [string]$AdminUser = "admin",
    [string]$AdminPass,
    [string]$RealmName = "rook",
    [string]$ClientId = "rook-app",
    [string]$StandardUserEmail = "admin@rook.io",
    [string]$StandardUserPassword = "admin",
    [string]$StandardUserRole = "admin"
)

if (-not $AdminPass) {
    $AdminPass = $env:KEYCLOAK_ADMIN_PASSWORD
    if (-not $AdminPass) {
        $AdminPass = "admin"
    }
}

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Keycloak Standard Setup" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Wait for Keycloak
Write-Host "Waiting for Keycloak..." -ForegroundColor Yellow
$maxWait = 120
$elapsed = 0
while ($elapsed -lt $maxWait) {
    try {
        $response = Invoke-WebRequest -Uri "$KeycloakUrl/health/ready" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "[OK] Keycloak ready" -ForegroundColor Green
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
    Write-Host "[ERROR] Keycloak did not become ready" -ForegroundColor Red
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
    Write-Host "[OK] Got admin token" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Failed to get admin token: $_" -ForegroundColor Red
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $accessToken"
    "Content-Type" = "application/json"
}

# Create or update realm
Write-Host "Setting up '$RealmName' realm..." -ForegroundColor Yellow
try {
    $realmCheck = Invoke-RestMethod -Uri "$KeycloakUrl/admin/realms/$RealmName" `
        -Method Get -Headers $headers -ErrorAction SilentlyContinue
    Write-Host "  Realm '$RealmName' exists, updating..." -ForegroundColor Gray
    $realmExists = $true
} catch {
    $realmExists = $false
}

$realmConfig = @{
    realm = $RealmName
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
        Invoke-RestMethod -Uri "$KeycloakUrl/admin/realms/$RealmName" `
            -Method Put -Headers $headers -Body $realmConfig | Out-Null
        Write-Host "  [OK] Updated realm with Odin branding" -ForegroundColor Gray
    } else {
        Invoke-RestMethod -Uri "$KeycloakUrl/admin/realms" `
            -Method Post -Headers $headers -Body $realmConfig | Out-Null
        Write-Host "  [OK] Created realm with Odin branding" -ForegroundColor Gray
    }
} catch {
    Write-Host "  [WARN] Failed to configure realm: $_" -ForegroundColor Yellow
}

# Create or update client
Write-Host "Setting up '$ClientId' client..." -ForegroundColor Yellow
try {
    $clients = Invoke-RestMethod -Uri "$KeycloakUrl/admin/realms/$RealmName/clients?clientId=$ClientId" `
        -Method Get -Headers $headers
    $clientExists = $clients.Count -gt 0
} catch {
    $clientExists = $false
}

$clientConfig = @{
    clientId = $ClientId
    enabled = $true
    publicClient = $true
    standardFlowEnabled = $true
    implicitFlowEnabled = $false
    directAccessGrantsEnabled = $true
    redirectUris = @("http://localhost:5173/*", "http://localhost/*", "http://localhost:3000/*")
    webOrigins = @("http://localhost:5173", "http://localhost", "http://localhost:3000")
    protocol = "openid-connect"
    attributes = @{
        "pkce.code.challenge.method" = "S256"
    }
} | ConvertTo-Json -Depth 10

try {
    if ($clientExists) {
        $clientId_obj = $clients[0].id
        Invoke-RestMethod -Uri "$KeycloakUrl/admin/realms/$RealmName/clients/$clientId_obj" `
            -Method Put -Headers $headers -Body $clientConfig | Out-Null
        Write-Host "  [OK] Updated client" -ForegroundColor Gray
    } else {
        Invoke-RestMethod -Uri "$KeycloakUrl/admin/realms/$RealmName/clients" `
            -Method Post -Headers $headers -Body $clientConfig | Out-Null
        Write-Host "  [OK] Created client" -ForegroundColor Gray
    }
} catch {
    Write-Host "  [WARN] Failed to configure client: $_" -ForegroundColor Yellow
}

# Create roles
Write-Host "Creating roles..." -ForegroundColor Yellow
$roles = @("admin", "agent", "user")
foreach ($role in $roles) {
    try {
        Invoke-RestMethod -Uri "$KeycloakUrl/admin/realms/$RealmName/roles/$role" `
            -Method Get -Headers $headers -ErrorAction Stop | Out-Null
        Write-Host "  [OK] Role '$role' exists" -ForegroundColor Gray
    } catch {
        $roleConfig = @{ name = $role } | ConvertTo-Json
        try {
            Invoke-RestMethod -Uri "$KeycloakUrl/admin/realms/$RealmName/roles" `
                -Method Post -Headers $headers -Body $roleConfig | Out-Null
            Write-Host "  [OK] Created role '$role'" -ForegroundColor Gray
        } catch {
            Write-Host "  [WARN] Failed to create role '$role': $_" -ForegroundColor Yellow
        }
    }
}

# Create or update standard admin user
Write-Host "Setting up standard admin user..." -ForegroundColor Yellow
Write-Host "  Email: $StandardUserEmail" -ForegroundColor Gray
Write-Host "  Password: $StandardUserPassword" -ForegroundColor Gray
Write-Host "  Role: $StandardUserRole" -ForegroundColor Gray

try {
    # Search for user by email
    $users = @()
    try {
        $users = Invoke-RestMethod -Uri "$KeycloakUrl/admin/realms/$RealmName/users?email=$StandardUserEmail" `
            -Method Get -Headers $headers -ErrorAction SilentlyContinue
    } catch {
        # Try searching by username
        $username = $StandardUserEmail.Split('@')[0]
        try {
            $users = Invoke-RestMethod -Uri "$KeycloakUrl/admin/realms/$RealmName/users?username=$username" `
                -Method Get -Headers $headers -ErrorAction SilentlyContinue
        } catch {
            # User doesn't exist
        }
    }
    
    if ($users -and $users.Count -gt 0) {
        $userId = $users[0].id
        Write-Host "  [OK] User already exists (ID: $userId)" -ForegroundColor Gray
        
        # Update user - ensure email is set
        $userUpdate = @{
            email = $StandardUserEmail
            emailVerified = $true
            enabled = $true
            username = $StandardUserEmail.Split('@')[0]
            firstName = "Admin"
            lastName = "User"
            requiredActions = @()
        } | ConvertTo-Json
        
        # Also try to update if user exists but email is missing
        try {
            $existingUser = Invoke-RestMethod -Uri "$KeycloakUrl/admin/realms/$RealmName/users/$userId" `
                -Method Get -Headers $headers
            if (-not $existingUser.email -or $existingUser.email -ne $StandardUserEmail) {
                Write-Host "  User exists but email missing or incorrect, updating..." -ForegroundColor Yellow
            }
        } catch {
            # Continue with update
        }
        
        try {
            Invoke-RestMethod -Uri "$KeycloakUrl/admin/realms/$RealmName/users/$userId" `
                -Method Put -Headers $headers -Body $userUpdate | Out-Null
            Write-Host "  [OK] Updated user" -ForegroundColor Green
        } catch {
            Write-Host "  [WARN] Failed to update user: $_" -ForegroundColor Yellow
        }
    } else {
        # Create new user
        $userCreate = @{
            email = $StandardUserEmail
            emailVerified = $true
            enabled = $true
            username = $StandardUserEmail.Split('@')[0]
            firstName = "Admin"
            lastName = "User"
            requiredActions = @()
        } | ConvertTo-Json
        
        try {
            Invoke-RestMethod -Uri "$KeycloakUrl/admin/realms/$RealmName/users" `
                -Method Post -Headers $headers -Body $userCreate | Out-Null
            Write-Host "  [OK] Created user" -ForegroundColor Green
            
            # Get the user ID (search again after creation)
            Start-Sleep -Seconds 1
            $users = Invoke-RestMethod -Uri "$KeycloakUrl/admin/realms/$RealmName/users?email=$StandardUserEmail" `
                -Method Get -Headers $headers
            if ($users -and $users.Count -gt 0) {
                $userId = $users[0].id
            } else {
                # Try username search
                $username = $StandardUserEmail.Split('@')[0]
                $users = Invoke-RestMethod -Uri "$KeycloakUrl/admin/realms/$RealmName/users?username=$username" `
                    -Method Get -Headers $headers
                if ($users -and $users.Count -gt 0) {
                    $userId = $users[0].id
                }
            }
        } catch {
            Write-Host "  [WARN] Failed to create user: $_" -ForegroundColor Yellow
            # Try to find existing user by username
            $username = $StandardUserEmail.Split('@')[0]
            try {
                $users = Invoke-RestMethod -Uri "$KeycloakUrl/admin/realms/$RealmName/users?username=$username" `
                    -Method Get -Headers $headers
                if ($users -and $users.Count -gt 0) {
                    $userId = $users[0].id
                    Write-Host "  [OK] Found existing user by username" -ForegroundColor Gray
                } else {
                    $userId = $null
                }
            } catch {
                $userId = $null
            }
        }
    }
    
    if ($userId) {
        # Set password
        Write-Host "  Setting password..." -ForegroundColor Gray
        $passwordData = @{
            type = "password"
            value = $StandardUserPassword
            temporary = $false
        } | ConvertTo-Json
        
        try {
            Invoke-RestMethod -Uri "$KeycloakUrl/admin/realms/$RealmName/users/$userId/reset-password" `
                -Method Put -Headers $headers -Body $passwordData | Out-Null
            Write-Host "  [OK] Password set" -ForegroundColor Green
        } catch {
            Write-Host "  [WARN] Failed to set password: $_" -ForegroundColor Yellow
        }
        
        # Assign role
        Write-Host "  Assigning role '$StandardUserRole'..." -ForegroundColor Gray
        try {
            # Get role details
            $role = Invoke-RestMethod -Uri "$KeycloakUrl/admin/realms/$RealmName/roles/$StandardUserRole" `
                -Method Get -Headers $headers
            
            # Check if user already has the role
            $userRoles = Invoke-RestMethod -Uri "$KeycloakUrl/admin/realms/$RealmName/users/$userId/role-mappings/realm" `
                -Method Get -Headers $headers -ErrorAction SilentlyContinue
            
            $hasRole = $false
            if ($userRoles) {
                foreach ($userRole in $userRoles) {
                    if ($userRole.name -eq $StandardUserRole) {
                        $hasRole = $true
                        break
                    }
                }
            }
            
            if (-not $hasRole) {
                # Assign realm role to user (send as array)
                $roleAssign = @($role) | ConvertTo-Json
                Invoke-RestMethod -Uri "$KeycloakUrl/admin/realms/$RealmName/users/$userId/role-mappings/realm" `
                    -Method Post -Headers $headers -Body $roleAssign | Out-Null
                Write-Host "  [OK] Assigned role '$StandardUserRole'" -ForegroundColor Green
            } else {
                Write-Host "  [OK] User already has role '$StandardUserRole'" -ForegroundColor Gray
            }
        } catch {
            Write-Host "  [WARN] Failed to assign role: $_" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "  [ERROR] Failed to setup user: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "[OK] Keycloak Standard Setup Complete!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Standard Admin User:" -ForegroundColor Cyan
Write-Host "  Email: $StandardUserEmail" -ForegroundColor White
Write-Host "  Password: $StandardUserPassword" -ForegroundColor White
Write-Host "  Role: $StandardUserRole" -ForegroundColor White
Write-Host ""
Write-Host "You can now login to the application with:" -ForegroundColor Cyan
Write-Host "  Email: $StandardUserEmail" -ForegroundColor White
Write-Host "  Password: $StandardUserPassword" -ForegroundColor White
Write-Host ""
Write-Host "Keycloak Admin Console: $KeycloakUrl" -ForegroundColor Gray
Write-Host ""

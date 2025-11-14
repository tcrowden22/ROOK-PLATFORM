#!/bin/sh
# Kong route setup script
# This script configures Kong services and routes via Admin API

set -e

KONG_ADMIN="http://localhost:8001"

# Wait for Kong to be ready
until wget --spider -q "$KONG_ADMIN/status" 2>/dev/null; do
  echo "Waiting for Kong Admin API..."
  sleep 2
done

echo "Setting up Kong services and routes..."

# Create API service
wget -qO- --post-data="name=api-service&url=http://api:3000" "$KONG_ADMIN/services" > /dev/null 2>&1 || echo "API service may already exist"

# Create Gateway service  
wget -qO- --post-data="name=gateway-service&url=http://gateway:35000" "$KONG_ADMIN/services" > /dev/null 2>&1 || echo "Gateway service may already exist"

# Create Frontend service
wget -qO- --post-data="name=frontend-service&url=http://frontend:80" "$KONG_ADMIN/services" > /dev/null 2>&1 || echo "Frontend service may already exist"

# Get service IDs and create routes
API_SERVICE_ID=$(wget -qO- "$KONG_ADMIN/services/api-service" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
GATEWAY_SERVICE_ID=$(wget -qO- "$KONG_ADMIN/services/gateway-service" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
FRONTEND_SERVICE_ID=$(wget -qO- "$KONG_ADMIN/services/frontend-service" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

# Create API route
if [ -n "$API_SERVICE_ID" ]; then
  wget -qO- --post-data="name=api-route&paths[]=/api&service.id=$API_SERVICE_ID" "$KONG_ADMIN/routes" > /dev/null 2>&1 || echo "API route may already exist"
fi

# Create Agents route
if [ -n "$GATEWAY_SERVICE_ID" ]; then
  wget -qO- --post-data="name=agents-route&paths[]=/agents&service.id=$GATEWAY_SERVICE_ID" "$KONG_ADMIN/routes" > /dev/null 2>&1 || echo "Agents route may already exist"
fi

# Create Frontend route
if [ -n "$FRONTEND_SERVICE_ID" ]; then
  wget -qO- --post-data="name=frontend-route&paths[]=/&service.id=$FRONTEND_SERVICE_ID" "$KONG_ADMIN/routes" > /dev/null 2>&1 || echo "Frontend route may already exist"
fi

# Enable Prometheus plugin globally
wget -qO- --post-data="name=prometheus&config.per_consumer=false" "$KONG_ADMIN/plugins" > /dev/null 2>&1 || echo "Prometheus plugin may already exist"

echo "Kong setup complete!"


#!/bin/bash

# Manual Migration Script for Production VPS
# Run this on the production VPS to add missing deleted_at column

set -e

echo "=== Database Migration Script ==="
echo "Timestamp: $(date)"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "Please run as root (use sudo)"
  exit 1
fi

# Navigate to project directory
cd /root/eplc-test-api || exit 1

echo "Project directory: $(pwd)"
echo ""

# Check if Bun is installed
if ! command -v bun &> /dev/null; then
  echo "Error: Bun is not installed. Please install Bun first."
  echo "Install: curl -fsSL https://bun.sh/install | bash"
  exit 1
fi

# Backup database before migration
echo "Step 1: Creating backup..."
cp tasks.db tasks.db.backup-$(date +%Y%m%d-%H%M%S)
echo "Backup created: tasks.db.backup-$(date +%Y%m%d-%H%M%S)"
echo ""

# Run migration using Bun
echo "Step 2: Running migration..."
bun migrate || {
  echo "Migration failed. Restoring backup..."
  cp tasks.db.backup-$(date +%Y%m%d-%H%M%S) tasks.db
  exit 1
}

echo ""

echo "Step 3: Restarting service..."
systemctl restart eplc-test-api
sleep 3
systemctl status eplc-test-api --no-pager

echo ""
echo "=== Migration completed successfully! ==="

echo ""
echo "Testing endpoint now..."
echo "Login to get token..."

# Test endpoints
REGISTER_RESPONSE=$(curl -s -X POST http://127.0.0.1:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Migration Verify User",
    "email": "verify-'$(date +%s)'@test.com",
    "password": "test123"
  }')

echo "Register response: $REGISTER_RESPONSE"

LOGIN_RESPONSE=$(curl -s -X POST http://127.0.0.1:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "verify-'$(date +%s)'@test.com",
    "password": "test123"
  }')

echo "Login response: $LOGIN_RESPONSE"

# Extract token (remove asterisks)
TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | sed 's/"token":"//;s/"//g')

if [ -z "$TOKEN" ]; then
  echo "Failed to get token"
  exit 1
fi

echo "Testing GET /tasks endpoint..."
curl -s -X GET http://127.0.0.1:3001/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -w "\nHTTP Status: %{http_code}\n"

echo ""
echo "=== Script completed ==="

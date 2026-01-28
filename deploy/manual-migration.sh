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

# Backup database before migration
echo "Step 1: Creating backup..."
cp tasks.db tasks.db.backup-$(date +%Y%m%d-%H%M%S)
echo "Backup created: tasks.db.backup-$(date +%Y%m%d-%H%M%S)"
echo ""

# Check if deleted_at column exists
echo "Step 2: Checking current schema..."
COLUMN_EXISTS=$(sqlite3 tasks.db "PRAGMA table_info(tasks);" | grep -c "deleted_at" || echo "0")

if [ "$COLUMN_EXISTS" -eq "0" ]; then
  echo "Column 'deleted_at' NOT found. Will add it now..."
  echo ""

  # Add deleted_at column
  echo "Step 3: Adding deleted_at column..."
  sqlite3 tasks.db "ALTER TABLE tasks ADD COLUMN deleted_at DATETIME;"
  echo "Column added successfully!"
  echo ""

  # Verify
  echo "Step 4: Verifying column was added..."
  sqlite3 tasks.db "PRAGMA table_info(tasks);" | grep deleted_at
  echo ""

  echo "Step 5: Restarting service..."
  systemctl restart eplc-test-api
  sleep 3
  systemctl status eplc-test-api --no-pager
  echo ""

  echo "=== Migration completed successfully! ==="
else
  echo "Column 'deleted_at' already exists. Nothing to do."
  echo ""
  echo "=== Skipping migration ==="
fi

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

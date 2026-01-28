# Database Migration

## Issue

Production database missing `deleted_at` column in `tasks` table, causing error 500 when accessing task endpoints.

## Solution

Run migration script to add `deleted_at` column to existing database.

## Automatic Deployment

The migration will run automatically during deployment via GitHub Actions workflow:

```yaml
bun migrate
```

This is executed during deployment in `.github/workflows/deployment.yml`.

## Manual Migration

If you need to run migration manually before next deployment:

### Method 1: Via SSH

```bash
# SSH to production server
ssh root@your-vps-ip

# Navigate to project directory
cd /root/eplc-test-api

# Run migration
bun migrate

# Restart service
systemctl restart eplc-test-api

# Check status
systemctl status eplc-test-api
```

### Method 2: Via SSH with one-liner

```bash
ssh root@your-vps-ip "cd /root/eplc-test-api && bun migrate && systemctl restart eplc-test-api"
```

### Method 3: Using SQLite directly

```bash
# SSH to production server
ssh root@your-vps-ip

# Navigate to project directory
cd /root/eplc-test-api

# Backup database first
cp tasks.db tasks.db.backup

# Add column directly
sqlite3 tasks.db "ALTER TABLE tasks ADD COLUMN deleted_at DATETIME;"

# Restart service
systemctl restart eplc-test-api
```

## Verification

After migration, verify the column exists:

```bash
# SSH to server
ssh root@your-vps-ip
cd /root/eplc-test-api

# Check schema
sqlite3 tasks.db "PRAGMA table_info(tasks);"
```

Expected output should include:

```
...
7|deleted_at|DATETIME|0||0
```

## Testing

Test the endpoint after migration:

```bash
# Get current token (replace with your actual token)
TOKEN="secret-token-123:YOUR_USER_ID"

# Test GET /tasks endpoint
curl -X GET https://eplc-test.rokimiftah.id/tasks \
  -H "Authorization: Bearer $TOKEN"
```

Expected response:

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": N,
    "totalPages": M,
    "hasNext": false,
    "hasPrev": false
  }
}
```

## Migration Script

The migration script (`migrate.ts`) checks if `deleted_at` column exists:

- If exists: Skips migration (idempotent)
- If missing: Adds `deleted_at` column using ALTER TABLE
- All existing rows will have `deleted_at = NULL`

This ensures the script is safe to run multiple times.

## Troubleshooting

### Migration Failed

```bash
# Check logs
journalctl -u eplc-test-api -n 50

# Check database permissions
ls -la /root/eplc-test-api/tasks.db

# Restore from backup if needed
cp tasks.db.backup tasks.db
systemctl restart eplc-test-api
```

### 500 Error Persists

```bash
# Verify column exists
sqlite3 /root/eplc-test-api/tasks.db "PRAGMA table_info(tasks);" | grep deleted_at

# Check application logs
journalctl -u eplc-test-api -f

# Restart service
systemctl restart eplc-test-api
```

## Future Migrations

For future schema changes:

1. Create migration script in `migrations/` directory
2. Add migration command to deployment workflow
3. Update this documentation
4. Test migration in development environment first

## Rollback

If migration causes issues:

```bash
# SSH to server
ssh root@your-vps-ip
cd /root/eplc-test-api

# Stop service
systemctl stop eplc-test-api

# Restore from backup
cp tasks.db.backup tasks.db

# Start service
systemctl start eplc-test-api

# Verify
systemctl status eplc-test-api
```

Note: Removing the column would require recreating the table, which is more complex. Using backups is the safest rollback method.

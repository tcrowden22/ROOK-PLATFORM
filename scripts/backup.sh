#!/bin/bash

# Automated Database Backup Script
# Creates daily backups with retention policy

set -e

# Configuration
DB_URL="${DATABASE_URL:-postgresql://postgres:changeme@localhost:5432/rook}"
BACKUP_DIR="${BACKUP_DIR:-backups}"
RETENTION_DAILY=7
RETENTION_WEEKLY=4
RETENTION_MONTHLY=12

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Generate backup filename
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DAY_OF_WEEK=$(date +%u)  # 1-7 (Monday-Sunday)
DAY_OF_MONTH=$(date +%d)  # 01-31

# Determine backup type
if [ "$DAY_OF_MONTH" = "01" ]; then
    BACKUP_TYPE="monthly"
    BACKUP_FILE="${BACKUP_DIR}/rook_backup_monthly_${TIMESTAMP}.sql"
elif [ "$DAY_OF_WEEK" = "1" ]; then
    BACKUP_TYPE="weekly"
    BACKUP_FILE="${BACKUP_DIR}/rook_backup_weekly_${TIMESTAMP}.sql"
else
    BACKUP_TYPE="daily"
    BACKUP_FILE="${BACKUP_DIR}/rook_backup_daily_${TIMESTAMP}.sql"
fi

echo "Creating $BACKUP_TYPE backup..."
echo "Target: $BACKUP_FILE"

# Create backup
pg_dump "$DB_URL" \
    --no-owner \
    --no-acl \
    --clean \
    --if-exists \
    --verbose \
    > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    # Compress backup
    gzip "$BACKUP_FILE"
    BACKUP_FILE="${BACKUP_FILE}.gz"
    
    echo "✓ Backup created: $BACKUP_FILE"
    echo "Size: $(du -h "$BACKUP_FILE" | cut -f1)"
    
    # Cleanup old backups
    echo "Cleaning up old backups..."
    
    # Remove daily backups older than retention period
    find "$BACKUP_DIR" -name "rook_backup_daily_*.sql.gz" -mtime +$RETENTION_DAILY -delete 2>/dev/null || true
    
    # Remove weekly backups older than retention period
    find "$BACKUP_DIR" -name "rook_backup_weekly_*.sql.gz" -mtime +$((RETENTION_WEEKLY * 7)) -delete 2>/dev/null || true
    
    # Remove monthly backups older than retention period
    find "$BACKUP_DIR" -name "rook_backup_monthly_*.sql.gz" -mtime +$((RETENTION_MONTHLY * 30)) -delete 2>/dev/null || true
    
    echo "✓ Cleanup completed"
else
    echo "✗ Backup failed"
    exit 1
fi


#!/bin/sh
set -eu

BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "Starting MariaDB backup: $FILE"
mysqldump \
  -h "${DB_HOST}" \
  -u "${DB_USER}" \
  -p"${DB_PASS}" \
  --single-transaction \
  --quick \
  --routines \
  --triggers \
  "${DB_NAME}" | gzip > "$FILE"

find "$BACKUP_DIR" -type f -name "${DB_NAME}_*.sql.gz" -mtime "+${RETENTION_DAYS}" -delete

echo "MariaDB backup completed: $FILE"

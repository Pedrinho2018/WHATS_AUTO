#!/usr/bin/env bash
set -euo pipefail

APP_URL="${1:-http://localhost}"
APP_URL="${APP_URL%/}"
RETRIES="${RETRIES:-10}"
DELAY_SECONDS="${DELAY_SECONDS:-5}"

check_url() {
  local url="$1"
  local expected_status="${2:-200}"
  local attempt=1
  local status

  while [ "$attempt" -le "$RETRIES" ]; do
    status="$(curl -sS -o /tmp/smoke-body.txt -w "%{http_code}" --connect-timeout 5 --max-time 15 "$url" || true)"

    if [ "$status" = "$expected_status" ]; then
      echo "OK $url returned HTTP $status"
      return 0
    fi

    echo "Waiting for $url - attempt $attempt/$RETRIES returned HTTP ${status:-000}"
    attempt=$((attempt + 1))
    sleep "$DELAY_SECONDS"
  done

  echo "FAIL $url did not return HTTP $expected_status"
  echo "Last response body:"
  cat /tmp/smoke-body.txt || true
  exit 1
}

echo "Running smoke tests against $APP_URL"

check_url "$APP_URL/health" "200"
check_url "$APP_URL/api/health" "200"

echo "Smoke tests passed"

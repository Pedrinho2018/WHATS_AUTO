#!/bin/sh
set -eu

js_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

normalize_api_url() {
  value="$(printf '%s' "$1" | sed 's:/*$::')"

  if [ -z "$value" ]; then
    printf '%s' '/api'
    return
  fi

  case "$value" in
    */api)
      printf '%s' "$value"
      ;;
    *)
      printf '%s/api' "$value"
      ;;
  esac
}

API_URL_VALUE="$(normalize_api_url "${VITE_API_URL:-/api}")"
SOCKET_URL_VALUE="${VITE_SOCKET_URL:-}"
SOCKET_PATH_VALUE="${VITE_SOCKET_PATH:-/socket.io}"
TYPEBOT_BUILDER_URL_VALUE="${VITE_TYPEBOT_BUILDER_URL:-https://app.typebot.io/typebots}"
DEBUG_API_VALUE="${VITE_DEBUG_API:-false}"
DEBUG_SOCKET_VALUE="${VITE_DEBUG_SOCKET:-false}"

cat > /usr/share/nginx/html/env.js <<EOF
window.__WHATS_AUTO_CONFIG__ = {
  API_URL: "$(js_escape "$API_URL_VALUE")",
  SOCKET_URL: "$(js_escape "$SOCKET_URL_VALUE")",
  SOCKET_PATH: "$(js_escape "$SOCKET_PATH_VALUE")",
  TYPEBOT_BUILDER_URL: "$(js_escape "$TYPEBOT_BUILDER_URL_VALUE")",
  DEBUG_API: "$(js_escape "$DEBUG_API_VALUE")",
  DEBUG_SOCKET: "$(js_escape "$DEBUG_SOCKET_VALUE")"
};
EOF

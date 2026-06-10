#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
WEB_DIR="$ROOT_DIR/web"
PORT="${PORT:-3100}"
BASE_URL="http://127.0.0.1:${PORT}"

cleanup() {
  if [ -n "${SERVER_PID:-}" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID"
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

require_env() {
  local name="$1"
  if [ -z "${!name:-}" ]; then
    echo "Missing required environment variable: ${name}" >&2
    exit 1
  fi
}

check_route() {
  local path="$1"
  local expected_status="$2"
  local status

  status="$(curl -sS -o /tmp/preflight-response.txt -w "%{http_code}" "${BASE_URL}${path}")"
  if [ "$status" != "$expected_status" ]; then
    echo "Route check failed: ${path} expected ${expected_status}, got ${status}" >&2
    cat /tmp/preflight-response.txt >&2 || true
    exit 1
  fi
  echo "OK ${path} -> ${status}"
}

require_env NEXT_PUBLIC_SUPABASE_URL
require_env NEXT_PUBLIC_SUPABASE_ANON_KEY

cd "$WEB_DIR"

echo "Installing Web dependencies"
npm ci

echo "Running lint"
npm run lint

echo "Building Web app"
npm run build

echo "Starting Web app on ${BASE_URL}"
PORT="$PORT" npm run start > /tmp/yao-dao-qi-la-preflight.log 2>&1 &
SERVER_PID="$!"

for _ in $(seq 1 60); do
  if curl -fsS "${BASE_URL}/api/health" >/dev/null 2>&1; then
    break
  fi
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    echo "Web server exited before becoming healthy" >&2
    cat /tmp/yao-dao-qi-la-preflight.log >&2 || true
    exit 1
  fi
  sleep 1
done

check_route "/api/health" "200"
check_route "/" "200"
check_route "/api/auth/wechat" "200"

echo "Preflight checks passed"

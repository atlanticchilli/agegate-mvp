#!/usr/bin/env bash
# Test RunPod agegate-worker deployment.
# Usage:
#   ./infrastructure/test-runpod.sh                    # Test via API (full flow)
#   ./infrastructure/test-runpod.sh --direct           # Test RunPod endpoint directly
#
# Requires: RUNPOD_ENDPOINT_ID, RUNPOD_API_KEY (for --direct)
# API uses Cloud Run env vars; for local API test set API_BASE or use default.

set -euo pipefail

API_BASE="${API_BASE:-https://agegate-api-2zir4zr7ka-uc.a.run.app}"
SITE_KEY="${SITE_KEY:-site_demo4vercel1234567890ab}"

# Minimal valid JPEG (1x1 pixel) - worker returns no_face_detected but proves it's running
TEST_IMAGE_B64="/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBEQACEQA/AD/9k="

test_via_api() {
  echo "=== Testing via API (full flow) ==="
  echo "API: $API_BASE | Site: $SITE_KEY"
  echo ""

  echo "1. Create session..."
  SESSION_RESP=$(curl -s -X POST "${API_BASE}/api/session/create" \
    -H "Content-Type: application/json" \
    -d "{\"siteKey\":\"${SITE_KEY}\"}")
  SESSION_ID=$(echo "$SESSION_RESP" | grep -o '"sessionId":"[^"]*"' | cut -d'"' -f4)
  if [ -z "$SESSION_ID" ]; then
    echo "   FAIL: Could not get sessionId. Response: $SESSION_RESP"
    exit 1
  fi
  echo "   OK sessionId=$SESSION_ID"

  echo "2. Select selfie method..."
  VERIFY_RESP=$(curl -s -X POST "${API_BASE}/api/session/verify" \
    -H "Content-Type: application/json" \
    -d "{\"sessionId\":\"${SESSION_ID}\",\"selectedMethod\":\"facial_age_estimation\",\"selectedProvider\":\"selfie\"}")
  if echo "$VERIFY_RESP" | grep -q "inline:selfie"; then
    echo "   OK"
  else
    echo "   Response: $VERIFY_RESP"
  fi

  echo "3. Submit selfie (minimal test image, expect no_face_detected)..."
  VERIFY_SELFIE_RESP=$(curl -s -X POST "${API_BASE}/api/verify-selfie" \
    -H "Content-Type: application/json" \
    -d "{\"sessionId\":\"${SESSION_ID}\",\"image\":\"${TEST_IMAGE_B64}\"}")
  echo "   Response: $VERIFY_SELFIE_RESP"

  if echo "$VERIFY_SELFIE_RESP" | grep -q '"pass"'; then
    echo ""
    echo "=== API + RunPod OK ==="
    echo "Worker responded (pass/fail or no_face_detected). NumPy fix is working."
  elif echo "$VERIFY_SELFIE_RESP" | grep -q "RUNPOD"; then
    echo ""
    echo "=== RunPod not configured ==="
    echo "Set RUNPOD_ENDPOINT_ID and RUNPOD_API_KEY on Cloud Run."
    exit 1
  elif echo "$VERIFY_SELFIE_RESP" | grep -q "500\|INTERNAL_ERROR"; then
    echo ""
    echo "=== Possible worker error ==="
    echo "Check Cloud Run logs and RunPod logs."
    exit 1
  else
    echo ""
    echo "Response received. Inspect above."
  fi
}

test_direct_runpod() {
  ENDPOINT_ID="${RUNPOD_ENDPOINT_ID:-}"
  API_KEY="${RUNPOD_API_KEY:-}"
  if [ -z "$ENDPOINT_ID" ] || [ -z "$API_KEY" ]; then
    echo "For --direct: set RUNPOD_ENDPOINT_ID and RUNPOD_API_KEY"
    exit 1
  fi
  echo "=== Testing RunPod endpoint directly ==="
  echo "Endpoint: $ENDPOINT_ID"
  echo ""

  RESP=$(curl -s -X POST "https://api.runpod.ai/v2/${ENDPOINT_ID}/runsync" \
    -H "Authorization: Bearer ${API_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"input\":{\"image\":\"${TEST_IMAGE_B64}\"}}")
  echo "Response: $RESP"

  if echo "$RESP" | grep -q '"status":"COMPLETED"'; then
    echo ""
    echo "=== RunPod OK ==="
    echo "Worker completed. Check output for pass/error (no_face_detected expected with test image)."
  elif echo "$RESP" | grep -q '"output"'; then
    echo ""
    echo "=== RunPod responded ==="
    echo "Worker returned output. Inspect above."
  elif echo "$RESP" | grep -q '"error"'; then
    echo ""
    echo "=== RunPod error ==="
    echo "$RESP" | head -5
    exit 1
  else
    echo ""
    echo "Unexpected response. Check RunPod endpoint and API key."
    exit 1
  fi
}

if [ "${1:-}" = "--direct" ]; then
  test_direct_runpod
else
  test_via_api
fi

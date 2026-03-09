#!/bin/bash
# Raw RunPod query - replace API_KEY and run: bash infrastructure/runpod-raw-query.sh
set -euo pipefail
API_KEY="${RUNPOD_API_KEY:-YOUR_RUNPOD_API_KEY}"
# Use temp files to avoid "Argument list too long" (base64 is ~1.3MB)
base64 -i "$(dirname "$0")/IMG_0404 (2).jpg" | tr -d '\n' > /tmp/img.b64
jq -n --rawfile img /tmp/img.b64 '{input: {image: $img, min_age: 18, buffer: 2}}' > /tmp/runpod-payload.json
curl -s -X POST "https://api.runpod.ai/v2/osnbq65qwsjmf1/runsync" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d @/tmp/runpod-payload.json | jq .

#!/usr/bin/env bash
# Test RunPod with a real face image.
# Usage: RUNPOD_ENDPOINT_ID=osnbq65qwsjmf1 RUNPOD_API_KEY=your_key ./infrastructure/test-runpod-face.sh

set -euo pipefail

ENDPOINT_ID="${RUNPOD_ENDPOINT_ID:-osnbq65qwsjmf1}"
API_KEY="${RUNPOD_API_KEY:-}"

if [ -z "$API_KEY" ]; then
  echo "Set RUNPOD_API_KEY"
  exit 1
fi

IMAGE_FILE="$(dirname "$0")/IMG_0404 (2).jpg"
if [ ! -f "$IMAGE_FILE" ]; then
  echo "Image not found: $IMAGE_FILE"
  exit 1
fi

echo "Encoding image..."
IMAGE_B64=$(base64 -i "$IMAGE_FILE" | tr -d '\n')

echo "Sending to RunPod (endpoint: $ENDPOINT_ID)..."
curl -s -X POST "https://api.runpod.ai/v2/${ENDPOINT_ID}/runsync" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg img "$IMAGE_B64" '{input: {image: $img, min_age: 18, buffer: 2}}')" | jq .

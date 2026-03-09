#!/usr/bin/env bash
# Set RunPod env vars on Cloud Run API (no redeploy needed).
# Usage: RUNPOD_API_KEY=your_key ./infrastructure/set-runpod-env.sh

set -euo pipefail

PROJECT_ID="${PROJECT_ID:-agegate-mvp}"
REGION="${REGION:-us-central1}"
API_SERVICE="${API_SERVICE:-agegate-api}"
RUNPOD_ENDPOINT_ID="${RUNPOD_ENDPOINT_ID:-osnbq65qwsjmf1}"
RUNPOD_API_KEY="${RUNPOD_API_KEY:-}"

if [ -z "${RUNPOD_API_KEY}" ]; then
  echo "Error: RUNPOD_API_KEY is required."
  echo "Usage: RUNPOD_API_KEY=your_key ./infrastructure/set-runpod-env.sh"
  echo "Get your key from https://www.runpod.io/console/user/settings"
  exit 1
fi

echo "Setting RunPod env vars on ${API_SERVICE}..."
gcloud run services update "${API_SERVICE}" \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --set-env-vars="RUNPOD_ENDPOINT_ID=${RUNPOD_ENDPOINT_ID},RUNPOD_API_KEY=${RUNPOD_API_KEY}" \
  --quiet

echo "Done. Selfie verification should work now."

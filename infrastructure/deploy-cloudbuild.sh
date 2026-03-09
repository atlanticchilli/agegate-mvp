#!/usr/bin/env bash
# Deploy via Cloud Build - faster (builds in GCP, no local Docker).
# Usage: RUNPOD_ENDPOINT_ID=xxx RUNPOD_API_KEY=xxx ./deploy-cloudbuild.sh

set -euo pipefail

PROJECT_ID="${PROJECT_ID:-agegate-mvp}"
REGION="${REGION:-us-central1}"
REPOSITORY="${REPOSITORY:-agegate-images}"
API_SERVICE="${API_SERVICE:-agegate-api}"
TAG="${TAG:-manual-$(date +%Y%m%d-%H%M%S)}"

RUNPOD_ENDPOINT_ID="${RUNPOD_ENDPOINT_ID:-osnbq65qwsjmf1}"
RUNPOD_API_KEY="${RUNPOD_API_KEY:-}"

export CLOUDSDK_CORE_DISABLE_PROMPTS=1

echo "Deploying via Cloud Build (faster, no local Docker)..."
echo "  PROJECT_ID=${PROJECT_ID}  TAG=${TAG}"

cd "$(dirname "$0")/.."

# API only (dashboard lives on Vercel)
gcloud builds submit \
  --project "${PROJECT_ID}" \
  --config infrastructure/cloudbuild-api-only.yaml \
  --substitutions="SHORT_SHA=${TAG}" \
  .

echo ""
echo "Cloud Build complete. Setting RunPod env vars on API..."
if [ -n "${RUNPOD_ENDPOINT_ID}" ]; then
  ENV_VARS="RUNPOD_ENDPOINT_ID=${RUNPOD_ENDPOINT_ID}"
  [ -n "${RUNPOD_API_KEY}" ] && ENV_VARS="${ENV_VARS},RUNPOD_API_KEY=${RUNPOD_API_KEY}"
  gcloud run services update "${API_SERVICE}" \
    --project "${PROJECT_ID}" \
    --region "${REGION}" \
    --set-env-vars="${ENV_VARS}" \
    --quiet
  echo "RunPod env vars set."
else
  echo "Skipping RunPod env (set RUNPOD_ENDPOINT_ID and RUNPOD_API_KEY to enable)."
fi

echo "Done."

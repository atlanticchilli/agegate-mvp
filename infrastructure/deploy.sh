#!/usr/bin/env bash
set -euo pipefail

# MVP deployment helper for local/manual use.
# Non-destructive defaults: this script builds/deploys only when required files exist.
# Usage: RUNPOD_ENDPOINT_ID=xxx RUNPOD_API_KEY=xxx ./deploy.sh
# Or use deploy-cloudbuild.sh for faster Cloud Build deploy (no local Docker).

PROJECT_ID="${PROJECT_ID:-agegate-mvp}"
REGION="${REGION:-us-central1}"
REPOSITORY="${REPOSITORY:-agegate-images}"
API_SERVICE="${API_SERVICE:-agegate-api}"
DASHBOARD_SERVICE="${DASHBOARD_SERVICE:-agegate-dashboard}"
WIDGET_BUCKET="${WIDGET_BUCKET:-agegate-mvp-widget-cdn}"
WIDGET_OBJECT="${WIDGET_OBJECT:-v1/widget.js}"
TAG="${TAG:-$(date +%Y%m%d-%H%M%S)}"

# RunPod: set these so the API can call the worker (get key from runpod.io/console/user/settings)
RUNPOD_ENDPOINT_ID="${RUNPOD_ENDPOINT_ID:-osnbq65qwsjmf1}"
RUNPOD_API_KEY="${RUNPOD_API_KEY:-}"

API_IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/api:${TAG}"
DASHBOARD_IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/dashboard:${TAG}"

# Prevent interactive prompts (gcloud, npm)
export CI=true
export CLOUDSDK_CORE_DISABLE_PROMPTS=1

echo "Deploy context:"
echo "  PROJECT_ID=${PROJECT_ID}"
echo "  REGION=${REGION}"
echo "  REPOSITORY=${REPOSITORY}"
echo "  API_SERVICE=${API_SERVICE}"
echo "  DASHBOARD_SERVICE=${DASHBOARD_SERVICE}"
echo "  WIDGET_BUCKET=${WIDGET_BUCKET}"
echo "  WIDGET_OBJECT=${WIDGET_OBJECT}"
echo "  TAG=${TAG}"

echo "Installing workspace dependencies..."
npm ci

if [ -f "packages/shared/package.json" ]; then
  echo "Building shared workspace..."
  npm run build --workspace=packages/shared
else
  echo "Skipping shared build: packages/shared/package.json not present yet."
fi

if [ -f "packages/api/Dockerfile" ]; then
  echo "Building and pushing API image ${API_IMAGE}..."
  docker build -f packages/api/Dockerfile -t "${API_IMAGE}" .
  gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet 2>/dev/null || true
  docker push "${API_IMAGE}"
  DEPLOY_ARGS=(
    --project "${PROJECT_ID}"
    --region "${REGION}"
    --platform managed
    --allow-unauthenticated
    --image "${API_IMAGE}"
    --quiet
  )
  if [ -n "${RUNPOD_ENDPOINT_ID}" ]; then
    ENV_VARS="RUNPOD_ENDPOINT_ID=${RUNPOD_ENDPOINT_ID}"
    [ -n "${RUNPOD_API_KEY}" ] && ENV_VARS="${ENV_VARS},RUNPOD_API_KEY=${RUNPOD_API_KEY}"
    DEPLOY_ARGS+=(--set-env-vars="${ENV_VARS}")
  fi
  gcloud run deploy "${API_SERVICE}" "${DEPLOY_ARGS[@]}"
else
  echo "Skipping API deploy: packages/api/Dockerfile missing."
fi

if [ -f "packages/dashboard/Dockerfile" ]; then
  echo "Building and pushing Dashboard image ${DASHBOARD_IMAGE}..."
  docker build -f packages/dashboard/Dockerfile -t "${DASHBOARD_IMAGE}" .
  docker push "${DASHBOARD_IMAGE}"
  gcloud run deploy "${DASHBOARD_SERVICE}" \
    --project "${PROJECT_ID}" \
    --region "${REGION}" \
    --platform managed \
    --allow-unauthenticated \
    --image "${DASHBOARD_IMAGE}" \
    --quiet
else
  echo "Skipping Dashboard deploy: packages/dashboard/Dockerfile missing."
fi

if [ -f "packages/widget/dist/widget.js" ]; then
  echo "Uploading widget bundle..."
  gcloud storage cp "packages/widget/dist/widget.js" "gs://${WIDGET_BUCKET}/${WIDGET_OBJECT}"
else
  echo "Skipping widget upload: packages/widget/dist/widget.js not found."
  echo "Once Module 4 stabilizes, ensure widget build outputs dist/widget.js."
fi

echo "CDN invalidation placeholder:"
echo "  gcloud compute url-maps invalidate-cdn-cache <URL_MAP_NAME> --path=\"/*\" --project \"${PROJECT_ID}\""
echo "Done."

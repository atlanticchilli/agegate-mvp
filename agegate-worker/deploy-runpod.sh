#!/usr/bin/env bash
# Deploy agegate-worker to RunPod serverless
# Prerequisites: Docker image built, Docker Hub account, runpodctl configured (runpodctl doctor)

set -euo pipefail

DOCKERHUB_USER="${DOCKERHUB_USER:?Set DOCKERHUB_USER to your Docker Hub username}"
IMAGE_NAME="agegate-worker"
IMAGE_TAG="${IMAGE_TAG:-v0.1}"
FULL_IMAGE="${DOCKERHUB_USER}/${IMAGE_NAME}:${IMAGE_TAG}"

echo "=== Step 1: Build (if not already built) ==="
# Build from repo root so context matches RunPod (Dockerfile expects agegate-worker/ paths)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
docker build --platform linux/amd64 -f "${SCRIPT_DIR}/Dockerfile" -t "${IMAGE_NAME}:${IMAGE_TAG}" "${ROOT_DIR}"
docker tag "${IMAGE_NAME}:${IMAGE_TAG}" "${FULL_IMAGE}"

echo ""
echo "=== Step 2: Push to Docker Hub ==="
echo "Run: docker login"
read -p "Press Enter after you've logged in to Docker Hub..."
docker push "${FULL_IMAGE}"

echo ""
echo "=== Step 3: Create RunPod template ==="
TEMPLATE_JSON=$(runpodctl template create \
  --name "agegate-worker" \
  --image "docker.io/${FULL_IMAGE}" \
  --serverless \
  --container-disk-in-gb 20 \
  -o json)

TEMPLATE_ID=$(echo "$TEMPLATE_JSON" | jq -r '.id')
if [ -z "$TEMPLATE_ID" ] || [ "$TEMPLATE_ID" = "null" ]; then
  echo "Failed to create template. Response: $TEMPLATE_JSON"
  exit 1
fi
echo "Template created: $TEMPLATE_ID"

echo ""
echo "=== Step 4: Create serverless endpoint ==="
ENDPOINT_JSON=$(runpodctl serverless create \
  --name "agegate-worker" \
  --template-id "$TEMPLATE_ID" \
  --gpu-id "NVIDIA GeForce RTX 4090" \
  --workers-max 1 \
  --workers-min 0 \
  -o json)

ENDPOINT_ID=$(echo "$ENDPOINT_JSON" | jq -r '.id')
if [ -z "$ENDPOINT_ID" ] || [ "$ENDPOINT_ID" = "null" ]; then
  echo "Failed to create endpoint. Response: $ENDPOINT_JSON"
  exit 1
fi

echo ""
echo "=== Done ==="
echo "Endpoint ID: $ENDPOINT_ID"
echo ""
echo "Add these to your Cloud Run API environment:"
echo "  RUNPOD_ENDPOINT_ID=$ENDPOINT_ID"
echo "  RUNPOD_API_KEY=<your RunPod API key from https://www.runpod.io/console/user/settings>"

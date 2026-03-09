#!/usr/bin/env bash
# Validate pip dependencies before full Docker build.
# Runs in a minimal container (~50MB) - fails fast on resolution/install errors.
# Usage: ./scripts/validate-deps.sh

set -euo pipefail

cd "$(dirname "$0")/.."
echo "=== Validating pip dependencies (fast pre-build check) ==="

# Build minimal validate image (has git for mivolo)
docker build -q -f Dockerfile.validate -t agegate-validate:tmp .

# Run the same pip install commands as our Dockerfile (CPU torch for validation)
docker run --rm \
  -v "$(pwd)":/app \
  -w /app \
  agegate-validate:tmp \
  sh -c '
    echo "Installing torch (CPU) first - required by mivolo..."
    pip install --no-cache-dir -q torch torchvision --index-url https://download.pytorch.org/whl/cpu

    echo "Installing runpod, ultralytics, Pillow, numpy, opencv..."
    pip install --no-cache-dir -q runpod ultralytics Pillow numpy opencv-python-headless

    echo "Installing mivolo (this previously caused conflicts)..."
    pip install --no-cache-dir "mivolo @ git+https://github.com/WildChlamydia/MiVOLO.git"

    echo "Verifying imports..."
    python -c "
import runpod
import ultralytics
import mivolo
print(\"OK: all packages importable\")
"
  '

echo ""
echo "=== Validation passed - pip deps resolve correctly ==="
echo "Full Docker build should succeed (assuming disk space)."

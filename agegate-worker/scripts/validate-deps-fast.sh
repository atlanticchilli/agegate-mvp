#!/usr/bin/env bash
# Fast dependency validation (~30-90 sec) - catches pip/dep errors before full build.
# Phase 1: Validate runpod, ultralytics, etc. (no mivolo) - instant
# Phase 2: Validate mivolo - may surface pkg_resources or timm conflicts
# Usage: ./scripts/validate-deps-fast.sh

set -euo pipefail

cd "$(dirname "$0")/.."
echo "=== Fast dependency validation (pre-build check) ==="

# Build minimal validate image (has git, setuptools) - ~5 sec
docker build -q -f Dockerfile.validate -t agegate-validate:tmp .

# Phase 1: Core deps (same as Dockerfile first RUN) - fast
echo ""
echo "Phase 1: runpod, ultralytics, Pillow, numpy, opencv..."
docker run --rm agegate-validate:tmp \
  pip install -q --no-cache-dir runpod ultralytics Pillow numpy opencv-python-headless

# Phase 2: mivolo - requires torch first (RunPod base has it; we use CPU for speed)
echo ""
echo "Phase 2: torch (CPU) + mivolo..."
docker run --rm agegate-validate:tmp sh -c '
  pip install -q --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu
  pip install --no-cache-dir --no-build-isolation "mivolo @ git+https://github.com/WildChlamydia/MiVOLO.git"
'

echo ""
echo "=== Validation passed - deps resolve correctly ==="

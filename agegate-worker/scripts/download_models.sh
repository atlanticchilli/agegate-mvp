#!/bin/bash
# Download models for agegate-worker: MiVOLO, YOLOv8, Silent-Face-Anti-Spoofing
# Fix: mivolo_imbd -> mivolo_imdb (typo in MiVOLO README)

set -e

MODELS_DIR="${MODELS_DIR:-/workspace/models}"
SFAS_DIR="${SFAS_DIR:-/workspace/Silent-Face-Anti-Spoofing}"
HF_BASE="https://huggingface.co/typorch/mivolo-imdb_cross_person-yolov8x_person_face/resolve/ea71939313acebde1c62a3b4f35b8e3abfa6f56c"

mkdir -p "$MODELS_DIR"
cd "$MODELS_DIR"

# MiVOLO checkpoint (model_imdb_cross_person_4.22_99.46.pth.tar)
# Also symlink as mivolo_imdb.pth.tar for compatibility with MiVOLO demo
if [ ! -f "mivolo_imdb.pth.tar" ]; then
  echo "Downloading MiVOLO checkpoint..."
  wget -q -O model_imdb_cross_person_4.22_99.46.pth.tar \
    "${HF_BASE}/model_imdb_cross_person_4.22_99.46.pth.tar?download=true"
  ln -sf model_imdb_cross_person_4.22_99.46.pth.tar mivolo_imdb.pth.tar
  echo "MiVOLO checkpoint downloaded."
fi

# YOLOv8 person+face detector
if [ ! -f "yolov8x_person_face.pt" ]; then
  echo "Downloading YOLOv8 detector..."
  wget -q -O yolov8x_person_face.pt \
    "${HF_BASE}/yolov8x_person_face.pt?download=true"
  echo "YOLOv8 detector downloaded."
fi

# Silent-Face-Anti-Spoofing: clone repo and download models
if [ ! -d "$SFAS_DIR" ]; then
  echo "Cloning Silent-Face-Anti-Spoofing..."
  git clone --depth 1 https://github.com/minivision-ai/Silent-Face-Anti-Spoofing.git "$SFAS_DIR"
fi

# SFAS models are in resources/ (anti_spoof_models, detection_model) - included in repo
# Verify they exist
if [ ! -d "$SFAS_DIR/resources/anti_spoof_models" ]; then
  echo "Warning: SFAS anti_spoof_models not found. Check repo structure."
fi
if [ ! -d "$SFAS_DIR/resources/detection_model" ]; then
  echo "Warning: SFAS detection_model not found. Check repo structure."
fi

echo "All models ready."

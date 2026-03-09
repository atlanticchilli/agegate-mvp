# Agegate RunPod serverless GPU worker
# Use RunPod PyTorch base (has torch, cuda, pip) - smaller build
FROM runpod/pytorch:2.1.0-py3.10-cuda11.8.0-devel-ubuntu22.04

ENV PYTHONUNBUFFERED=1

WORKDIR /workspace

# Install deps (base has torch, torchvision; add runpod, ultralytics, mivolo)
# mivolo setup.py imports pkg_resources - need setuptools<74 and --no-build-isolation
RUN pip install --no-cache-dir runpod ultralytics Pillow numpy opencv-python-headless
RUN pip install --no-cache-dir "setuptools<74" \
    && pip install --no-cache-dir --no-build-isolation "mivolo @ git+https://github.com/WildChlamydia/MiVOLO.git"

# Download models (MiVOLO, YOLO, SFAS clone)
# Paths use agegate-worker/ prefix when build context is repo root (e.g. RunPod GitHub integration)
COPY agegate-worker/scripts/download_models.sh scripts/
RUN chmod +x scripts/download_models.sh \
    && MODELS_DIR=/workspace/models SFAS_DIR=/workspace/Silent-Face-Anti-Spoofing ./scripts/download_models.sh

# Copy worker source
COPY agegate-worker/src/ src/

ENV SFAS_ROOT=/workspace/Silent-Face-Anti-Spoofing
ENV YOLO_WEIGHTS=/workspace/models/yolov8x_person_face.pt
ENV MIVOLO_WEIGHTS=/workspace/models/mivolo_imdb.pth.tar
ENV ANTISPOOF_DIR=/workspace/Silent-Face-Anti-Spoofing/resources/anti_spoof_models
ENV ANTISPOOF_DETECTION_DIR=/workspace/Silent-Face-Anti-Spoofing/resources/detection_model

CMD ["python", "-u", "-m", "src.handler"]

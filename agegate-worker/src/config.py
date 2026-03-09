"""Environment-based configuration for agegate-worker."""

import os

# Model paths
YOLO_WEIGHTS = os.environ.get("YOLO_WEIGHTS", "/workspace/models/yolov8x_person_face.pt")
MIVOLO_WEIGHTS = os.environ.get("MIVOLO_WEIGHTS", "/workspace/models/mivolo_imdb.pth.tar")
ANTISPOOF_DIR = os.environ.get("ANTISPOOF_DIR", "/workspace/Silent-Face-Anti-Spoofing/resources/anti_spoof_models")
ANTISPOOF_DETECTION_DIR = os.environ.get(
    "ANTISPOOF_DETECTION_DIR",
    "/workspace/Silent-Face-Anti-Spoofing/resources/detection_model",
)

# Thresholds
LIVENESS_THRESHOLD = float(os.environ.get("LIVENESS_THRESHOLD", "0.5"))
DEFAULT_MIN_AGE = float(os.environ.get("DEFAULT_MIN_AGE", "18"))
DEFAULT_BUFFER = float(os.environ.get("DEFAULT_BUFFER", "0"))

# Device
DEVICE = os.environ.get("DEVICE", "cuda:0")

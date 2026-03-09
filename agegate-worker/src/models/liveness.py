"""
Wrapper for Silent-Face-Anti-Spoofing (SFAS) liveness detection.

Uses anti_spoof_predict.py and MiniFASNet from the SFAS repo.
Loads .pth files from ANTISPOOF_DIR, preprocesses face crop, runs inference.
Returns liveness score 0-1 (probability of real face, class 1).
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import cv2
import numpy as np
import torch
import torch.nn.functional as F

# Add SFAS repo to path (cloned to /workspace/Silent-Face-Anti-Spoofing in Docker)
SFAS_ROOT = os.environ.get("SFAS_ROOT", "/workspace/Silent-Face-Anti-Spoofing")
if os.path.isdir(SFAS_ROOT) and SFAS_ROOT not in sys.path:
    sys.path.insert(0, SFAS_ROOT)

# Lazy imports - only when check_liveness is called
_antispoof_predict = None
_parse_model_name = None


def _ensure_sfas_imports():
    """Import SFAS modules; raises if repo not available."""
    global _antispoof_predict, _parse_model_name
    if _antispoof_predict is not None:
        return
    try:
        from src.anti_spoof_predict import AntiSpoofPredict
        from src.utility import parse_model_name

        _antispoof_predict = AntiSpoofPredict
        _parse_model_name = parse_model_name
    except ImportError as e:
        raise ImportError(
            f"Silent-Face-Anti-Spoofing not found at {SFAS_ROOT}. "
            "Clone the repo and ensure resources/anti_spoof_models exists. "
            f"Original: {e}"
        ) from e


def _create_predictor(device_id: int = 0):
    """Create AntiSpoofPredict; Detection.__init__ needs cwd = SFAS_ROOT for Caffe paths."""
    _ensure_sfas_imports()
    old_cwd = os.getcwd()
    try:
        os.chdir(SFAS_ROOT)
        return _antispoof_predict(device_id)
    finally:
        os.chdir(old_cwd)


def check_liveness(
    face_crop: np.ndarray,
    model_dir: str,
    device_id: int = 0,
) -> float:
    """
    Run SFAS liveness on a face crop (BGR numpy, any size).

    Returns:
        Liveness score 0-1. Class 1 = real face. Higher = more likely real.
    """
    predictor = _create_predictor(device_id)
    prediction = np.zeros((1, 3))

    if not os.path.isdir(model_dir):
        raise FileNotFoundError(f"Anti-spoof model dir not found: {model_dir}")

    for model_name in sorted(os.listdir(model_dir)):
        if not model_name.endswith(".pth"):
            continue
        h_input, w_input, _model_type, scale = _parse_model_name(model_name)
        # Resize crop to model input size
        img = cv2.resize(face_crop, (w_input, h_input))
        model_path = os.path.join(model_dir, model_name)
        pred = predictor.predict(img, model_path)
        prediction += pred

    # Class 1 = real face
    proba = prediction[0] / (prediction[0].sum() + 1e-8)
    return float(proba[1])


def check_liveness_simple(
    face_crop: np.ndarray,
    model_dir: str,
    device: str = "cuda:0",
) -> float:
    """
    Simplified liveness check that avoids reloading models per call.
    Use this when SFAS full integration has path/import issues.
    """
    predictor = _create_predictor(0)
    prediction = np.zeros((1, 3))

    for fname in sorted(Path(model_dir).glob("*.pth")):
        img = cv2.resize(face_crop, (80, 80))
        pred = predictor.predict(img, str(fname))
        prediction += pred

    if prediction[0].sum() < 1e-8:
        return 0.0
    proba = prediction[0] / prediction[0].sum()
    return float(proba[1])

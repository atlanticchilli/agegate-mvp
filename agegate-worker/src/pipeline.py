"""
Age verification pipeline: decode -> detect -> liveness -> age -> threshold.
"""

import base64
from typing import Any, Optional

import cv2
import numpy as np

from .config import (
    ANTISPOOF_DIR,
    DEFAULT_BUFFER,
    DEFAULT_MIN_AGE,
    DEVICE,
    LIVENESS_THRESHOLD,
    MIVOLO_WEIGHTS,
    YOLO_WEIGHTS,
)
from .models.age import estimate_age
from .models.detector import detect_faces
from .models.liveness import check_liveness


def _decode_image(image_base64: str) -> np.ndarray:
    """Decode base64 image to BGR numpy array."""
    raw = base64.b64decode(image_base64)
    arr = np.frombuffer(raw, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("invalid_image")
    return img


def verify_age(
    image_base64: str,
    min_age: Optional[float] = None,
    buffer: Optional[float] = None,
    liveness_threshold: Optional[float] = None,
) -> dict[str, Any]:
    """
    Verify age from selfie image.

    Steps: decode image, detect_faces, crop face, check_liveness (fail if < threshold),
    estimate_age, compare to threshold (min_age - buffer).

    Returns:
        Dict with: pass, estimated_age, liveness_score, threshold_applied, min_age, buffer.
        On error: error field with one of: no_face_detected, liveness_failed,
        age_below_threshold, invalid_image, liveness_check_failed, age_estimation_failed.
    """
    min_age = min_age if min_age is not None else DEFAULT_MIN_AGE
    buffer = buffer if buffer is not None else DEFAULT_BUFFER
    liveness_threshold = liveness_threshold if liveness_threshold is not None else LIVENESS_THRESHOLD
    threshold_applied = max(0.0, min_age + buffer)

    result: dict[str, Any] = {
        "pass": False,
        "estimated_age": None,
        "liveness_score": None,
        "threshold_applied": threshold_applied,
        "min_age": min_age,
        "buffer": buffer,
    }

    try:
        image = _decode_image(image_base64)
    except Exception as e:
        err = str(e).lower()
        if "invalid" in err or "decode" in err:
            result["error"] = "invalid_image"
        else:
            result["error"] = "invalid_image"
        return result

    face_bbox, person_bbox = detect_faces(image, YOLO_WEIGHTS, device=DEVICE)
    if face_bbox is None:
        result["error"] = "no_face_detected"
        return result

    x1, y1, x2, y2 = face_bbox
    face_crop = image[y1:y2, x1:x2]
    if face_crop.size == 0:
        result["error"] = "no_face_detected"
        return result

    try:
        liveness_score = check_liveness(face_crop, ANTISPOOF_DIR, device_id=0)
    except Exception:
        result["error"] = "liveness_check_failed"
        return result

    result["liveness_score"] = round(liveness_score, 4)

    if liveness_score < liveness_threshold:
        result["error"] = "liveness_failed"
        return result

    try:
        estimated_age = estimate_age(
            image,
            checkpoint=MIVOLO_WEIGHTS,
            detector_weights=YOLO_WEIGHTS,
            device=DEVICE,
            face_bbox_hint=face_bbox,
        )
    except Exception:
        result["error"] = "age_estimation_failed"
        return result

    if estimated_age is None:
        result["error"] = "age_estimation_failed"
        return result

    result["estimated_age"] = round(estimated_age, 1)
    result["pass"] = estimated_age >= threshold_applied

    if not result["pass"]:
        result["error"] = "age_below_threshold"

    return result

"""
MiVOLO age estimation.

Loads mivolo model, takes full image (face/person crops are extracted internally).
Returns estimated age for the best-detected face.
"""

from __future__ import annotations

from typing import Optional

import numpy as np

# MiVOLO uses argparse for config; we build a minimal namespace
try:
    from mivolo.model.yolo_detector import Detector
    from mivolo.predictor import Predictor
    from mivolo.structures import PersonAndFaceResult

    MIVOLO_AVAILABLE = True
except ImportError:
    MIVOLO_AVAILABLE = False
    Predictor = None
    PersonAndFaceResult = None


class _PredictorConfig:
    def __init__(self, detector_weights: str, checkpoint: str, device: str):
        self.detector_weights = detector_weights
        self.checkpoint = checkpoint
        self.device = device
        self.with_persons = True
        self.disable_faces = False
        self.draw = False


def estimate_age(
    image: np.ndarray,
    checkpoint: str,
    detector_weights: str,
    device: str = "cuda:0",
    face_bbox_hint: Optional[tuple] = None,
) -> Optional[float]:
    """
    Run MiVOLO age estimation on image.

    Args:
        image: BGR numpy array (full image).
        checkpoint: Path to mivolo_imdb.pth.tar.
        detector_weights: Path to yolov8x_person_face.pt.
        device: cuda:0 or cpu.
        face_bbox_hint: Optional (x1,y1,x2,y2) to pick matching face when multiple.

    Returns:
        Estimated age in years, or None if no face detected.
    """
    if not MIVOLO_AVAILABLE:
        raise RuntimeError(
            "MiVOLO not installed. Run: pip install git+https://github.com/WildChlamydia/MiVOLO.git"
        )

    config = _PredictorConfig(detector_weights, checkpoint, device)
    predictor = Predictor(config, verbose=False)
    detected_objects: PersonAndFaceResult
    detected_objects, _ = predictor.recognize(image)

    face_inds = detected_objects.get_bboxes_inds("face")
    if not face_inds:
        return None

    # Pick best face: by bbox overlap with hint, or first
    best_ind = face_inds[0]
    if face_bbox_hint and len(face_inds) > 1:
        best_iou = 0.0
        hx1, hy1, hx2, hy2 = face_bbox_hint
        ha = (hx2 - hx1) * (hy2 - hy1)
        for fi in face_inds:
            bb = detected_objects.get_bbox_by_ind(fi).cpu().numpy()
            ix1 = max(hx1, bb[0])
            iy1 = max(hy1, bb[1])
            ix2 = min(hx2, bb[2])
            iy2 = min(hy2, bb[3])
            if ix2 > ix1 and iy2 > iy1 and ha > 0:
                iou = (ix2 - ix1) * (iy2 - iy1) / ha
                if iou > best_iou:
                    best_iou = iou
                    best_ind = fi

    age = detected_objects.ages[best_ind]
    return float(age) if age is not None else None

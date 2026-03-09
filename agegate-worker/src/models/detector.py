"""YOLOv8 face/person detection. Class 0=person, 1=face."""

from typing import Optional, Tuple

import numpy as np
from ultralytics import YOLO


def detect_faces(
    image: np.ndarray,
    weights_path: str,
    device: str = "cuda:0",
    conf_thresh: float = 0.4,
) -> Tuple[Optional[Tuple[int, int, int, int]], Optional[Tuple[int, int, int, int]]]:
    """
    Detect face and optional person in image.

    Returns:
        (face_bbox, person_bbox): face_bbox is (x1, y1, x2, y2), person_bbox may be None.
        Best face is chosen by confidence; person is the one most overlapping with that face.
    """
    model = YOLO(weights_path)
    results = model.predict(image, conf=conf_thresh, device=device, verbose=False)

    if not results or not results[0].boxes:
        return None, None

    boxes = results[0].boxes
    names = results[0].names  # {0: 'person', 1: 'face'} typically

    face_inds = [i for i in range(len(boxes)) if names.get(int(boxes[i].cls), "") == "face"]
    person_inds = [i for i in range(len(boxes)) if names.get(int(boxes[i].cls), "") == "person"]

    if not face_inds:
        return None, None

    # Pick best face by confidence
    best_face_ind = max(face_inds, key=lambda i: float(boxes[i].conf))
    face_xyxy = boxes[best_face_ind].xyxy[0].cpu().numpy()
    face_bbox = (int(face_xyxy[0]), int(face_xyxy[1]), int(face_xyxy[2]), int(face_xyxy[3]))

    # Find overlapping person (IoU) if any
    person_bbox = None
    if person_inds:
        face_area = (face_bbox[2] - face_bbox[0]) * (face_bbox[3] - face_bbox[1])
        best_iou = 0.0
        for pi in person_inds:
            p_xyxy = boxes[pi].xyxy[0].cpu().numpy()
            px1, py1, px2, py2 = p_xyxy[0], p_xyxy[1], p_xyxy[2], p_xyxy[3]
            ix1 = max(face_bbox[0], px1)
            iy1 = max(face_bbox[1], py1)
            ix2 = min(face_bbox[2], px2)
            iy2 = min(face_bbox[3], py2)
            if ix2 > ix1 and iy2 > iy1:
                inter = (ix2 - ix1) * (iy2 - iy1)
                iou = inter / face_area if face_area > 0 else 0
                if iou > best_iou:
                    best_iou = iou
                    person_bbox = (int(px1), int(py1), int(px2), int(py2))

    return face_bbox, person_bbox

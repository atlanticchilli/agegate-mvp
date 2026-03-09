# Agegate Worker

RunPod serverless GPU worker for selfie age estimation. Uses MiVOLO for age, YOLOv8 for face detection, and Silent-Face-Anti-Spoofing for liveness.

## Prerequisites

- Docker
- RunPod account
- GPU (CUDA 11.8)

## Validate deps first (recommended)

Run before full build to catch pip/dependency errors in ~2-3 min instead of 15+ min:

```bash
cd agegate-worker
./scripts/validate-deps-fast.sh
```

## Build

```bash
cd agegate-worker
docker build --platform linux/amd64 -t agegate-worker:v0.1 .
```

## Download Models (Local / Pre-build)

To pre-download models before Docker build (e.g. for faster rebuilds):

```bash
chmod +x scripts/download_models.sh
MODELS_DIR=./models SFAS_DIR=./Silent-Face-Anti-Spoofing ./scripts/download_models.sh
```

Models:

- **MiVOLO**: `mivolo_imdb.pth.tar` (HuggingFace)
- **YOLOv8**: `yolov8x_person_face.pt` (HuggingFace)
- **Silent-Face-Anti-Spoofing**: cloned repo with `resources/anti_spoof_models` and `resources/detection_model`

## Docker Build

```bash
docker build -t agegate-worker .
```

## RunPod Deploy

1. Push image to a registry (Docker Hub, GHCR, etc.):

   ```bash
   docker tag agegate-worker your-registry/agegate-worker:latest
   docker push your-registry/agegate-worker:latest
   ```

2. In RunPod Console:
   - Create a **Serverless** endpoint
   - Select GPU (e.g. A100, L40S)
   - Use image: `your-registry/agegate-worker:latest`
   - Set container disk if needed (models ~500MB+)
   - Configure min workers, max workers, idle timeout

3. Request format:

   ```json
   {
     "input": {
       "image": "<base64-encoded-selfie>",
       "min_age": 18,
       "buffer": 0
     }
   }
   ```

4. Response format:

   ```json
   {
     "pass": true,
     "estimated_age": 25.3,
     "liveness_score": 0.92,
     "threshold_applied": 18,
     "min_age": 18,
     "buffer": 0
   }
   ```

   On error, `error` is one of: `no_face_detected`, `liveness_failed`, `age_below_threshold`, `invalid_image`, `liveness_check_failed`, `age_estimation_failed`.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `YOLO_WEIGHTS` | `/workspace/models/yolov8x_person_face.pt` | YOLOv8 detector path |
| `MIVOLO_WEIGHTS` | `/workspace/models/mivolo_imdb.pth.tar` | MiVOLO checkpoint |
| `ANTISPOOF_DIR` | `.../anti_spoof_models` | SFAS model dir |
| `ANTISPOOF_DETECTION_DIR` | `.../detection_model` | SFAS detector (optional) |
| `LIVENESS_THRESHOLD` | `0.5` | Min liveness score (0–1) |
| `DEFAULT_MIN_AGE` | `18` | Default min age |
| `DEFAULT_BUFFER` | `0` | Buffer subtracted from min_age |
| `DEVICE` | `cuda:0` | Device for inference |
| `SFAS_ROOT` | `/workspace/Silent-Face-Anti-Spoofing` | SFAS repo root |

## Pipeline

1. Decode base64 image
2. Detect faces (YOLOv8)
3. Crop best face
4. Liveness check (SFAS) — fail if below threshold
5. Age estimation (MiVOLO)
6. Compare age to `min_age - buffer`

/**
 * Selfie capture UI using getUserMedia.
 * Requires HTTPS (secure context) for getUserMedia.
 */

export interface SelfieCaptureResult {
  imageBase64: string;
}

export type SelfieCaptureErrorCode =
  | "not_secure_context"
  | "permission_denied"
  | "no_camera"
  | "camera_in_use"
  | "unknown";

export interface SelfieCaptureError {
  code: SelfieCaptureErrorCode;
  message: string;
}

export interface SelfieCaptureOptions {
  /** Container element to render the capture UI into. */
  container: HTMLElement;
  /** Called when capture succeeds. */
  onCapture: (result: SelfieCaptureResult) => void;
  /** Called when user cancels or an error occurs. */
  onCancel: () => void;
  /** Called when an error occurs (before onCancel). */
  onError?: (error: SelfieCaptureError) => void;
}

const USER_FACING_MODE = "user";

function isSecureContext(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.isSecureContext;
}

function getUserFacingErrorMessage(code: SelfieCaptureErrorCode): string {
  switch (code) {
    case "not_secure_context":
      return "Camera access requires a secure connection (HTTPS).";
    case "permission_denied":
      return "Camera permission was denied. Please allow access and try again.";
    case "no_camera":
      return "No camera was found on this device.";
    case "camera_in_use":
      return "The camera is in use by another application. Please close it and try again.";
    default:
      return "Something went wrong. Please try again.";
  }
}

/**
 * Shows selfie capture UI in the given container.
 * Returns a cleanup function to stop the stream and remove elements.
 */
export function showSelfieCapture(options: SelfieCaptureOptions): () => void {
  const { container, onCapture, onCancel, onError } = options;

  if (!isSecureContext()) {
    const err: SelfieCaptureError = {
      code: "not_secure_context",
      message: getUserFacingErrorMessage("not_secure_context")
    };
    onError?.(err);
    onCancel();
    return () => {};
  }

  const video = document.createElement("video");
  video.autoplay = true;
  video.playsInline = true;
  video.muted = true;
  video.setAttribute("playsinline", "true");

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    const err: SelfieCaptureError = {
      code: "unknown",
      message: getUserFacingErrorMessage("unknown")
    };
    onError?.(err);
    onCancel();
    return () => {};
  }

  const wrapper = document.createElement("div");
  wrapper.className = "agegate-selfie-capture";
  wrapper.innerHTML = `
    <div class="agegate-selfie-video-wrap">
      <div class="agegate-selfie-video-placeholder">Starting camera…</div>
    </div>
    <div class="agegate-selfie-actions">
      <button type="button" class="agegate-selfie-capture-btn">Capture</button>
      <button type="button" class="agegate-selfie-cancel-btn">Cancel</button>
    </div>
  `;

  const videoWrap = wrapper.querySelector<HTMLElement>(".agegate-selfie-video-wrap");
  const placeholder = wrapper.querySelector<HTMLElement>(".agegate-selfie-video-placeholder");
  const captureBtn = wrapper.querySelector<HTMLButtonElement>(".agegate-selfie-capture-btn");
  const cancelBtn = wrapper.querySelector<HTMLButtonElement>(".agegate-selfie-cancel-btn");

  if (!videoWrap || !placeholder || !captureBtn || !cancelBtn) {
    onCancel();
    return () => {};
  }

  let stream: MediaStream | null = null;
  let cancelled = false;

  function cleanup(): void {
    cancelled = true;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }
    video.srcObject = null;
    video.remove();
    wrapper.remove();
  }

  function fail(code: SelfieCaptureErrorCode): void {
    const err: SelfieCaptureError = {
      code,
      message: getUserFacingErrorMessage(code)
    };
    onError?.(err);
    cleanup();
    onCancel();
  }

  cancelBtn.addEventListener("click", () => {
    if (cancelled) return;
    cleanup();
    onCancel();
  });

  captureBtn.addEventListener("click", () => {
    if (cancelled || !stream || video.readyState < 2) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    // Extract base64 only - browsers may fall back to PNG if JPEG unsupported
    const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] ?? dataUrl : dataUrl;

    cleanup();
    onCapture({ imageBase64: base64 });
  });

  container.appendChild(wrapper);
  videoWrap.insertBefore(video, placeholder);

  navigator.mediaDevices
    .getUserMedia({ video: { facingMode: USER_FACING_MODE } })
    .then((s) => {
      if (cancelled) {
        s.getTracks().forEach((t) => t.stop());
        return;
      }
      stream = s;
      video.srcObject = s;
      placeholder.style.display = "none";
      captureBtn.disabled = false;
    })
    .catch((err: DOMException) => {
      if (cancelled) return;
      let code: SelfieCaptureErrorCode = "unknown";
      if (err.name === "NotAllowedError") code = "permission_denied";
      else if (err.name === "NotFoundError") code = "no_camera";
      else if (err.name === "NotReadableError") code = "camera_in_use";
      fail(code);
    });

  captureBtn.disabled = true;
  return cleanup;
}

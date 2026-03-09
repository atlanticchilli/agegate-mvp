"""
RunPod serverless handler for age verification.
"""

import runpod

from .pipeline import verify_age


def handler(event: dict) -> dict:
    """
    Expect input.image (base64), input.min_age, input.buffer.
    Call verify_age, return result.
    """
    print("[agegate] handler started", flush=True)
    inp = event.get("input", {}) or {}
    image_b64 = inp.get("image")
    min_age = inp.get("min_age")
    buffer = inp.get("buffer")

    if not image_b64:
        print("[agegate] error: no image", flush=True)
        return {"error": "invalid_image", "pass": False}

    try:
        result = verify_age(
            image_base64=image_b64,
            min_age=min_age,
            buffer=buffer,
        )
        print("[agegate] result:", result.get("pass"), result.get("error", "ok"), flush=True)
        return result
    except Exception as e:
        print("[agegate] exception:", type(e).__name__, str(e), flush=True)
        return {"error": "age_estimation_failed", "error_code": "handler_exception", "pass": False}


if __name__ == "__main__":
    runpod.serverless.start({"handler": handler})

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
    inp = event.get("input", {}) or {}
    image_b64 = inp.get("image")
    min_age = inp.get("min_age")
    buffer = inp.get("buffer")

    if not image_b64:
        return {"error": "invalid_image", "pass": False}

    result = verify_age(
        image_base64=image_b64,
        min_age=min_age,
        buffer=buffer,
    )
    return result


if __name__ == "__main__":
    runpod.serverless.start({"handler": handler})

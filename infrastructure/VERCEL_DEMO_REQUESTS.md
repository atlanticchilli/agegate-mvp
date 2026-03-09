# Vercel Demo – API Request Spec

**Base URL:** `https://agegate-api-2zir4zr7ka-uc.a.run.app`

**Test site key:** `site_demo4vercel1234567890ab`

---

## Step 1: Create session

**Request:**
```
POST https://agegate-api-2zir4zr7ka-uc.a.run.app/api/session/create
Content-Type: application/json

{
  "siteKey": "site_demo4vercel1234567890ab"
}
```

**Response (200):**
```json
{
  "sessionId": "uuid-string",
  "jurisdiction": "GB",
  "availableMethods": [
    {
      "method": "facial_age_estimation",
      "displayName": "Verify via selfie",
      "provider": "selfie"
    }
  ],
  "config": {
    "verificationValidityPeriod": 86400
  }
}
```

**Errors:**
- `400` – `{"error": "siteKey is required"}`
- `404` – `{"error": "Unknown siteKey"}`

---

## Step 2: Select selfie method

**Request:**
```
POST https://agegate-api-2zir4zr7ka-uc.a.run.app/api/session/verify
Content-Type: application/json

{
  "sessionId": "<sessionId from Step 1>",
  "selectedMethod": "facial_age_estimation",
  "selectedProvider": "selfie"
}
```

**Response (200):**
```json
{
  "verificationUrl": "inline:selfie"
}
```

If `verificationUrl === "inline:selfie"`, show the camera and proceed to Step 3.

---

## Step 3: Submit selfie image

**Request:**
```
POST https://agegate-api-2zir4zr7ka-uc.a.run.app/api/verify-selfie
Content-Type: application/json

{
  "sessionId": "<sessionId from Step 1>",
  "image": "<base64-encoded-jpeg-without-prefix>"
}
```

**Image format:** Raw base64 only (no `data:image/jpeg;base64,` prefix).

```javascript
// If using canvas.toDataURL("image/jpeg", 0.85):
const base64Only = dataUrl.split(",")[1] ?? dataUrl;
```

**Response (200) – success:**
```json
{
  "pass": true,
  "token": "jwt-string",
  "estimated_age": 28,
  "liveness_score": 0.95
}
```

**Response (200) – fail:**
```json
{
  "pass": false,
  "error": "Age verification did not pass...",
  "error_code": "age_below_threshold",
  "estimated_age": 16
}
```

**Error codes:** `no_face_detected`, `liveness_failed`, `age_below_threshold`, `invalid_image`, `liveness_check_failed`, `age_estimation_failed`

---

## CORS

The API allows cross-origin requests for `/api/session` and `/api/verify-selfie`.

---

## JavaScript example

```javascript
const API_BASE = "https://agegate-api-2zir4zr7ka-uc.a.run.app";
const SITE_KEY = "site_demo4vercel1234567890ab";

// Step 1
const createRes = await fetch(`${API_BASE}/api/session/create`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ siteKey: SITE_KEY })
});
const { sessionId } = await createRes.json();

// Step 2
await fetch(`${API_BASE}/api/session/verify`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    sessionId,
    selectedMethod: "facial_age_estimation",
    selectedProvider: "selfie"
  })
});

// Step 3 (after capture)
const base64Only = dataUrl.split(",")[1] ?? dataUrl;
const verifyRes = await fetch(`${API_BASE}/api/verify-selfie`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ sessionId, image: base64Only })
});
const result = await verifyRes.json();
// result.pass, result.estimated_age, result.token, etc.
```

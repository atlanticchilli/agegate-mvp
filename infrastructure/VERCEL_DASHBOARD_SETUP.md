# Vercel Dashboard – Add Selfie Age Estimation

Your Vercel dashboard already has Firebase set up. These are the changes needed to expose the selfie age estimation flow.

---

## 1. Add Environment Variable

In Vercel → **Settings** → **Environment Variables**, add:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_BASE_URL` | `https://agegate-api-2zir4zr7ka-uc.a.run.app` |

Redeploy after adding it.

---

## 2. Update the Embed Snippet

The embed snippet must use the real widget CDN and include `data-api-base-path` so the widget calls the API.

**Current (likely):**
```html
<script src="https://cdn.agegate.example/widget.js" data-site-key="SITE_KEY"></script>
```

**Updated:**
```html
<script 
  src="https://storage.googleapis.com/agegate-mvp-widget-cdn/v1/widget.js" 
  data-site-key="SITE_KEY" 
  data-api-base-path="https://agegate-api-2zir4zr7ka-uc.a.run.app/api/session">
</script>
```

In your code, use the env var for the API base:
```js
const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://agegate-api-2zir4zr7ka-uc.a.run.app";
const snippet = `<script src="https://storage.googleapis.com/agegate-mvp-widget-cdn/v1/widget.js" data-site-key="${siteKey}" data-api-base-path="${apiBase}/api/session"></script>`;
```

---

## 3. Enable Selfie Provider for Sites

Sites must have the **selfie** provider enabled for **facial_age_estimation** so the widget shows the selfie option.

In Firestore, each site’s `providers` array should include:

```json
{
  "providerId": "selfie",
  "enabled": true,
  "credentials": { "clientId": "", "clientSecret": "" }
}
```

Add a Providers (or similar) section when creating/editing a site so operators can enable **Selfie (in-house)** for facial age estimation. If your UI already has provider toggles, add a toggle for `selfie`.

---

## 4. Logs API (if used)

If the dashboard fetches verification logs, point it at the API:

```
GET ${NEXT_PUBLIC_API_BASE_URL}/api/logs?siteId=...
Authorization: Bearer <Firebase ID token>
```

---

## 5. Wire `captureAndAnalyze` to the AgeGate API

The AgeGate API uses a **3-step flow**. Your `captureAndAnalyze` must implement steps 1–3.

### Step 1 — Create session (before showing the camera)

When the user starts verification, call:

```javascript
const createRes = await fetch(`${API_BASE}/api/session/create`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ siteKey })
});
const { sessionId, availableMethods } = await createRes.json();
```

Store `sessionId` in state. Use it for the verify and verify-selfie calls.

### Step 2 — Select selfie method (before capture)

When the user chooses "Verify via selfie", call:

```javascript
const verifyRes = await fetch(`${API_BASE}/api/session/verify`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    sessionId,
    selectedMethod: "facial_age_estimation",
    selectedProvider: "selfie"
  })
});
const { verificationUrl } = await verifyRes.json();
// If verificationUrl === "inline:selfie", show the camera. Otherwise redirect.
```

### Step 3 — Send captured image (replace the fake progress bar)

When the user clicks "Capture selfie" and you have the base64 image:

```javascript
// Strip data URL prefix if present (canvas.toDataURL returns "data:image/jpeg;base64,...")
const base64Only = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;

const response = await fetch(`${API_BASE}/api/verify-selfie`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ sessionId, image: base64Only })
});

const result = await response.json();
// result: { pass, token?, estimated_age?, liveness_score?, error?, error_code? }
```

- **`pass: true`** → verification succeeded. Store `token` if you need it for your app.
- **`pass: false`** → show `result.error` or map `result.error_code` to a user message.
- **`estimated_age`** → real age from RunPod (when available).
- **`error_code`** examples: `no_face_detected`, `liveness_failed`, `age_below_threshold`, `invalid_image`.

### Constants

```javascript
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://agegate-api-2zir4zr7ka-uc.a.run.app";
```

### Flow summary

```
User starts → POST /api/session/create (siteKey) → get sessionId
User picks selfie → POST /api/session/verify (sessionId, method, provider) → get "inline:selfie"
User captures → POST /api/verify-selfie (sessionId, image) → Cloud Run → RunPod worker → real age
```

---

## 6. Test the Flow

1. Create or edit a site and enable **Selfie** for facial age estimation.
2. Copy the site key from the embed snippet.
3. Open: `https://agegate-api-2zir4zr7ka-uc.a.run.app/demo?siteKey=YOUR_SITE_KEY`
4. Choose **Verify via selfie**, take a selfie, and confirm it processes correctly.

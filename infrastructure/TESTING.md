# AgeGate MVP – Testing Guide

## 1. Get your URLs

```bash
# API URL
gcloud run services describe agegate-api --project agegate-mvp --region us-central1 --format='value(status.url)'

# Dashboard URL
gcloud run services describe agegate-dashboard --project agegate-mvp --region us-central1 --format='value(status.url)'
```

## 2. Quick health check

```bash
API_URL="https://YOUR_API_URL"  # from step 1
curl -s "${API_URL}/healthz"
# Expected: {"ok":true}
```

## 3. Create a site (required for full flow)

1. Open the **Dashboard** URL in your browser.
2. Sign up or log in (Firebase Auth).
3. Go to **Sites** → **New Site**.
4. Create a site and enable **selfie** under **facial_age_estimation** in the Providers tab.
5. Copy the **site key** (e.g. `site_25e2eae4e36a4ce1ac18a9bb`).

## 4. Test selfie verification (full flow)

1. Open the demo page with your site key:
   ```
   https://YOUR_API_URL/demo?siteKey=YOUR_SITE_KEY
   ```
2. The AgeGate modal should appear.
3. Choose **Verify via selfie**.
4. Take a selfie when prompted.
5. The RunPod worker processes the image; you should see pass/fail and the modal should dismiss on success.

## 5. Test session creation (curl)

```bash
API_URL="https://YOUR_API_URL"
SITE_KEY="site_YOUR_SITE_KEY"  # from Dashboard

curl -s -X POST "${API_URL}/api/session/create" \
  -H "Content-Type: application/json" \
  -d "{\"siteKey\":\"${SITE_KEY}\"}"
# Expected: JSON with sessionId, jurisdiction, availableMethods
```

## 6. Verify RunPod env vars

If selfie verification returns `RUNPOD_NOT_CONFIGURED`:

```bash
gcloud run services describe agegate-api --project agegate-mvp --region us-central1 --format='yaml(spec.template.spec.containers[0].env)'
```

Ensure `RUNPOD_ENDPOINT_ID` and `RUNPOD_API_KEY` are set.

## 7. Dashboard API base URL

For the Dashboard embed snippet and logs to work, set `NEXT_PUBLIC_API_BASE_URL` when building:

```bash
NEXT_PUBLIC_API_BASE_URL=https://YOUR_API_URL npm run build --workspace=packages/dashboard
```

Or add it to your Cloud Build / deployment config.

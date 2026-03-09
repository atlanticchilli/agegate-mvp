import { Router } from "express";
import { getVerificationBySessionId, updateVerification } from "../services/sessions";
import { getSiteById } from "../services/sites";
import { signVerificationToken } from "../services/token";
import { writeAuditEvent } from "../services/audit";

const router = Router();

interface RunPodOutput {
  pass?: boolean;
  estimated_age?: number;
  liveness_score?: number;
  error?: string;
  error_code?: string;
  [key: string]: unknown;
}

interface RunPodResponse {
  id?: string;
  status?: string;
  output?: RunPodOutput;
  succeeded?: boolean;
  error?: string;
}

function toTimestamp(): { seconds: number; nanoseconds: number } {
  const ms = Date.now();
  return {
    seconds: Math.floor(ms / 1000),
    nanoseconds: (ms % 1000) * 1_000_000
  };
}

router.post("/", async (req, res) => {
  try {
    await handleVerifySelfie(req, res);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[verify-selfie] Unhandled error:", message, stack);
    res.status(500).json({
      pass: false,
      error: "Verification failed",
      error_code: "INTERNAL_ERROR",
      details: process.env.NODE_ENV === "development" ? message : undefined
    });
  }
});

async function handleVerifySelfie(
  req: import("express").Request,
  res: import("express").Response
): Promise<void> {
  const { sessionId, image, min_age, buffer } = req.body as {
    sessionId?: string;
    image?: string;
    min_age?: number;
    buffer?: number;
  };

  if (!sessionId || !image) {
    res.status(400).json({
      pass: false,
      error: "sessionId and image are required"
    });
    return;
  }

  if (typeof image !== "string") {
    res.status(400).json({
      pass: false,
      error: "image must be a base64 string"
    });
    return;
  }

  const session = await getVerificationBySessionId(sessionId);
  if (!session) {
    res.status(404).json({
      pass: false,
      error: "Session not found"
    });
    return;
  }

  const site = await getSiteById(session.siteId);
  if (!site) {
    res.status(404).json({
      pass: false,
      error: "Site not found for session"
    });
    return;
  }

  if (session.selectedMethod !== "facial_age_estimation" || session.selectedProvider !== "selfie") {
    res.status(400).json({
      pass: false,
      error: "Session must use facial_age_estimation with selfie provider"
    });
    return;
  }

  const endpointId = process.env.RUNPOD_ENDPOINT_ID;
  const apiKey = process.env.RUNPOD_API_KEY;

  if (!endpointId || !apiKey) {
    res.status(503).json({
      pass: false,
      error: "Selfie verification service unavailable",
      error_code: "RUNPOD_NOT_CONFIGURED"
    });
    return;
  }

  const input: Record<string, unknown> = { image };
  if (typeof min_age === "number") {
    input.min_age = min_age;
  }
  if (typeof buffer === "number") {
    input.buffer = buffer;
  }

  let runPodResponse: RunPodResponse;
  try {
    const runResp = await fetch(`https://api.runpod.ai/v2/${endpointId}/runsync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({ input })
    });

    if (!runResp.ok) {
      const errText = await runResp.text();
      res.status(502).json({
        pass: false,
        error: `RunPod request failed: ${runResp.status}`,
        error_code: "RUNPOD_ERROR",
        details: errText
      });
      return;
    }

    const responseText = await runResp.text();
    try {
      runPodResponse = JSON.parse(responseText) as RunPodResponse;
    } catch (parseErr) {
      const msg = parseErr instanceof Error ? parseErr.message : "Unknown";
      console.error("[verify-selfie] RunPod response parse error:", msg);
      res.status(502).json({
        pass: false,
        error: `RunPod response invalid: ${msg}`,
        error_code: "RUNPOD_PARSE_ERROR"
      });
      return;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[verify-selfie] RunPod request failed:", message);
    res.status(502).json({
      pass: false,
      error: `RunPod request failed: ${message}`,
      error_code: "RUNPOD_NETWORK_ERROR"
    });
    return;
  }

  const output = runPodResponse.output;
  const pass = Boolean(output?.pass ?? runPodResponse.succeeded ?? false);
  const providerTransactionId = runPodResponse.id ?? `selfie_${Date.now()}`;

  const verificationResult = {
    verified: pass,
    ageCategory: pass ? "adult" : "minor",
    method: "facial_age_estimation",
    provider: "selfie",
    providerTransactionId,
    completedAt: toTimestamp()
  };

  await updateVerification(site.id, sessionId, {
    status: pass ? "verified" : "failed",
    result: verificationResult
  });

  await writeAuditEvent({
    siteId: site.id,
    verificationId: sessionId,
    action: "verification_completed",
    details: {
      method: "facial_age_estimation",
      provider: "selfie",
      verified: pass,
      estimated_age: output?.estimated_age,
      liveness_score: output?.liveness_score
    }
  });

  let token: string | undefined;
  if (pass) {
    const secretKey = site.secretKey;
    const validityPeriod = site.verificationValidityPeriod ?? 86400;
    if (!secretKey || typeof secretKey !== "string") {
      console.error("[verify-selfie] Site missing secretKey:", site.id);
      res.status(500).json({
        pass: false,
        error: "Site configuration error",
        error_code: "SITE_CONFIG_ERROR"
      });
      return;
    }
    token = signVerificationToken({
      siteSecretKey: secretKey,
      sessionId,
      siteId: session.siteId,
      jurisdiction: session.jurisdiction,
      method: "facial_age_estimation",
      ageCategory: "adult",
      verificationValidityPeriodSeconds: validityPeriod
    });
  }

  const response: Record<string, unknown> = {
    pass,
    ...(token ? { token } : {}),
    ...(output?.error ? { error: output.error } : {}),
    ...(output?.error_code ? { error_code: output.error_code, errorCode: output.error_code } : {}),
    ...(typeof output?.estimated_age === "number" ? { estimated_age: output.estimated_age } : {}),
    ...(typeof output?.liveness_score === "number" ? { liveness_score: output.liveness_score } : {})
  };

  res.json(response);
});

export default router;

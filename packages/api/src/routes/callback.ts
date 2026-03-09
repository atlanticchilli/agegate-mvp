import { Router } from "express";
import { getProviderAdapter } from "../providers";
import { resolveProviderCredentials } from "../services/credentials";
import { getVerificationBySessionId, updateVerification } from "../services/sessions";
import { getSiteById } from "../services/sites";
import { writeAuditEvent } from "../services/audit";

const callbackRouter = Router();
const mockRouter = Router();

function toSafeRedirect(urlValue: string | undefined): string | null {
  if (!urlValue) {
    return null;
  }

  try {
    const parsed = new URL(urlValue);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

callbackRouter.post("/mock", async (req, res) => {
  const { sessionId, result, method } = req.body as {
    sessionId?: string;
    result?: "pass" | "fail";
    method?: string;
  };

  if (!sessionId || !result) {
    res.status(400).json({ error: "sessionId and result are required" });
    return;
  }

  const session = await getVerificationBySessionId(sessionId);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const site = await getSiteById(session.siteId);
  if (!site) {
    res.status(404).json({ error: "Site not found for session" });
    return;
  }

  const providerId = session.selectedProvider ?? "mock";
  const provider = site.providers.find((item) => item.providerId === providerId);
  if (!provider) {
    res.status(400).json({ error: "Provider missing in site configuration" });
    return;
  }

  const adapter = getProviderAdapter(providerId);
  const callbackMethod = method ?? session.selectedMethod ?? "mock";
  const verificationResult = await adapter.handleCallback({
    callbackData: {
      result,
      method: callbackMethod
    },
    operatorCredentials: await resolveProviderCredentials(provider)
  });

  const isVerified = verificationResult.verified;
  await updateVerification(site.id, sessionId, {
    status: isVerified ? "verified" : "failed",
    result: verificationResult
  });

  await writeAuditEvent({
    siteId: site.id,
    verificationId: sessionId,
    action: "verification_completed",
    details: {
      result,
      method: callbackMethod,
      verified: verificationResult.verified
    }
  });

  const redirect = toSafeRedirect(req.query.redirect as string | undefined);
  if (redirect) {
    res.redirect(302, redirect);
    return;
  }

  res.json({
    ok: true
  });
});

mockRouter.get("/verify", async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    res.status(404).send("Not found");
    return;
  }

  const sessionId = String(req.query.session ?? "");
  const method = String(req.query.method ?? "unknown");
  if (!sessionId) {
    res.status(400).send("Missing session query parameter");
    return;
  }

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Mock Age Verification</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 2rem; max-width: 680px; }
      .actions { display: flex; gap: 1rem; margin-top: 1.5rem; }
      button { padding: 0.75rem 1.25rem; border: 0; border-radius: 8px; cursor: pointer; }
      .pass { background: #0a7f3f; color: #fff; }
      .fail { background: #a11919; color: #fff; }
      code { background: #f1f1f1; padding: 0.2rem 0.4rem; border-radius: 4px; }
    </style>
  </head>
  <body>
    <h1>Mock Age Verification</h1>
    <p>Session: <code>${sessionId}</code></p>
    <p>Method: <code>${method}</code></p>
    <form method="post" action="/api/callback/mock">
      <input type="hidden" name="sessionId" value="${sessionId}" />
      <input type="hidden" name="method" value="${method}" />
      <div class="actions">
        <button class="pass" name="result" value="pass" type="submit">Pass</button>
        <button class="fail" name="result" value="fail" type="submit">Fail</button>
      </div>
    </form>
  </body>
</html>`;

  res.status(200).contentType("text/html").send(html);
});

export { callbackRouter, mockRouter };

import { Router } from "express";
import { randomUUID } from "node:crypto";
import { getProviderAdapter } from "../providers";
import { resolveProviderCredentials } from "../services/credentials";
import { detectJurisdictionFromIp, getClientIp } from "../services/jurisdiction";
import { getAvailableMethods } from "../services/rules";
import {
  createVerificationSession,
  getVerificationBySessionId,
  updateVerification
} from "../services/sessions";
import { sha256 } from "../services/hash";
import { getSiteById, getSiteBySiteKey } from "../services/sites";
import { writeAuditEvent } from "../services/audit";
import { signVerificationToken } from "../services/token";

const router = Router();

router.post("/create", async (req, res) => {
  const { siteKey } = req.body as { siteKey?: string };
  if (!siteKey) {
    res.status(400).json({ error: "siteKey is required" });
    return;
  }

  const site = await getSiteBySiteKey(siteKey);
  if (!site) {
    res.status(404).json({ error: "Unknown siteKey" });
    return;
  }

  const clientIp = getClientIp(req.headers);
  const jurisdiction = await detectJurisdictionFromIp(clientIp);
  const availableMethods = await getAvailableMethods({
    jurisdiction,
    providers: site.providers
  });

  const sessionId = randomUUID();
  await createVerificationSession({
    id: sessionId,
    siteId: site.id,
    jurisdiction,
    availableMethods,
    status: "pending",
    userIpHash: sha256(clientIp),
    userAgent: req.header("user-agent") ?? "unknown"
  });

  await writeAuditEvent({
    siteId: site.id,
    verificationId: sessionId,
    action: "session_created",
    details: {
      jurisdiction,
      availableMethodCount: availableMethods.length
    }
  });

  res.json({
    sessionId,
    jurisdiction,
    availableMethods,
    config: {
      verificationValidityPeriod: site.verificationValidityPeriod
    }
  });
});

router.post("/verify", async (req, res) => {
  const { sessionId, selectedMethod, selectedProvider } = req.body as {
    sessionId?: string;
    selectedMethod?: string;
    selectedProvider?: string;
  };

  if (!sessionId || !selectedMethod || !selectedProvider) {
    res.status(400).json({ error: "sessionId, selectedMethod, selectedProvider are required" });
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

  const providerConfig = site.providers.find(
    (provider) => provider.providerId === selectedProvider && provider.enabled
  );
  if (!providerConfig) {
    res.status(400).json({ error: "Selected provider not configured for site" });
    return;
  }

  const methodAllowed = session.availableMethods.some(
    (method) => method.method === selectedMethod && method.provider === selectedProvider
  );
  if (!methodAllowed) {
    res.status(400).json({ error: "Selected method/provider is not allowed for session" });
    return;
  }

  const adapter = getProviderAdapter(selectedProvider);
  const callbackBase = process.env.API_BASE_URL ?? `${req.protocol}://${req.get("host")}`;
  const providerSession = await adapter.createSession({
    operatorCredentials: await resolveProviderCredentials(providerConfig),
    jurisdiction: session.jurisdiction,
    method: selectedMethod,
    callbackUrl: callbackBase,
    sessionId
  });

  await updateVerification(site.id, sessionId, {
    selectedMethod,
    selectedProvider,
    providerSessionUrl: providerSession.verificationUrl,
    providerSessionId: providerSession.providerSessionId,
    status: "in_progress"
  });

  await writeAuditEvent({
    siteId: site.id,
    verificationId: sessionId,
    action: "verification_started",
    details: {
      selectedMethod,
      selectedProvider
    }
  });

  res.json({
    verificationUrl: providerSession.verificationUrl
  });
});

router.get("/:id/status", async (req, res) => {
  const sessionId = req.params.id;
  const session = await getVerificationBySessionId(sessionId);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const verified = Boolean(session.result?.verified);
  const ageCategory = session.result?.ageCategory ?? "unknown";

  let token: string | undefined;
  if (verified && session.selectedMethod) {
    const site = await getSiteById(session.siteId);
    if (!site) {
      res.status(404).json({ error: "Site not found for session" });
      return;
    }

    token = signVerificationToken({
      siteSecretKey: site.secretKey,
      sessionId,
      siteId: session.siteId,
      jurisdiction: session.jurisdiction,
      method: session.selectedMethod,
      ageCategory,
      verificationValidityPeriodSeconds: site.verificationValidityPeriod
    });
  }

  res.json({
    status: session.status,
    verified,
    ageCategory,
    ...(token ? { token } : {})
  });
});

export default router;

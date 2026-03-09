import { createHmac } from "node:crypto";

function toBase64Url(value: string): string {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

export function signVerificationToken(params: {
  siteSecretKey: string;
  sessionId: string;
  siteId: string;
  jurisdiction: string;
  method: string;
  ageCategory: string;
  verificationValidityPeriodSeconds: number;
}): string {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const expiresAt = nowSeconds + params.verificationValidityPeriodSeconds;
  const payload = {
    sessionId: params.sessionId,
    siteId: params.siteId,
    jurisdiction: params.jurisdiction,
    method: params.method,
    ageCategory: params.ageCategory,
    iat: nowSeconds,
    exp: expiresAt,
    verifiedAt: nowSeconds,
    expiresAt
  };

  const header = {
    alg: "HS256",
    typ: "JWT"
  };

  const encodedHeader = toBase64Url(JSON.stringify(header));
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const signature = createHmac("sha256", params.siteSecretKey)
    .update(signingInput)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${signingInput}.${signature}`;
}

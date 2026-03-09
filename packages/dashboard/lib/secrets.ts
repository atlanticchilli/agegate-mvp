function createUuid(): string {
  if (typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `fallback-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export function generateSiteKey(): string {
  return `site_${createUuid().replace(/-/g, "").slice(0, 24)}`;
}

export function generateSecretKey(): string {
  return `secret_${createUuid().replace(/-/g, "")}${createUuid().replace(/-/g, "")}`;
}

export function maskSecretKey(secretKey: string): string {
  if (secretKey.length < 12) {
    return "********";
  }
  const prefix = secretKey.slice(0, 6);
  const suffix = secretKey.slice(-4);
  return `${prefix}${"*".repeat(12)}${suffix}`;
}

export function getDisplayedSecretKey(params: {
  persistedSecretKey: string;
  oneTimeSecretKey?: string | null;
}): string {
  if (params.oneTimeSecretKey) {
    return params.oneTimeSecretKey;
  }
  return maskSecretKey(params.persistedSecretKey);
}

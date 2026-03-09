import type { ProviderAdapter, VerificationResult } from "@agegate/shared";

export class MockProviderAdapter implements ProviderAdapter {
  async createSession(params: {
    operatorCredentials: Record<string, string>;
    jurisdiction: string;
    method: string;
    callbackUrl: string;
    sessionId: string;
  }): Promise<{ verificationUrl: string; providerSessionId: string }> {
    const providerSessionId = `mock-${params.sessionId}`;
    const url = new URL("/mock/verify", params.callbackUrl);
    url.searchParams.set("session", params.sessionId);
    url.searchParams.set("method", params.method);

    return {
      verificationUrl: url.toString(),
      providerSessionId
    };
  }

  async handleCallback(params: {
    callbackData: Record<string, unknown>;
    operatorCredentials: Record<string, string>;
  }): Promise<VerificationResult> {
    const outcome = params.callbackData.result;
    const verified = outcome === "pass";
    return {
      verified,
      ageCategory: verified ? "adult" : "minor",
      method: String(params.callbackData.method ?? "unknown"),
      provider: "mock",
      providerTransactionId: `txn_${Date.now()}`,
      completedAt: {
        seconds: Math.floor(Date.now() / 1000),
        nanoseconds: 0
      }
    };
  }
}

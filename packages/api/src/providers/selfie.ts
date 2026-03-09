import type { ProviderAdapter } from "@agegate/shared";

export class SelfieProviderAdapter implements ProviderAdapter {
  async createSession(params: {
    operatorCredentials: Record<string, string>;
    jurisdiction: string;
    method: string;
    callbackUrl: string;
    sessionId: string;
  }): Promise<{ verificationUrl: string; providerSessionId: string }> {
    const providerSessionId = `selfie-${params.sessionId}`;
    return {
      verificationUrl: "inline:selfie",
      providerSessionId
    };
  }

  async handleCallback(): Promise<never> {
    throw new Error(
      "Selfie provider uses the direct /api/verify-selfie route instead of callback"
    );
  }
}

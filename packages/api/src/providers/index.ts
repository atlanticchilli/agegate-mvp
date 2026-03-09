import type { ProviderAdapter, ProviderId } from "@agegate/shared";
import { MockProviderAdapter } from "./mock";
import { SelfieProviderAdapter } from "./selfie";

const mockAdapter = new MockProviderAdapter();
const selfieAdapter = new SelfieProviderAdapter();

export function getProviderAdapter(providerId: string): ProviderAdapter {
  const typed = providerId as ProviderId;
  if (typed === "mock") {
    return mockAdapter;
  }
  if (typed === "selfie") {
    return selfieAdapter;
  }

  throw new Error(`Unsupported provider adapter: ${providerId}`);
}

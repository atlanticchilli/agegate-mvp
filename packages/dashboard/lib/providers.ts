import type { ProviderConfig, ProviderId } from "@agegate/shared";

export interface ProviderCredentialsMeta {
  hasClientSecret: boolean;
  updatedAt: string;
}

export interface DashboardProviderConfig extends ProviderConfig {
  credentialsRef?: string;
  credentialsMeta?: ProviderCredentialsMeta;
}

const PROVIDER_NAMES: Record<ProviderId, string> = {
  verifymyage: "VerifyMyAge",
  openage: "OpenAge",
  mock: "Mock",
  selfie: "Selfie (in-house)"
};

export function getProviderName(providerId: ProviderId): string {
  return PROVIDER_NAMES[providerId];
}

export function defaultProviders(): DashboardProviderConfig[] {
  const isDevelopment = process.env.NODE_ENV !== "production";
  return [
    {
      providerId: "verifymyage",
      enabled: false,
      credentials: {
        clientId: "",
        clientSecret: ""
      }
    },
    {
      providerId: "openage",
      enabled: false,
      credentials: {
        clientId: "",
        clientSecret: ""
      }
    },
    {
      providerId: "mock",
      enabled: isDevelopment,
      credentials: {
        clientId: "mock-client",
        clientSecret: ""
      }
    },
    {
      providerId: "selfie",
      enabled: false,
      credentials: {
        clientId: "",
        clientSecret: ""
      }
    }
  ];
}

export function sanitizeProvidersForStorage(
  providers: DashboardProviderConfig[]
): DashboardProviderConfig[] {
  return providers.map((provider) => ({
    ...provider,
    credentials: {
      ...provider.credentials,
      clientSecret: ""
    }
  }));
}

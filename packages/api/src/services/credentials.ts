import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import type { ProviderConfig } from "@agegate/shared";

const secretClient = new SecretManagerServiceClient();

interface ProviderConfigWithReference extends ProviderConfig {
  credentialsRef?: string;
}

export async function resolveProviderCredentials(
  provider: ProviderConfig
): Promise<ProviderConfig["credentials"]> {
  const providerWithRef = provider as ProviderConfigWithReference;
  if (!providerWithRef.credentialsRef) {
    return provider.credentials;
  }

  const [version] = await secretClient.accessSecretVersion({
    name: providerWithRef.credentialsRef
  });

  const payload = version.payload?.data?.toString("utf8");
  if (!payload) {
    throw new Error("Secret Manager credentials payload is empty");
  }

  const parsed = JSON.parse(payload) as ProviderConfig["credentials"];
  return parsed;
}

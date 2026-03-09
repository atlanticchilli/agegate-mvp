import type { JurisdictionRules, MethodOption, ProviderConfig } from "@agegate/shared";
import fs from "node:fs/promises";
import path from "node:path";

let rulesCache: JurisdictionRules | null = null;

function getRulesCandidates(): string[] {
  return [
    path.resolve(process.cwd(), "data/rules.json"),
    path.resolve(process.cwd(), "../../data/rules.json"),
    path.resolve(process.cwd(), "packages/api/data/rules.json"),
    path.resolve(__dirname, "../../../data/rules.json"),
    path.resolve(__dirname, "../../../../data/rules.json")
  ];
}

async function loadRulesRaw(): Promise<JurisdictionRules> {
  for (const rulesPath of getRulesCandidates()) {
    try {
      const content = await fs.readFile(rulesPath, "utf8");
      return JSON.parse(content) as JurisdictionRules;
    } catch {
      continue;
    }
  }
  throw new Error("Unable to load rules.json from canonical or synced paths");
}

export async function getRules(): Promise<JurisdictionRules> {
  if (!rulesCache) {
    rulesCache = await loadRulesRaw();
  }
  return rulesCache;
}

export async function getAvailableMethods(params: {
  jurisdiction: string;
  providers: ProviderConfig[];
  serviceType?: string;
}): Promise<MethodOption[]> {
  const serviceType = params.serviceType ?? "adult_content";
  const rules = await getRules();
  const jurisdictionRules = rules[params.jurisdiction]?.[serviceType];
  if (!jurisdictionRules) {
    return [];
  }

  const enabledProviderIds = new Set(
    params.providers.filter((provider) => provider.enabled).map((provider) => provider.providerId)
  );

  const methods: MethodOption[] = [];
  for (const approved of jurisdictionRules.approvedMethods) {
    for (const provider of approved.providers) {
      if (!enabledProviderIds.has(provider as ProviderConfig["providerId"])) {
        continue;
      }
      methods.push({
        method: approved.method,
        displayName: approved.displayName,
        provider
      });
    }
  }

  return methods;
}

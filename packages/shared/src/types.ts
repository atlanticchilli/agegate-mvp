export interface Timestamp {
  seconds: number;
  nanoseconds: number;
}

export interface Site {
  id: string;
  operatorId: string;
  name: string;
  domain: string;
  siteKey: string;
  secretKey: string;
  providers: ProviderConfig[];
  verificationValidityPeriod: number;
  createdAt: Timestamp;
}

export type ProviderId = "verifymyage" | "openage" | "mock" | "selfie";

export interface ProviderConfig {
  providerId: ProviderId;
  credentials: {
    clientId: string;
    clientSecret: string;
    [key: string]: string;
  };
  enabled: boolean;
}

export type VerificationSessionStatus =
  | "pending"
  | "in_progress"
  | "verified"
  | "failed"
  | "expired";

export interface VerificationSession {
  id: string;
  siteId: string;
  jurisdiction: string;
  availableMethods: MethodOption[];
  selectedMethod?: string;
  selectedProvider?: string;
  providerSessionUrl?: string;
  status: VerificationSessionStatus;
  result?: VerificationResult;
  userIpHash: string;
  userAgent: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface VerificationResult {
  verified: boolean;
  ageCategory: string;
  method: string;
  provider: string;
  providerTransactionId: string;
  completedAt: Timestamp;
}

export interface MethodOption {
  method: string;
  displayName: string;
  provider: string;
}

export interface VerificationToken {
  siteId: string;
  verifiedAt: number;
  expiresAt: number;
  jurisdiction: string;
  method: string;
  ageCategory: string;
  signature: string;
}

export interface ApprovedMethod {
  method: string;
  displayName: string;
  providers: string[];
  regulatorStatus: string;
}

export interface JurisdictionServiceRules {
  regulator: string;
  regulation: string;
  enforcementDate: string;
  approvedMethods: ApprovedMethod[];
  rejectedMethods: string[];
}

export interface JurisdictionRules {
  [countryCode: string]: {
    [serviceType: string]: JurisdictionServiceRules;
  };
}

export interface ProviderAdapter {
  createSession(params: {
    operatorCredentials: ProviderConfig["credentials"];
    jurisdiction: string;
    method: string;
    callbackUrl: string;
    sessionId: string;
  }): Promise<{ verificationUrl: string; providerSessionId: string }>;
  handleCallback(params: {
    callbackData: Record<string, unknown>;
    operatorCredentials: ProviderConfig["credentials"];
  }): Promise<VerificationResult>;
}

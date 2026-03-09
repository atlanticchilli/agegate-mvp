export type WidgetTheme = "light" | "dark";

export type WidgetPosition = "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right";

export interface WidgetConfig {
  siteKey: string;
  theme: WidgetTheme;
  accentColor: string;
  position: WidgetPosition;
  logoUrl?: string;
  apiBasePath: string;
}

export interface AvailableMethod {
  method: string;
  provider: string;
  displayName: string;
}

export interface SessionCreateResponse {
  sessionId: string;
  jurisdiction: string;
  availableMethods: AvailableMethod[];
  config: {
    verificationValidityPeriod: number;
  };
}

export interface SessionVerifyRequest {
  sessionId: string;
  selectedMethod: string;
  selectedProvider: string;
}

export interface SessionVerifyResponse {
  verificationUrl: string;
}

export interface SessionStatusResponse {
  status: string;
  verified: boolean;
  ageCategory: string;
  token?: string;
}

export interface VerificationTokenPayload {
  sessionId?: string;
  siteId: string;
  jurisdiction: string;
  method: string;
  ageCategory: string;
  iat?: number;
  exp?: number;
  verifiedAt?: number;
  expiresAt?: number;
}

// --- Selfie verification ---

export interface VerifySelfieRequest {
  sessionId: string;
  image: string;
}

export interface VerifySelfieResponse {
  pass: boolean;
  token?: string;
  error?: string;
  errorCode?: VerifySelfieErrorCode;
  estimated_age?: number;
  liveness_score?: number;
}

export const VERIFY_SELFIE_ERROR_CODES = {
  no_face_detected: "no_face_detected",
  liveness_failed: "liveness_failed",
  age_below_threshold: "age_below_threshold",
  invalid_image: "invalid_image",
  liveness_check_failed: "liveness_check_failed",
  age_estimation_failed: "age_estimation_failed"
} as const;

export type VerifySelfieErrorCode = (typeof VERIFY_SELFIE_ERROR_CODES)[keyof typeof VERIFY_SELFIE_ERROR_CODES];

export const VERIFY_SELFIE_ERROR_MESSAGES: Record<VerifySelfieErrorCode, string> = {
  [VERIFY_SELFIE_ERROR_CODES.no_face_detected]:
    "No face was detected in the image. Please ensure your face is clearly visible and try again.",
  [VERIFY_SELFIE_ERROR_CODES.liveness_failed]:
    "Liveness check failed. Please ensure you are a real person and try again.",
  [VERIFY_SELFIE_ERROR_CODES.age_below_threshold]:
    "Age verification did not pass. You must meet the minimum age requirement.",
  [VERIFY_SELFIE_ERROR_CODES.invalid_image]:
    "The image could not be processed. Please take a clear photo and try again.",
  [VERIFY_SELFIE_ERROR_CODES.liveness_check_failed]:
    "We couldn't verify that this is a live photo. Please try again.",
  [VERIFY_SELFIE_ERROR_CODES.age_estimation_failed]:
    "We couldn't estimate your age from the image. Please try again with a clearer photo."
};

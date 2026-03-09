import { ApiClient } from "./api-client";
import { AgeGateModal } from "./modal";
import {
  clearStoredSessionId,
  getBrowserSessionDeps,
  getValidTokenFromDualStorage,
  persistSessionId,
  persistTokenDualStorage,
  resolveSessionIdForStatus
} from "./session";
import type { AvailableMethod, WidgetConfig, WidgetPosition, WidgetTheme } from "./types";
import {
  VERIFY_SELFIE_ERROR_CODES,
  VERIFY_SELFIE_ERROR_MESSAGES,
  type VerifySelfieErrorCode
} from "./types";

const DEFAULT_ACCENT_COLOR = "#4f46e5";
const DEFAULT_POSITION: WidgetPosition = "center";
const DEFAULT_THEME: WidgetTheme = "light";

export async function initAgeGateWidget(): Promise<void> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  await waitForBody();
  const config = readWidgetConfig();
  if (!config) {
    return;
  }

  const sessionDeps = getBrowserSessionDeps();
  if (!sessionDeps) {
    return;
  }

  const existingToken = getValidTokenFromDualStorage(sessionDeps);
  if (existingToken) {
    return;
  }

  const apiClient = new ApiClient(config.apiBasePath);
  const existingSessionId = resolveSessionIdForStatus(window.location.search, sessionDeps);

  if (existingSessionId) {
    try {
      const status = await apiClient.getSessionStatus(existingSessionId);
      if (status.verified && status.token) {
        persistTokenDualStorage(status.token, sessionDeps);
        clearStoredSessionId(sessionDeps);
        return;
      }
    } catch {
      // Ignore status failures and continue with a fresh session.
    }
  }

  const session = await apiClient.createSession(config.siteKey);
  persistSessionId(session.sessionId, sessionDeps);

  const sessionDepsForSelfie = sessionDeps;
  const modal = new AgeGateModal({
    theme: config.theme,
    accentColor: config.accentColor,
    position: config.position,
    logoUrl: config.logoUrl,
    jurisdiction: session.jurisdiction,
    methods: session.availableMethods,
    onMethodClick: (method) => {
      if (method.method === "facial_age_estimation" && method.provider === "selfie") {
        void handleSelfieVerification(apiClient, session.sessionId, modal, method, sessionDepsForSelfie);
      } else {
        void startVerificationRedirect(apiClient, session.sessionId, method);
      }
    }
  });

  modal.mount();
}

function readWidgetConfig(): WidgetConfig | null {
  const script = getWidgetScriptElement();
  if (!script) {
    return null;
  }

  const siteKey = readDataAttribute(script, "siteKey");
  if (!siteKey) {
    console.error("[AgeGate Widget] Missing required data-site-key attribute.");
    return null;
  }

  return {
    siteKey,
    theme: parseTheme(readDataAttribute(script, "theme")),
    accentColor: readDataAttribute(script, "accentColor") ?? DEFAULT_ACCENT_COLOR,
    position: parsePosition(readDataAttribute(script, "position")),
    logoUrl: readDataAttribute(script, "logoUrl") ?? undefined,
    apiBasePath: "/api/session"
  };
}

function getWidgetScriptElement(): HTMLScriptElement | null {
  if (document.currentScript instanceof HTMLScriptElement) {
    return document.currentScript;
  }

  const candidates = Array.from(document.querySelectorAll<HTMLScriptElement>("script[data-site-key]"));
  return candidates.length > 0 ? candidates[candidates.length - 1] : null;
}

function readDataAttribute(script: HTMLScriptElement, key: string): string | null {
  const fromDataset = script.dataset[key as keyof DOMStringMap];
  if (typeof fromDataset === "string" && fromDataset.length > 0) {
    return fromDataset;
  }

  const kebabCase = `data-${key.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)}`;
  const attributeValue = script.getAttribute(kebabCase);
  if (attributeValue && attributeValue.length > 0) {
    return attributeValue;
  }
  return null;
}

function parseTheme(theme: string | null): WidgetTheme {
  return theme === "dark" ? "dark" : DEFAULT_THEME;
}

function parsePosition(position: string | null): WidgetPosition {
  const validPositions: WidgetPosition[] = [
    "center",
    "top-left",
    "top-right",
    "bottom-left",
    "bottom-right"
  ];
  return validPositions.includes(position as WidgetPosition)
    ? (position as WidgetPosition)
    : DEFAULT_POSITION;
}

async function startVerificationRedirect(
  apiClient: ApiClient,
  sessionId: string,
  method: AvailableMethod
): Promise<void> {
  const response = await apiClient.verifySession({
    sessionId,
    selectedMethod: method.method,
    selectedProvider: method.provider
  });

  // Same-window redirect by design.
  window.location.assign(response.verificationUrl);
}

async function handleSelfieVerification(
  apiClient: ApiClient,
  sessionId: string,
  modal: AgeGateModal,
  method: { method: string; provider: string; displayName: string },
  sessionDeps: NonNullable<ReturnType<typeof getBrowserSessionDeps>>
): Promise<void> {
  try {
    const verifyResponse = await apiClient.verifySession({
      sessionId,
      selectedMethod: method.method,
      selectedProvider: method.provider
    });
    if (verifyResponse.verificationUrl !== "inline:selfie") {
      window.location.assign(verifyResponse.verificationUrl);
      return;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Verification failed. Please try again.";
    showSelfieError(modal, message, () => handleSelfieVerification(apiClient, sessionId, modal, method, sessionDeps));
    return;
  }

  const doCapture = (): void => {
    modal.showSelfieCapture(
      async (imageBase64) => {
        try {
          const response = await apiClient.verifySelfie(sessionId, imageBase64);
          if (response.pass && response.token) {
            persistTokenDualStorage(response.token, sessionDeps);
            clearStoredSessionId(sessionDeps);
            modal.dismiss();
          } else {
            showSelfieError(modal, response.errorCode ?? response.error, doCapture);
          }
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Verification failed. Please try again.";
          showSelfieError(modal, message, doCapture);
        }
      },
      () => {
        modal.showMethodsView();
      }
    );
  };
  doCapture();
}

function showSelfieError(
  modal: AgeGateModal,
  errorCodeOrMessage: string | VerifySelfieErrorCode | undefined,
  onRetry: () => void
): void {
  const knownCodes = Object.values(VERIFY_SELFIE_ERROR_CODES) as string[];
  const message =
    errorCodeOrMessage && knownCodes.includes(errorCodeOrMessage)
      ? VERIFY_SELFIE_ERROR_MESSAGES[errorCodeOrMessage as VerifySelfieErrorCode]
      : "Verification failed. Please try again.";
  modal.showSelfieError(message, onRetry);
}

async function waitForBody(): Promise<void> {
  if (document.body) {
    return;
  }

  await new Promise<void>((resolve) => {
    document.addEventListener("DOMContentLoaded", () => resolve(), { once: true });
  });
}

if (typeof window !== "undefined") {
  void initAgeGateWidget().catch((error: unknown) => {
    console.error("[AgeGate Widget] Initialization failed.", error);
  });
}

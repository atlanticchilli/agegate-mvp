import type {
  SessionCreateResponse,
  SessionStatusResponse,
  SessionVerifyRequest,
  SessionVerifyResponse,
  VerifySelfieErrorCode,
  VerifySelfieResponse
} from "./types";

export class ApiClient {
  private readonly _basePath: string;

  public constructor(basePath = "/api/session") {
    this._basePath = basePath.replace(/\/$/, "");
  }

  /** Base URL for non-session endpoints (e.g. verify-selfie). Derives from basePath. */
  private get _baseUrl(): string {
    return this._basePath.replace(/\/session$/, "") || this._basePath;
  }

  public async createSession(siteKey: string): Promise<SessionCreateResponse> {
    return this.request<SessionCreateResponse>("/create", {
      method: "POST",
      body: JSON.stringify({ siteKey })
    });
  }

  public async verifySession(request: SessionVerifyRequest): Promise<SessionVerifyResponse> {
    return this.request<SessionVerifyResponse>("/verify", {
      method: "POST",
      body: JSON.stringify(request)
    });
  }

  public async getSessionStatus(sessionId: string): Promise<SessionStatusResponse> {
    return this.request<SessionStatusResponse>(`/${encodeURIComponent(sessionId)}/status`, {
      method: "GET"
    });
  }

  public async verifySelfie(sessionId: string, imageBase64: string): Promise<VerifySelfieResponse> {
    const baseUrl = this._baseUrl;
    const url = `${baseUrl}/verify-selfie`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, image: imageBase64 })
    });

    const data = (await response.json().catch(() => ({}))) as VerifySelfieResponse & {
      error?: string;
      errorCode?: string;
    };

    if (!response.ok) {
      return {
        pass: false,
        error: data.error ?? `${response.status} ${response.statusText}`,
        errorCode: data.errorCode as VerifySelfieErrorCode | undefined
      };
    }

    return data as VerifySelfieResponse;
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const response = await fetch(`${this._basePath}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init.headers ?? {})
      }
    });

    if (!response.ok) {
      let errorMessage = `${response.status} ${response.statusText}`;
      try {
        const data = (await response.json()) as { error?: string };
        if (data.error) {
          errorMessage = data.error;
        }
      } catch {
        // Keep the fallback status text when the response body is not JSON.
      }
      throw new Error(`AgeGate API request failed: ${errorMessage}`);
    }

    return (await response.json()) as T;
  }
}

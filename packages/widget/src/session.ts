import type { VerificationTokenPayload } from "./types";

export const TOKEN_STORAGE_KEY = "agegate:verification_token";
export const TOKEN_COOKIE_KEY = "agegate_verification_token";
export const SESSION_ID_STORAGE_KEY = "agegate:session_id";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface CookieStore {
  get(name: string): string | null;
  set(name: string, value: string, maxAgeSeconds: number): void;
  clear(name: string): void;
}

export interface SessionDeps {
  storage: StorageLike;
  cookieStore: CookieStore;
  nowMs: () => number;
}

type DecodedTokenPayload = VerificationTokenPayload & { exp: number };

export function getBrowserSessionDeps(): SessionDeps | null {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return null;
  }

  return {
    storage: window.localStorage,
    cookieStore: browserCookieStore(),
    nowMs: () => Date.now()
  };
}

export function decodeTokenPayload(token: string): DecodedTokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  try {
    const json = decodeBase64Url(parts[1]);
    const payload = JSON.parse(json) as Partial<VerificationTokenPayload>;
    const expiresAt = typeof payload.exp === "number" ? payload.exp : payload.expiresAt;
    if (typeof expiresAt !== "number" || typeof payload.siteId !== "string") {
      return null;
    }
    return {
      ...payload,
      exp: expiresAt
    } as DecodedTokenPayload;
  } catch {
    return null;
  }
}

export function isTokenValid(token: string, nowMs: number): boolean {
  const payload = decodeTokenPayload(token);
  if (!payload) {
    return false;
  }
  return payload.exp * 1000 > nowMs;
}

export function persistTokenDualStorage(token: string, deps: SessionDeps): void {
  const payload = decodeTokenPayload(token);
  if (!payload) {
    return;
  }

  const maxAgeSeconds = Math.max(1, payload.exp - Math.floor(deps.nowMs() / 1000));
  deps.storage.setItem(TOKEN_STORAGE_KEY, token);
  deps.cookieStore.set(TOKEN_COOKIE_KEY, token, maxAgeSeconds);
}

export function clearTokenDualStorage(deps: SessionDeps): void {
  deps.storage.removeItem(TOKEN_STORAGE_KEY);
  deps.cookieStore.clear(TOKEN_COOKIE_KEY);
}

export function getValidTokenFromDualStorage(deps: SessionDeps): string | null {
  const localToken = deps.storage.getItem(TOKEN_STORAGE_KEY);
  const cookieToken = deps.cookieStore.get(TOKEN_COOKIE_KEY);
  const nowMs = deps.nowMs();

  const localValid = localToken ? isTokenValid(localToken, nowMs) : false;
  const cookieValid = cookieToken ? isTokenValid(cookieToken, nowMs) : false;

  if (!localValid && !cookieValid) {
    clearTokenDualStorage(deps);
    return null;
  }

  let selectedToken: string;
  if (localValid && cookieValid) {
    selectedToken = chooseTokenWithLatestExpiry(localToken!, cookieToken!);
  } else {
    selectedToken = localValid ? localToken! : cookieToken!;
  }

  persistTokenDualStorage(selectedToken, deps);
  return selectedToken;
}

export function persistSessionId(sessionId: string, deps: SessionDeps): void {
  deps.storage.setItem(SESSION_ID_STORAGE_KEY, sessionId);
}

export function getStoredSessionId(deps: SessionDeps): string | null {
  return deps.storage.getItem(SESSION_ID_STORAGE_KEY);
}

export function clearStoredSessionId(deps: SessionDeps): void {
  deps.storage.removeItem(SESSION_ID_STORAGE_KEY);
}

export function readSessionIdFromUrl(search: string): string | null {
  const params = new URLSearchParams(search);
  return params.get("sessionId") ?? params.get("agegateSessionId");
}

export function resolveSessionIdForStatus(search: string, deps: SessionDeps): string | null {
  const fromUrl = readSessionIdFromUrl(search);
  if (fromUrl) {
    persistSessionId(fromUrl, deps);
    return fromUrl;
  }
  return getStoredSessionId(deps);
}

function chooseTokenWithLatestExpiry(tokenA: string, tokenB: string): string {
  const expA = decodeTokenPayload(tokenA)?.exp ?? 0;
  const expB = decodeTokenPayload(tokenB)?.exp ?? 0;
  return expA >= expB ? tokenA : tokenB;
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = `${normalized}${"=".repeat((4 - (normalized.length % 4)) % 4)}`;

  if (typeof atob === "function") {
    return atob(padded);
  }
  return Buffer.from(padded, "base64").toString("utf8");
}

function browserCookieStore(): CookieStore {
  return {
    get(name: string): string | null {
      const cookieName = `${encodeURIComponent(name)}=`;
      const cookie = document.cookie
        .split(";")
        .map((part) => part.trim())
        .find((part) => part.startsWith(cookieName));
      if (!cookie) {
        return null;
      }
      return decodeURIComponent(cookie.slice(cookieName.length));
    },
    set(name: string, value: string, maxAgeSeconds: number): void {
      const encodedName = encodeURIComponent(name);
      const encodedValue = encodeURIComponent(value);
      document.cookie = `${encodedName}=${encodedValue}; Max-Age=${maxAgeSeconds}; Path=/; SameSite=Lax`;
    },
    clear(name: string): void {
      const encodedName = encodeURIComponent(name);
      document.cookie = `${encodedName}=; Max-Age=0; Path=/; SameSite=Lax`;
    }
  };
}

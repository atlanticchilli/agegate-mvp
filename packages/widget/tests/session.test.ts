import test from "node:test";
import assert from "node:assert/strict";
import {
  TOKEN_COOKIE_KEY,
  TOKEN_STORAGE_KEY,
  SESSION_ID_STORAGE_KEY,
  clearStoredSessionId,
  decodeTokenPayload,
  getStoredSessionId,
  getValidTokenFromDualStorage,
  isTokenValid,
  persistSessionId,
  persistTokenDualStorage,
  type CookieStore,
  type SessionDeps,
  type StorageLike
} from "../src/session";

class MemoryStorage implements StorageLike {
  private readonly _map = new Map<string, string>();

  public getItem(key: string): string | null {
    return this._map.get(key) ?? null;
  }

  public setItem(key: string, value: string): void {
    this._map.set(key, value);
  }

  public removeItem(key: string): void {
    this._map.delete(key);
  }
}

class MemoryCookieStore implements CookieStore {
  private readonly _map = new Map<string, string>();

  public get(name: string): string | null {
    return this._map.get(name) ?? null;
  }

  public set(name: string, value: string): void {
    this._map.set(name, value);
  }

  public clear(name: string): void {
    this._map.delete(name);
  }
}

function createDeps(nowMs: number): SessionDeps {
  const storage = new MemoryStorage();
  const cookieStore = new MemoryCookieStore();
  return {
    storage,
    cookieStore,
    nowMs: () => nowMs
  };
}

function toBase64Url(value: string): string {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function createUnsignedToken(expSeconds: number, sessionId: string): string {
  const header = toBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = toBase64Url(
    JSON.stringify({
      sessionId,
      siteId: "site_123",
      jurisdiction: "US-CA",
      method: "document",
      ageCategory: "adult",
      iat: expSeconds - 100,
      exp: expSeconds
    })
  );
  return `${header}.${payload}.signature`;
}

test("isTokenValid returns true for non-expired token", () => {
  const nowMs = Date.UTC(2026, 0, 1);
  const token = createUnsignedToken(Math.floor(nowMs / 1000) + 3600, "session_future");
  assert.equal(isTokenValid(token, nowMs), true);
});

test("isTokenValid returns false for expired token", () => {
  const nowMs = Date.UTC(2026, 0, 1);
  const token = createUnsignedToken(Math.floor(nowMs / 1000) - 1, "session_expired");
  assert.equal(isTokenValid(token, nowMs), false);
});

test("persistTokenDualStorage writes to local storage and cookie store", () => {
  const nowMs = Date.UTC(2026, 0, 1);
  const deps = createDeps(nowMs);
  const token = createUnsignedToken(Math.floor(nowMs / 1000) + 600, "session_save");

  persistTokenDualStorage(token, deps);

  assert.equal(deps.storage.getItem(TOKEN_STORAGE_KEY), token);
  assert.equal(deps.cookieStore.get(TOKEN_COOKIE_KEY), token);
});

test("getValidTokenFromDualStorage repairs missing copy with latest valid token", () => {
  const nowMs = Date.UTC(2026, 0, 1);
  const deps = createDeps(nowMs);
  const olderToken = createUnsignedToken(Math.floor(nowMs / 1000) + 300, "session_old");
  const newerToken = createUnsignedToken(Math.floor(nowMs / 1000) + 1200, "session_new");

  deps.storage.setItem(TOKEN_STORAGE_KEY, olderToken);
  deps.cookieStore.set(TOKEN_COOKIE_KEY, newerToken, 1200);

  const selected = getValidTokenFromDualStorage(deps);

  assert.equal(selected, newerToken);
  assert.equal(deps.storage.getItem(TOKEN_STORAGE_KEY), newerToken);
  assert.equal(deps.cookieStore.get(TOKEN_COOKIE_KEY), newerToken);
});

test("getValidTokenFromDualStorage clears both stores when tokens are invalid", () => {
  const nowMs = Date.UTC(2026, 0, 1);
  const deps = createDeps(nowMs);
  const expired = createUnsignedToken(Math.floor(nowMs / 1000) - 100, "session_dead");

  deps.storage.setItem(TOKEN_STORAGE_KEY, expired);
  deps.cookieStore.set(TOKEN_COOKIE_KEY, "invalid.token", 10);

  const selected = getValidTokenFromDualStorage(deps);

  assert.equal(selected, null);
  assert.equal(deps.storage.getItem(TOKEN_STORAGE_KEY), null);
  assert.equal(deps.cookieStore.get(TOKEN_COOKIE_KEY), null);
});

test("session id helpers persist and clear return flow session id", () => {
  const deps = createDeps(Date.UTC(2026, 0, 1));
  persistSessionId("session_abc", deps);
  assert.equal(getStoredSessionId(deps), "session_abc");
  assert.equal(deps.storage.getItem(SESSION_ID_STORAGE_KEY), "session_abc");
  clearStoredSessionId(deps);
  assert.equal(getStoredSessionId(deps), null);
});

test("decodeTokenPayload parses payload fields", () => {
  const nowMs = Date.UTC(2026, 0, 1);
  const token = createUnsignedToken(Math.floor(nowMs / 1000) + 600, "session_payload");
  const payload = decodeTokenPayload(token);

  assert.ok(payload);
  assert.equal(payload?.sessionId, "session_payload");
});

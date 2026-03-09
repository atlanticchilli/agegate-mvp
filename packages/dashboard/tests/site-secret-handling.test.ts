import { describe, expect, it } from "vitest";
import { generateSecretKey, getDisplayedSecretKey, maskSecretKey } from "../lib/secrets";

describe("site secret handling", () => {
  it("returns generated secret keys with expected prefix", () => {
    const secret = generateSecretKey();
    expect(secret.startsWith("secret_")).toBe(true);
    expect(secret.length).toBeGreaterThan(20);
  });

  it("shows secret once and masks on subsequent views", () => {
    const persistedSecret = "secret_1234567890abcdef1234567890abcdef";

    const firstView = getDisplayedSecretKey({
      persistedSecretKey: persistedSecret,
      oneTimeSecretKey: persistedSecret
    });
    expect(firstView).toBe(persistedSecret);

    const laterView = getDisplayedSecretKey({
      persistedSecretKey: persistedSecret
    });
    expect(laterView).toBe(maskSecretKey(persistedSecret));
    expect(laterView).not.toBe(persistedSecret);
  });
});

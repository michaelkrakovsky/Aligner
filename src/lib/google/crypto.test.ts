import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "./crypto";

const key = randomBytes(32).toString("base64");

describe("token encryption", () => {
  it("round-trips and never stores the plaintext", () => {
    const sealed = encryptSecret("1//refresh-token", key);
    expect(sealed).not.toContain("refresh-token");
    expect(decryptSecret(sealed, key)).toBe("1//refresh-token");
  });

  it("uses a fresh IV each time", () => {
    expect(encryptSecret("same", key)).not.toBe(encryptSecret("same", key));
  });

  it("rejects tampered data and the wrong key", () => {
    const sealed = Buffer.from(encryptSecret("secret", key), "base64");
    sealed[sealed.length - 1] ^= 1;
    expect(() => decryptSecret(sealed.toString("base64"), key)).toThrow();
    const other = randomBytes(32).toString("base64");
    expect(() => decryptSecret(encryptSecret("secret", key), other)).toThrow();
  });

  it("requires a 32 byte key", () => {
    expect(() => encryptSecret("x", Buffer.from("short").toString("base64"))).toThrow(
      "32 bytes",
    );
  });
});

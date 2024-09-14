import { describe, it, expect, vi } from "vitest";
import { Secp256k1, ExtendedSecp256k1Signature } from "./secp256k1";

vi.mock("react-native-quick-crypto", () => {
  return {
    default: {
      randomBytes: (size: number) => Buffer.alloc(size).fill(1),
      pbkdf2Sync: vi.fn((password, salt, iterations, keylen, digest) => {
        return Buffer.from(
          `mock-key-${password}-${salt.toString("hex")}`.padEnd(keylen, "0")
        );
      }),
      createCipheriv: vi.fn(() => ({
        update: vi.fn((data) => Buffer.from(`encrypted-${data}`)),
        final: vi.fn(() => Buffer.from("-final")),
        getAuthTag: vi.fn(() => Buffer.from("mock-auth-tag")),
      })),
      createDecipheriv: vi.fn(() => ({
        setAuthTag: vi.fn(),
        update: vi.fn((data) =>
          Buffer.from(data.toString().replace("encrypted-", ""))
        ),
        final: vi.fn(() => Buffer.from("")),
      })),
      createHash: vi.fn(() => ({
        update: vi.fn().mockReturnThis(),
        digest: vi.fn(() => Buffer.from("mocked-hash-result")),
      })),
    },
  };
});

describe("Secp256k1", () => {
  describe("makeKeypair", () => {
    it("should generate a valid keypair from a private key", async () => {
      const privkey = new Uint8Array(32).fill(1);
      const keypair = await Secp256k1.makeKeypair(privkey);
      expect(keypair.privkey).toBeInstanceOf(Uint8Array);
      expect(keypair.pubkey).toBeInstanceOf(Uint8Array);
      expect(keypair.privkey.length).toBe(32);
      expect(keypair.pubkey.length).toBe(65); // Uncompressed public key
    });

    it("should throw an error for invalid private key length", async () => {
      const invalidPrivkey = new Uint8Array(31);
      await expect(Secp256k1.makeKeypair(invalidPrivkey)).rejects.toThrow();
    });
  });

  describe("createSignature", () => {
    it("should create a valid signature", async () => {
      const messageHash = new Uint8Array(32).fill(2);
      const privkey = new Uint8Array(32).fill(1);
      const signature = await Secp256k1.createSignature(messageHash, privkey);
      expect(signature).toBeInstanceOf(ExtendedSecp256k1Signature);
      expect(signature.recovery).toBeGreaterThanOrEqual(0);
      expect(signature.recovery).toBeLessThanOrEqual(3);
    });

    it("should throw an error for empty message hash", async () => {
      const emptyMessageHash = new Uint8Array(0);
      const privkey = new Uint8Array(32).fill(1);
      await expect(
        Secp256k1.createSignature(emptyMessageHash, privkey)
      ).rejects.toThrow();
    });
  });

  describe("verifySignature", () => {
    it("should verify a valid signature", async () => {
      const messageHash = new Uint8Array(32).fill(2);
      const privkey = new Uint8Array(32).fill(1);
      const { pubkey } = await Secp256k1.makeKeypair(privkey);
      const signature = await Secp256k1.createSignature(messageHash, privkey);
      const isValid = await Secp256k1.verifySignature(
        signature,
        messageHash,
        pubkey
      );
      expect(isValid).toBe(true);
    });

    it("should return false for an invalid signature", async () => {
      const messageHash = new Uint8Array(32).fill(2);
      const privkey = new Uint8Array(32).fill(1);
      const { pubkey } = await Secp256k1.makeKeypair(privkey);
      const signature = await Secp256k1.createSignature(messageHash, privkey);
      const invalidMessageHash = new Uint8Array(32).fill(3);
      const isValid = await Secp256k1.verifySignature(
        signature,
        invalidMessageHash,
        pubkey
      );
      expect(isValid).toBe(false);
    });
  });

  describe("compressPubkey and uncompressPubkey", () => {
    it("should compress and uncompress public keys correctly", async () => {
      const privkey = new Uint8Array(32).fill(1);
      const uncompressedPubkey = await Secp256k1.makeKeypair(privkey);
      const compressedPubkey = Secp256k1.compressPubkey(
        uncompressedPubkey.pubkey
      );
      expect(compressedPubkey.length).toBe(33);
      const uncompressedAgain = Secp256k1.uncompressPubkey(compressedPubkey);
      expect(uncompressedAgain).toEqual(uncompressedPubkey.pubkey);
    });
  });
});

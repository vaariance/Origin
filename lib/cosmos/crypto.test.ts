import { describe, it, expect, vi } from "vitest";
import CryptoES from "crypto-es";
import { bech32 } from "bech32";

import {
  hash160,
  hmacSHA512,
  hmacSHA256,
  wordArrayToUint8Array,
  toBech32,
  rawSecp256k1PubkeyToRawAddress,
  toHex,
  fromHex,
  encodeSecp256k1Signature,
} from "./crypto";

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

describe("hash160", () => {
  it("should produce a valid hash", () => {
    const input = "test data";
    const result = hash160(input);
    expect(result).toBeDefined();
    expect(result.toString()).toHaveLength(40); // RIPEMD160 produces a 160-bit hash
  });

  it("should produce consistent results", () => {
    const input = "consistent data";
    const result1 = hash160(input);
    const result2 = hash160(input);
    expect(result1.toString()).toBe(result2.toString());
  });

  it("should produce different hashes for different inputs", () => {
    const input1 = "data1";
    const input2 = "data2";
    const result1 = hash160(input1);
    const result2 = hash160(input2);
    expect(result1.toString()).not.toBe(result2.toString());
  });
});

describe("hmacSHA512", () => {
  it("should produce a valid HMAC", () => {
    const key = "secret key";
    const data = CryptoES.enc.Utf8.parse("test data");
    const result = hmacSHA512(key, data);
    expect(result).toBeDefined();
    expect(result.toString()).toHaveLength(128); // SHA512 produces a 512-bit hash
  });

  it("should produce consistent results", () => {
    const key = "consistent key";
    const data = CryptoES.enc.Utf8.parse("consistent data");
    const result1 = hmacSHA512(key, data);
    const result2 = hmacSHA512(key, data);
    expect(result1.toString()).toBe(result2.toString());
  });

  it("should produce different HMACs for different inputs", () => {
    const key = "same key";
    const data1 = CryptoES.enc.Utf8.parse("data1");
    const data2 = CryptoES.enc.Utf8.parse("data2");
    const result1 = hmacSHA512(key, data1);
    const result2 = hmacSHA512(key, data2);
    expect(result1.toString()).not.toBe(result2.toString());
  });
});

describe("hmacSHA256", () => {
  it("should produce a valid HMAC", () => {
    const key = "secret key";
    const data = CryptoES.enc.Utf8.parse("test data");
    const result = hmacSHA256(key, data);
    expect(result).toBeDefined();
    expect(result.toString()).toHaveLength(64); // SHA256 produces a 256-bit hash
  });

  it("should produce consistent results", () => {
    const key = "consistent key";
    const data = CryptoES.enc.Utf8.parse("consistent data");
    const result1 = hmacSHA256(key, data);
    const result2 = hmacSHA256(key, data);
    expect(result1.toString()).toBe(result2.toString());
  });

  it("should produce different HMACs for different inputs", () => {
    const key = "same key";
    const data1 = CryptoES.enc.Utf8.parse("data1");
    const data2 = CryptoES.enc.Utf8.parse("data2");
    const result1 = hmacSHA256(key, data1);
    const result2 = hmacSHA256(key, data2);
    expect(result1.toString()).not.toBe(result2.toString());
  });
});

describe("wordArrayToUint8Array", () => {
  it("should correctly convert WordArray to Uint8Array", () => {
    const wordArray = CryptoES.enc.Utf8.parse("test data");
    const result = wordArrayToUint8Array(wordArray);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBe(wordArray.sigBytes);
  });

  it("should preserve data integrity", () => {
    const original = "test data";
    const wordArray = CryptoES.enc.Utf8.parse(original);
    const uint8Array = wordArrayToUint8Array(wordArray);
    const decoded = new TextDecoder().decode(uint8Array);
    expect(decoded).toBe(original);
  });
});

describe("toBech32", () => {
  it("should encode data to bech32 format", () => {
    const prefix = "cosmos";
    const data = new Uint8Array([0, 1, 2, 3, 4]);
    const result = toBech32(prefix, data);
    expect(result.startsWith(prefix)).toBe(true);
    expect(bech32.decode(result)).toBeDefined();
  });

  it("should respect the limit parameter", () => {
    const prefix = "cosmos";
    const data = new Uint8Array([0, 1, 2, 3, 4]);
    const limit = 30;
    const result = toBech32(prefix, data, limit);
    expect(result.length).toBeLessThanOrEqual(limit);
  });
});

describe("rawSecp256k1PubkeyToRawAddress", () => {
  it("should convert a valid pubkey to an address", async () => {
    const pubkey = new Uint8Array(33).fill(1);
    pubkey[0] = 0x02; // Make it a valid compressed pubkey
    const result = await rawSecp256k1PubkeyToRawAddress(pubkey);
    expect(result).toBeDefined();
    expect(result.toString()).toHaveLength(40); // RIPEMD160 produces a 160-bit hash
  });

  it("should throw an error for invalid pubkey length", async () => {
    const invalidPubkey = new Uint8Array(32);
    await expect(
      rawSecp256k1PubkeyToRawAddress(invalidPubkey)
    ).rejects.toThrow();
  });
});

describe("toHex and fromHex", () => {
  it("should correctly convert Uint8Array to hex and back", () => {
    const original = new Uint8Array([0, 1, 2, 3, 4, 255]);
    const hex = toHex(original);
    const restored = fromHex(hex);
    expect(restored).toEqual(original);
  });

  it("should throw an error for invalid hex string length", () => {
    expect(() => fromHex("abc")).toThrow();
  });

  it("should throw an error for invalid hex characters", () => {
    expect(() => fromHex("abcdefgh")).toThrow();
  });
});

describe("encodeSecp256k1Signature", () => {
  it("should correctly encode a signature", () => {
    const pubkey = new Uint8Array(33).fill(1);
    pubkey[0] = 0x02; // Make it a valid compressed pubkey
    const signature = new Uint8Array(64).fill(2);
    const result = encodeSecp256k1Signature(pubkey, signature);
    expect(result.pub_key.type).toBe("tendermint/PubKeySecp256k1");
    expect(result.pub_key.value).toBeDefined();
    expect(result.signature).toBeDefined();
  });

  it("should throw an error for invalid signature length", () => {
    const pubkey = new Uint8Array(33).fill(1);
    pubkey[0] = 0x02;
    const invalidSignature = new Uint8Array(63);
    expect(() => encodeSecp256k1Signature(pubkey, invalidSignature)).toThrow();
  });

  it("should throw an error for invalid pubkey", () => {
    const invalidPubkey = new Uint8Array(32);
    const signature = new Uint8Array(64).fill(2);
    expect(() => encodeSecp256k1Signature(invalidPubkey, signature)).toThrow();
  });
});

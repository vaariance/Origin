import { describe, it, expect, vi } from "vitest";
import {
  Slip10,
  Slip10Curve,
  Slip10RawIndex,
  makeCosmoshubPath,
} from "./slip10";
import BN from "bn.js";
import { WordArray } from "crypto-es/lib/core";
import { wordArrayToUint8Array } from "./crypto";

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

describe("Slip10RawIndex", () => {
  it("should create a hardened index", () => {
    const index = Slip10RawIndex.hardened(0);
    expect(index.data).toBe(0x80000000);
    expect(index.isHardened()).toBe(true);
  });

  it("should create a normal index", () => {
    const index = Slip10RawIndex.normal(0);
    expect(index.data).toBe(0);
    expect(index.isHardened()).toBe(false);
  });

  it("should handle edge cases", () => {
    expect(Slip10RawIndex.hardened(2147483647).data).toBe(0xffffffff);
    expect(Slip10RawIndex.normal(2147483647).data).toBe(0x7fffffff);
  });
});

describe("makeCosmoshubPath", () => {
  it("should create a valid Cosmoshub path", () => {
    const path = makeCosmoshubPath(0);
    expect(path).toHaveLength(5);
    expect(path[0].data).toBe(0x8000002c); // 44'
    expect(path[1].data).toBe(0x80000076); // 118'
    expect(path[2].data).toBe(0x80000000); // 0'
    expect(path[3].data).toBe(0); // 0
    expect(path[4].data).toBe(0); // 0
  });

  it("should handle different account indexes", () => {
    const path = makeCosmoshubPath(5);
    expect(path[4].data).toBe(5);
  });
});

describe("Slip10", () => {
  const testSeed = new Uint8Array(64).fill(1);

  describe("derivePath", () => {
    it("should derive a valid key and chain code for Secp256k1 curve", () => {
      const path = [Slip10RawIndex.hardened(44), Slip10RawIndex.hardened(0)];
      const result = Slip10.derivePath(Slip10Curve.Secp256k1, testSeed, path);
      expect(result.privkey).toBeInstanceOf(Uint8Array);
      expect(result.chainCode).toBeInstanceOf(Uint8Array);
      expect(result.privkey).toHaveLength(32);
      expect(result.chainCode).toHaveLength(32);
    });

    it("should throw an error for normal keys with Ed25519 curve", () => {
      const path = [Slip10RawIndex.normal(0)];
      expect(() =>
        Slip10.derivePath(Slip10Curve.Ed25519, testSeed, path)
      ).toThrow("Normal keys are not allowed with ed25519");
    });
  });

  describe("master", () => {
    it("should generate a valid master key and chain code", () => {
      const result = Slip10.master(Slip10Curve.Secp256k1, testSeed);
      expect(result.privkey).toBeInstanceOf(Uint8Array);
      expect(result.chainCode).toBeInstanceOf(Uint8Array);
      expect(result.privkey).toHaveLength(32);
      expect(result.chainCode).toHaveLength(32);
    });

    it("should handle the case where privkey is zero", () => {
      const zeroSeed = new Uint8Array(64);
      const result = Slip10.master(Slip10Curve.Secp256k1, zeroSeed);
      expect(result.privkey).not.toEqual(new Uint8Array(32));
    });

    it("should handle the case where privkey is greater than or equal to curve order", () => {
      const largeSeed = new Uint8Array(64).fill(255);
      const result = Slip10.master(Slip10Curve.Secp256k1, largeSeed);
      expect(
        new BN(result.privkey).lt(Slip10["n"](Slip10Curve.Secp256k1))
      ).toBe(true);
    });
  });

  describe("child", () => {
    const parentPrivkey = new Uint8Array(32).fill(1);
    const parentChainCode = new Uint8Array(32).fill(2);

    it("should derive a child key for hardened index", () => {
      const result = Slip10.child(
        Slip10Curve.Secp256k1,
        parentPrivkey,
        parentChainCode,
        Slip10RawIndex.hardened(0)
      );
      expect(result.privkey).toBeInstanceOf(Uint8Array);
      expect(result.chainCode).toBeInstanceOf(Uint8Array);
    });

    it("should derive a child key for normal index", () => {
      const result = Slip10.child(
        Slip10Curve.Secp256k1,
        parentPrivkey,
        parentChainCode,
        Slip10RawIndex.normal(0)
      );
      expect(result.privkey).toBeInstanceOf(Uint8Array);
      expect(result.chainCode).toBeInstanceOf(Uint8Array);
    });

    it("should throw an error for normal index with Ed25519 curve", () => {
      expect(() =>
        Slip10.child(
          Slip10Curve.Ed25519,
          parentPrivkey,
          parentChainCode,
          Slip10RawIndex.normal(0)
        )
      ).toThrow("Normal keys are not allowed with ed25519");
    });
  });

  describe("childImpl", () => {
    const parentPrivkey = new Uint8Array(32).fill(1);
    const parentChainCode = new Uint8Array(32).fill(2);
    const rawIndex = Slip10RawIndex.normal(0);
    const i = WordArray.create(new Uint8Array(64).fill(3));

    it("should derive the child key according to the algorithm", () => {
      const result = Slip10["childImpl"](
        Slip10Curve.Secp256k1,
        parentPrivkey,
        parentChainCode,
        rawIndex,
        i
      );
      expect(result.privkey).toBeInstanceOf(Uint8Array);
      expect(result.chainCode).toBeInstanceOf(Uint8Array);
    });

    it("should handle Ed25519 curve", () => {
      const result = Slip10["childImpl"](
        Slip10Curve.Ed25519,
        parentPrivkey,
        parentChainCode,
        rawIndex,
        i
      );
      expect(result.privkey).toEqual(wordArrayToUint8Array(i).slice(0, 32));
    });

    // Note: Testing recursion cases in childImpl is complex and may require mocking internal functions
  });

  describe("serializedPoint", () => {
    it("should return the correct serialized point for Secp256k1", () => {
      const p = new BN(1);
      const result = Slip10["serializedPoint"](Slip10Curve.Secp256k1, p);
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result).toHaveLength(33);
    });

    it("should throw an error for unsupported curves", () => {
      expect(() =>
        Slip10["serializedPoint"]("unsupported" as Slip10Curve, new BN(1))
      ).toThrow("curve not supported");
    });
  });

  describe("isZero", () => {
    it("should return true if privkey is all zeros", () => {
      const zeroKey = new Uint8Array(32);
      expect(Slip10["isZero"](zeroKey)).toBe(true);
    });

    it("should return false if privkey is not all zeros", () => {
      const nonZeroKey = new Uint8Array(32).fill(1);
      expect(Slip10["isZero"](nonZeroKey)).toBe(false);
    });
  });

  describe("isGteN", () => {
    it("should return true if privkey is greater than or equal to curve order", () => {
      const largeKey = new Uint8Array(32).fill(255);
      expect(Slip10["isGteN"](Slip10Curve.Secp256k1, largeKey)).toBe(true);
    });

    it("should return false if privkey is less than curve order", () => {
      const smallKey = new Uint8Array(32).fill(1);
      expect(Slip10["isGteN"](Slip10Curve.Secp256k1, smallKey)).toBe(false);
    });
  });
});

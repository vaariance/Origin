import { WordArray } from "crypto-es/lib/core";
import { fromHex, hmacSHA512, wordArrayToUint8Array } from "./crypto";
import { Uint32 } from "./uint32";
import BN from "bn.js";
import elliptic from "elliptic";

export class Slip10RawIndex extends Uint32 {
  static hardened(hardenedIndex: number) {
    return new Slip10RawIndex(hardenedIndex + 2 ** 31);
  }
  static normal(normalIndex: number) {
    return new Slip10RawIndex(normalIndex);
  }
  isHardened() {
    return this.data >= 2 ** 31;
  }
}
export function makeCosmoshubPath(index: number): Slip10RawIndex[] {
  return [
    Slip10RawIndex.hardened(44),
    Slip10RawIndex.hardened(118),
    Slip10RawIndex.hardened(0),
    Slip10RawIndex.normal(0),
    Slip10RawIndex.normal(index),
  ];
}

export enum Slip10Curve {
  Secp256k1 = "Bitcoin seed",
  Ed25519 = "ed25519 seed",
}

const secp256k1 = new elliptic.ec("secp256k1");

export class Slip10 {
  static derivePath(
    curve: Slip10Curve,
    seed: Uint8Array,
    path: Slip10RawIndex[]
  ) {
    let result = this.master(curve, seed);
    for (const rawIndex of path) {
      result = this.child(curve, result.privkey, result.chainCode, rawIndex);
    }
    return result;
  }
  static master(
    curve: Slip10Curve,
    seed: Uint8Array
  ): {
    chainCode: Uint8Array;
    privkey: Uint8Array;
  } {
    const i = wordArrayToUint8Array(hmacSHA512(curve, WordArray.create(seed)));
    const privkey = i.slice(0, 32);
    const chainCode = i.slice(32, 64);
    if (
      curve !== Slip10Curve.Ed25519 &&
      (this.isZero(privkey) || this.isGteN(curve, privkey))
    ) {
      return this.master(curve, i);
    }
    return {
      chainCode,
      privkey,
    };
  }

  static child(
    curve: Slip10Curve,
    parentPrivkey: Uint8Array,
    parentChainCode: Uint8Array,
    rawIndex: Slip10RawIndex
  ) {
    let i;
    if (rawIndex.isHardened()) {
      const payload = new Uint8Array([
        0x00,
        ...parentPrivkey,
        ...rawIndex.toBytesBigEndian(),
      ]);
      i = hmacSHA512(
        WordArray.create(parentChainCode),
        WordArray.create(payload)
      );
    } else {
      if (curve === Slip10Curve.Ed25519) {
        throw new Error("Normal keys are not allowed with ed25519");
      } else {
        const data = new Uint8Array([
          ...Slip10.serializedPoint(curve, new BN(parentPrivkey)),
          ...rawIndex.toBytesBigEndian(),
        ]);
        i = hmacSHA512(
          WordArray.create(parentChainCode),
          WordArray.create(data)
        );
      }
    }
    return this.childImpl(curve, parentPrivkey, parentChainCode, rawIndex, i);
  }

  static childImpl(
    curve: Slip10Curve,
    parentPrivkey: Uint8Array,
    parentChainCode: Uint8Array,
    rawIndex: Slip10RawIndex,
    i: WordArray
  ): {
    chainCode: Uint8Array;
    privkey: Uint8Array;
  } {
    // step 2 (of the Private parent key → private child key algorithm)
    const ri = wordArrayToUint8Array(i);
    const il = ri.slice(0, 32);
    const ir = ri.slice(32, 64);
    // step 3
    const returnChainCode = ir;
    // step 4
    if (curve === Slip10Curve.Ed25519) {
      return {
        chainCode: returnChainCode,
        privkey: il,
      };
    }
    // step 5
    const n = this.n(curve);
    const returnChildKeyAsNumber = new BN(il).add(new BN(parentPrivkey)).mod(n);
    const returnChildKey = Uint8Array.from(
      returnChildKeyAsNumber.toArray("be", 32)
    );
    // step 6
    if (this.isGteN(curve, il) || this.isZero(returnChildKey)) {
      const newI = hmacSHA512(
        WordArray.create(parentChainCode),
        WordArray.create(
          new Uint8Array([0x01, ...ir, ...rawIndex.toBytesBigEndian()])
        )
      );
      return this.childImpl(
        curve,
        parentPrivkey,
        parentChainCode,
        rawIndex,
        newI
      );
    }
    // step 7
    return {
      chainCode: returnChainCode,
      privkey: returnChildKey,
    };
  }

  static serializedPoint(curve: Slip10Curve, p: BN) {
    switch (curve) {
      case Slip10Curve.Secp256k1:
        return fromHex(secp256k1.g.mul(p).encodeCompressed("hex"));
      default:
        throw new Error("curve not supported");
    }
  }

  static isZero(privkey: Uint8Array) {
    return privkey.every((byte) => byte === 0);
  }
  static isGteN(curve: Slip10Curve, privkey: Uint8Array) {
    const keyAsNumber = new BN(privkey);
    return keyAsNumber.gte(this.n(curve));
  }
  static n(curve: Slip10Curve) {
    switch (curve) {
      case Slip10Curve.Secp256k1:
        return new BN(
          "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141",
          16
        );
      default:
        throw new Error("curve not supported");
    }
  }
}

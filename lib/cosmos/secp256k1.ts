import BN from "bn.js";
import elliptic from "elliptic";
import { fromHex, toHex } from "./crypto";

const secp256k1N = new BN(
  "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141",
  "hex"
);
const secp256k1 = new elliptic.ec("secp256k1");

export class Secp256k1 {
  static async makeKeypair(privkey: Uint8Array) {
    if (privkey.length !== 32) {
      throw new Error("input data is not a valid secp256k1 private key");
    }
    const keypair = secp256k1.keyFromPrivate(privkey);
    if (keypair.validate().result !== true) {
      throw new Error("input data is not a valid secp256k1 private key");
    }
    const privkeyAsBigInteger = new BN(privkey);
    if (privkeyAsBigInteger.gte(secp256k1N)) {
      // not strictly smaller than N
      throw new Error("input data is not a valid secp256k1 private key");
    }
    const out = {
      privkey: fromHex(keypair.getPrivate("hex")),
      pubkey: Uint8Array.from(keypair.getPublic("array")),
    };
    return out;
  }

  static async createSignature(messageHash: Uint8Array, privkey: Uint8Array) {
    if (messageHash.length === 0) {
      throw new Error("Message hash must not be empty");
    }
    if (messageHash.length > 32) {
      throw new Error("Message hash length must not exceed 32 bytes");
    }
    const keypair = secp256k1.keyFromPrivate(privkey);
    // the `canonical` option ensures creation of lowS signature representations
    const { r, s, recoveryParam } = keypair.sign(messageHash, {
      canonical: true,
    });
    if (typeof recoveryParam !== "number")
      throw new Error("Recovery param missing");
    return new ExtendedSecp256k1Signature(
      Uint8Array.from(r.toArray()),
      Uint8Array.from(s.toArray()),
      recoveryParam
    );
  }
  static async verifySignature(
    signature: any,
    messageHash: Uint8Array,
    pubkey: Uint8Array
  ) {
    if (messageHash.length === 0) {
      throw new Error("Message hash must not be empty");
    }
    if (messageHash.length > 32) {
      throw new Error("Message hash length must not exceed 32 bytes");
    }
    const keypair = secp256k1.keyFromPublic(pubkey);

    try {
      return keypair.verify(messageHash, signature.toDer());
    } catch (error) {
      return false;
    }
  }

  static recoverPubkey(signature: any, messageHash: Uint8Array) {
    const signatureForElliptic = {
      r: toHex(signature.r()),
      s: toHex(signature.s()),
    };
    const point = secp256k1.recoverPubKey(
      messageHash,
      signatureForElliptic,
      signature.recovery
    );
    const keypair = secp256k1.keyFromPublic(point);
    return fromHex(keypair.getPublic(false, "hex"));
  }

  static compressPubkey(pubkey: Uint8Array) {
    switch (pubkey.length) {
      case 33:
        return pubkey;
      case 65:
        return Uint8Array.from(
          secp256k1.keyFromPublic(pubkey).getPublic(true, "array")
        );
      default:
        throw new Error("Invalid pubkey length");
    }
  }

  static uncompressPubkey(pubkey: Uint8Array) {
    switch (pubkey.length) {
      case 33:
        return Uint8Array.from(
          secp256k1.keyFromPublic(pubkey).getPublic(false, "array")
        );
      case 65:
        return pubkey;
      default:
        throw new Error("Invalid pubkey length");
    }
  }
  static trimRecoveryByte(signature: string | Uint8Array) {
    switch (signature.length) {
      case 64:
        return signature;
      case 65:
        return signature.slice(0, 64);
      default:
        throw new Error("Invalid signature length");
    }
  }
}

function trimLeadingNullBytes(inData: Uint8Array) {
  let numberOfLeadingNullBytes = 0;
  for (const byte of inData) {
    if (byte === 0x00) {
      numberOfLeadingNullBytes++;
    } else {
      break;
    }
  }
  return inData.slice(numberOfLeadingNullBytes);
}

const derTagInteger = 0x02;

class Secp256k1Signature {
  data: { r: Uint8Array; s: Uint8Array };
  static fromFixedLength(data: Uint8Array) {
    if (data.length !== 64) {
      throw new Error(
        `Got invalid data length: ${data.length}. Expected 2x 32 bytes for the pair (r, s)`
      );
    }
    return new Secp256k1Signature(
      trimLeadingNullBytes(data.slice(0, 32)),
      trimLeadingNullBytes(data.slice(32, 64))
    );
  }
  static fromDer(data: Uint8Array) {
    let pos = 0;
    if (data[pos++] !== 0x30) {
      throw new Error("Prefix 0x30 expected");
    }
    const bodyLength = data[pos++];
    if (data.length - pos !== bodyLength) {
      throw new Error("Data length mismatch detected");
    }
    // r
    const rTag = data[pos++];
    if (rTag !== derTagInteger) {
      throw new Error("INTEGER tag expected");
    }
    const rLength = data[pos++];
    if (rLength >= 0x80) {
      throw new Error("Decoding length values above 127 not supported");
    }
    const rData = data.slice(pos, pos + rLength);
    pos += rLength;
    // s
    const sTag = data[pos++];
    if (sTag !== derTagInteger) {
      throw new Error("INTEGER tag expected");
    }
    const sLength = data[pos++];
    if (sLength >= 0x80) {
      throw new Error("Decoding length values above 127 not supported");
    }
    const sData = data.slice(pos, pos + sLength);
    pos += sLength;
    return new Secp256k1Signature(
      // r/s data can contain leading 0 bytes to express integers being non-negative in DER
      trimLeadingNullBytes(rData),
      trimLeadingNullBytes(sData)
    );
  }
  constructor(r: Uint8Array, s: Uint8Array) {
    if (r.length > 32 || r.length === 0 || r[0] === 0x00) {
      throw new Error(
        "Unsigned integer r must be encoded as unpadded big endian."
      );
    }
    if (s.length > 32 || s.length === 0 || s[0] === 0x00) {
      throw new Error(
        "Unsigned integer s must be encoded as unpadded big endian."
      );
    }
    this.data = {
      r: r,
      s: s,
    };
  }
  r(length?: number) {
    if (length === undefined) {
      return this.data.r;
    } else {
      const paddingLength = length - this.data.r.length;
      if (paddingLength < 0) {
        throw new Error("Length too small to hold parameter r");
      }
      const padding = new Uint8Array(paddingLength);
      return new Uint8Array([...padding, ...this.data.r]);
    }
  }
  s(length?: number) {
    if (length === undefined) {
      return this.data.s;
    } else {
      const paddingLength = length - this.data.s.length;
      if (paddingLength < 0) {
        throw new Error("Length too small to hold parameter s");
      }
      const padding = new Uint8Array(paddingLength);
      return new Uint8Array([...padding, ...this.data.s]);
    }
  }
  toFixedLength() {
    return new Uint8Array([...this.r(32), ...this.s(32)]);
  }
  toDer() {
    const rEncoded =
      this.data.r[0] >= 0x80
        ? new Uint8Array([0, ...this.data.r])
        : this.data.r;
    const sEncoded =
      this.data.s[0] >= 0x80
        ? new Uint8Array([0, ...this.data.s])
        : this.data.s;
    const rLength = rEncoded.length;
    const sLength = sEncoded.length;
    const data = new Uint8Array([
      derTagInteger,
      rLength,
      ...rEncoded,
      derTagInteger,
      sLength,
      ...sEncoded,
    ]);
    return new Uint8Array([0x30, data.length, ...data]);
  }
}

export class ExtendedSecp256k1Signature extends Secp256k1Signature {
  recovery: any;
  static fromFixedLength(data: Uint8Array) {
    if (data.length !== 65) {
      throw new Error(
        `Got invalid data length ${data.length}. Expected 32 + 32 + 1`
      );
    }
    return new ExtendedSecp256k1Signature(
      trimLeadingNullBytes(data.slice(0, 32)),
      trimLeadingNullBytes(data.slice(32, 64)),
      data[64]
    );
  }
  constructor(r: Uint8Array, s: Uint8Array, recovery: number) {
    super(r, s);
    if (!Number.isInteger(recovery)) {
      throw new Error("The recovery parameter must be an integer.");
    }
    if (recovery < 0 || recovery > 4) {
      throw new Error("The recovery parameter must be one of 0, 1, 2, 3.");
    }
    this.recovery = recovery;
  }

  toFixedLength() {
    return new Uint8Array([...this.r(32), ...this.s(32), this.recovery]);
  }
}

import { bech32 } from "bech32";
import CryptoES from "crypto-es";
import { WordArray } from "crypto-es/lib/core";
import base64js from "base64-js";
import QuickCrypto from "react-native-quick-crypto";

export const Crypto = QuickCrypto;

export function hash160(buffer: any) {
  const sha256Hash = CryptoES.SHA256(buffer);
  return CryptoES.RIPEMD160(sha256Hash);
}

export function hmacSHA512(key: WordArray | string, data: WordArray) {
  return CryptoES.HmacSHA512(data, key);
}

export function hmacSHA256(key: WordArray | string, data: WordArray) {
  return CryptoES.HmacSHA256(data, key);
}

export function wordArrayToUint8Array(wordArray: WordArray) {
  const { words, sigBytes } = wordArray;
  const uint8Array = new Uint8Array(sigBytes);

  for (let i = 0; i < sigBytes; i++) {
    uint8Array[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
  }

  return uint8Array;
}

enum pubkeyType {
  secp256k1 = "tendermint/PubKeySecp256k1",
  ed25519 = "tendermint/PubKeyEd25519",
  sr25519 = "tendermint/PubKeySr25519",
  multisigThreshold = "tendermint/PubKeyMultisigThreshold",
}

export function toBech32(
  prefix: string,
  data: ArrayLike<number>,
  limit?: number
) {
  const address = bech32.encode(prefix, bech32.toWords(data), limit);
  return address;
}

export async function rawSecp256k1PubkeyToRawAddress(pubkeyData: Uint8Array) {
  if (pubkeyData.length !== 33) {
    throw new Error(
      `Invalid Secp256k1 pubkey length (compressed): ${pubkeyData.length}`
    );
  }
  const digest = CryptoES.SHA256(WordArray.create(pubkeyData));
  return CryptoES.RIPEMD160(digest);
}

export function toHex(data: Uint8Array) {
  let out = "";
  for (const byte of data) {
    out += ("0" + byte.toString(16)).slice(-2);
  }
  return out;
}

export function fromHex(hexstring: string) {
  if (hexstring.length % 2 !== 0) {
    throw new Error("hex string length must be a multiple of 2");
  }
  const out = new Uint8Array(hexstring.length / 2);
  for (let i = 0; i < out.length; i++) {
    const j = 2 * i;
    const hexByteAsString = hexstring.slice(j, j + 2);
    if (!hexByteAsString.match(/[0-9a-f]{2}/i)) {
      throw new Error("hex string contains invalid characters");
    }
    out[i] = parseInt(hexByteAsString, 16);
  }
  return out;
}

export function encodeSecp256k1Signature(
  pubkey: Uint8Array,
  signature: Uint8Array
) {
  if (signature.length !== 64) {
    throw new Error(
      "Signature must be 64 bytes long. Cosmos SDK uses a 2x32 byte fixed length encoding for the secp256k1 signature integers r and s."
    );
  }
  return {
    pub_key: encodeSecp256k1Pubkey(pubkey),
    signature: toBase64(signature),
  };
}

function encodeSecp256k1Pubkey(pubkey: Uint8Array) {
  if (pubkey.length !== 33 || (pubkey[0] !== 0x02 && pubkey[0] !== 0x03)) {
    throw new Error(
      "Public key must be compressed secp256k1, i.e. 33 bytes starting with 0x02 or 0x03"
    );
  }
  return {
    type: pubkeyType.secp256k1,
    value: toBase64(pubkey),
  };
}

export function toBase64(data: Uint8Array) {
  return base64js.fromByteArray(data);
}

export function fromBase64(data: string) {
  return base64js.toByteArray(data);
}

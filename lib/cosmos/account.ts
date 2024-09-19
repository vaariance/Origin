// react native libs
import {
  entropyToMnemonic,
  mnemonicToSeed,
} from "@dreson4/react-native-quick-bip39";
import { Buffer as bf } from "@craftzdog/react-native-buffer";
import { CryptoDigestAlgorithm, digest } from "expo-crypto";

// js libs
import {
  makeCosmoshubPath,
  Slip10,
  Slip10Curve,
  Slip10RawIndex,
} from "./slip10";
import {
  Crypto,
  encodeSecp256k1Signature,
  rawSecp256k1PubkeyToRawAddress,
  toBase64,
  toBech32,
  toHex,
  wordArrayToUint8Array,
} from "./crypto";
import { Secp256k1 } from "./secp256k1";
import { SignDoc } from "cosmjs-types/cosmos/tx/v1beta1/tx";

const defaultOptions = {
  bip39Password: "",
  prefix: "noble",
  hdPath: [makeCosmoshubPath(0)],
  seed: new Uint8Array(0),
};

export enum Word {
  word12 = 12,
  word24 = 24,
}

export type Algo = "secp256k1" | "ed25519" | "sr25519";

export class Account {
  private secret: string;
  private seed: Uint8Array;
  accounts: { hdPath: Slip10RawIndex[]; prefix: string }[];
  constructor(
    mnemonic: string,
    options: Partial<typeof defaultOptions> = defaultOptions
  ) {
    this.secret = mnemonic;
    const prefix = options.prefix ?? defaultOptions.prefix;
    const hdPaths = options.hdPath ?? defaultOptions.hdPath;
    this.seed = options.seed ?? defaultOptions.seed;
    this.accounts = hdPaths.map((hdPath) => ({
      hdPath: hdPath,
      prefix: prefix,
    }));
  }

  get mnemonic() {
    return this.secret.toString();
  }

  static generate(options = {}, length: Word = Word.word12) {
    const entropyLength = 4 * Math.floor((11 * length) / 33);
    const entropy = Crypto.randomBytes(entropyLength);
    const mnemonic = entropyToMnemonic(toHex(entropy));
    return Account.fromMnemonic(mnemonic.toString(), options);
  }

  static fromMnemonic(
    mnemonic: string,
    options: Partial<typeof defaultOptions> = {}
  ) {
    const seed = mnemonicToSeed(mnemonic, options.bip39Password);
    return new Account(mnemonic, {
      ...options,
      seed,
    });
  }

  serialize(password: string): Record<string, string> {
    const salt = Crypto.randomBytes(16);
    const iv = Crypto.randomBytes(16);
    const sessionKey = Crypto.pbkdf2Sync(password, salt, 10000, 32, "SHA-256");
    const cipher = Crypto.createCipheriv("aes-256-gcm", sessionKey, iv);
    const encryptedPayload = bf.concat([
      cipher.update(bf.from(this.secret, "utf8")),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return {
      encoding: "base64",
      salt: salt.toString("base64"),
      iv: iv.toString("base64"),
      payload: encryptedPayload.toString("base64"),
      authTag: toBase64(authTag),
    };
  }

  static deserialize(data: Record<string, string>, password: string): Account {
    const { salt, iv, payload, authTag } = data;

    const sessionKey = Crypto.pbkdf2Sync(
      password,
      bf.from(salt, "base64"),
      10000,
      32,
      "SHA-256"
    );

    const decipher = Crypto.createDecipheriv(
      "aes-256-gcm",
      sessionKey,
      bf.from(iv, "base64")
    );

    decipher.setAuthTag(bf.from(authTag, "base64"));
    const decrypted = bf.concat([
      decipher.update(bf.from(payload, "base64")),
      decipher.final(),
    ]);

    return Account.fromMnemonic(decrypted.toString("utf8"));
  }

  async getKeyPair(hdPath: Slip10RawIndex[]) {
    const { privkey } = Slip10.derivePath(
      Slip10Curve.Secp256k1,
      this.seed,
      hdPath
    );
    const { pubkey } = await Secp256k1.makeKeypair(privkey);
    return {
      privkey: privkey,
      pubkey: Secp256k1.compressPubkey(pubkey),
    };
  }

  async getAccounts() {
    const accountsWithPrivkeys = await this.getAccountsWithPrivkeys();
    return accountsWithPrivkeys.map(({ algo, pubkey, address }) => ({
      algo: algo,
      pubkey: pubkey,
      address: address,
    }));
  }

  async getAccountsWithPrivkeys() {
    return Promise.all(
      this.accounts.map(async ({ hdPath, prefix }) => {
        const { privkey, pubkey } = await this.getKeyPair(hdPath);
        const rawAddress = await rawSecp256k1PubkeyToRawAddress(pubkey);
        const address = toBech32(prefix, wordArrayToUint8Array(rawAddress));
        return {
          algo: "secp256k1" as Algo,
          privkey: privkey,
          pubkey: pubkey,
          address: address,
        };
      })
    );
  }

  async signDirect(signerAddress: string, signDoc: any) {
    const accounts = await this.getAccountsWithPrivkeys();
    const account = accounts.find(({ address }) => address === signerAddress);
    if (account === undefined) {
      throw new Error(`Address ${signerAddress} not found in wallet`);
    }
    const { privkey, pubkey } = account;
    const signBytes = makeSignBytes(signDoc);
    const hashedMessage = await digest(CryptoDigestAlgorithm.SHA256, signBytes);
    const signature = await Secp256k1.createSignature(
      new Uint8Array(hashedMessage),
      privkey
    );
    const signatureBytes = new Uint8Array([
      ...signature.r(32),
      ...signature.s(32),
    ]);
    const stdSignature = encodeSecp256k1Signature(pubkey, signatureBytes);
    return {
      signed: signDoc,
      signature: stdSignature,
    };
  }
}

export function makeSignBytes({
  accountNumber,
  authInfoBytes,
  bodyBytes,
  chainId,
}: any) {
  const signDoc = SignDoc.fromPartial({
    accountNumber: accountNumber,
    authInfoBytes: authInfoBytes,
    bodyBytes: bodyBytes,
    chainId: chainId,
  });
  return SignDoc.encode(signDoc).finish();
}

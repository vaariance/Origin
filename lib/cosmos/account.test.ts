import { describe, it, expect, beforeAll, vi, beforeEach } from "vitest";
import { Account, makeSignBytes } from "./account";
import { makeCosmoshubPath } from "./slip10";
import { SignDoc } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { mnemonicToSeed } from "@dreson4/react-native-quick-bip39";
import { Crypto } from "./crypto";

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

vi.mock("@dreson4/react-native-quick-bip39", () => ({
  entropyToMnemonic: vi.fn(
    () => "test test test test test test test test test test test junk"
  ),
  mnemonicToSeed: vi.fn(() => new Uint8Array(64)),
}));

describe("Account", () => {
  let testMnemonic: string;
  let testAccount: Account;
  const testPassword = "test password";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  beforeAll(() => {
    testMnemonic =
      "test test test test test test test test test test test junk";
    testAccount = Account.fromMnemonic(testMnemonic);
  });

  describe("constructor", () => {
    it("should initialize with a mnemonic and options", () => {
      const account = new Account(testMnemonic, { prefix: "noble" });
      expect(account.accounts[0].prefix).toBe("noble");
    });
  });

  describe("mnemonic", () => {
    it("should return the mnemonic as a string", () => {
      expect(testAccount.mnemonic).toBe(testMnemonic);
    });
  });

  describe("generate", () => {
    it("should generate a new Account with a valid mnemonic", () => {
      const account = Account.generate();
      expect(account).toBeInstanceOf(Account);
      expect(account.mnemonic).toBe(testMnemonic);
      expect(account.mnemonic.split(" ").length).toBe(12);
    });
  });

  describe("fromMnemonic", () => {
    it("should create an Account from a given mnemonic", () => {
      const account = Account.fromMnemonic(testMnemonic);
      expect(account).toBeInstanceOf(Account);
      expect(account.mnemonic).toBe(testMnemonic);
    });

    it("should respect the bip39 password option", () => {
      const password = "test password";
      Account.fromMnemonic(testMnemonic, { bip39Password: password });
      expect(mnemonicToSeed).toHaveBeenCalledWith(testMnemonic, password);
    });
  });

  describe("serialize", () => {
    it("should encrypt the secret with the given password", () => {
      const serialized = testAccount.serialize(testPassword);

      expect(serialized).toBeDefined();
      expect(typeof serialized).toBe("object");
      expect(serialized.encoding).toBe("base64");
      expect(serialized.salt).toBeDefined();
      expect(serialized.iv).toBeDefined();
      expect(serialized.payload).toBeDefined();
      expect(serialized.authTag).toBeDefined();

      expect(Crypto.pbkdf2Sync).toHaveBeenCalledWith(
        testPassword,
        expect.any(Buffer),
        10000,
        32,
        "SHA-256"
      );
      expect(Crypto.createCipheriv).toHaveBeenCalledWith(
        "aes-256-gcm",
        expect.any(Buffer),
        expect.any(Buffer)
      );
    });
  });

  describe("deserialize", () => {
    it("should decrypt the data with the given password and recreate the Account", () => {
      const serialized = testAccount.serialize(testPassword);
      const deserialized = Account.deserialize(serialized, testPassword);

      expect(deserialized).toBeInstanceOf(Account);
      expect(deserialized.mnemonic).toBe(testMnemonic);

      expect(Crypto.pbkdf2Sync).toHaveBeenCalledWith(
        testPassword,
        expect.any(Buffer),
        10000,
        32,
        "SHA-256"
      );
      expect(Crypto.createDecipheriv).toHaveBeenCalledWith(
        "aes-256-gcm",
        expect.any(Buffer),
        expect.any(Buffer)
      );
    });
  });

  describe("getKeyPair", () => {
    it("should derive the key pair from the given hdPath", async () => {
      const hdPath = makeCosmoshubPath(0);
      const keyPair = await testAccount.getKeyPair(hdPath);
      expect(keyPair.privkey).toBeInstanceOf(Uint8Array);
      expect(keyPair.pubkey).toBeInstanceOf(Uint8Array);
      expect(keyPair.privkey.length).toBe(32);
      expect(keyPair.pubkey.length).toBe(33); // Compressed public key
    });
  });

  describe("getAccountsWithPrivkeys", () => {
    it("should return all accounts with their private keys", async () => {
      const accounts = await testAccount.getAccountsWithPrivkeys();
      expect(accounts).toHaveLength(1);
      expect(accounts[0]).toHaveProperty("privkey");
      expect(accounts[0]).toHaveProperty("pubkey");
      expect(accounts[0]).toHaveProperty("address");
      expect(accounts[0].algo).toBe("secp256k1");
      expect(accounts[0].privkey).toBeInstanceOf(Uint8Array);
      expect(accounts[0].pubkey).toBeInstanceOf(Uint8Array);
      expect(typeof accounts[0].address).toBe("string");
    });
  });

  describe("signDirect", () => {
    it("should sign the signDoc for the specified signer address", async () => {
      const signDoc = {
        accountNumber: "1",
        authInfoBytes: new Uint8Array(1),
        bodyBytes: new Uint8Array(1),
        chainId: "noble",
      };
      const accounts = await testAccount.getAccountsWithPrivkeys();
      const result = await testAccount.signDirect(accounts[0].address, signDoc);
      expect(result).toHaveProperty("signed");
      expect(result).toHaveProperty("signature");
      expect(result.signature).toHaveProperty("pub_key");
      expect(result.signature).toHaveProperty("signature");
    });

    it("should throw an error if the signer address is not found", async () => {
      const signDoc = {
        accountNumber: "1",
        authInfoBytes: new Uint8Array(1),
        bodyBytes: new Uint8Array(1),
        chainId: "noble",
      };
      await expect(
        testAccount.signDirect("invalid-address", signDoc)
      ).rejects.toThrow();
    });
  });
});

describe("makeSignBytes", () => {
  it("should create sign bytes from the given inputs", () => {
    const input = {
      accountNumber: undefined,
      authInfoBytes: new Uint8Array(1),
      bodyBytes: new Uint8Array(1),
      chainId: "noble",
    };
    const result = makeSignBytes(input);
    expect(result).toBeInstanceOf(Uint8Array);
  });

  it("should return a properly encoded SignDoc", () => {
    const input = {
      accountNumber: undefined,
      authInfoBytes: new Uint8Array(1),
      bodyBytes: new Uint8Array(1),
      chainId: "noble",
    };
    const result = makeSignBytes(input);
    const decoded = SignDoc.decode(result);
    expect(decoded.accountNumber).toBe(0n);
    expect(decoded.authInfoBytes).toEqual(input.authInfoBytes);
    expect(decoded.bodyBytes).toEqual(input.bodyBytes);
    expect(decoded.chainId).toBe(input.chainId);
  });
});

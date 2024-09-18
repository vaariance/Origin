import {
  addAuthorizationErrorListener,
  addConfigErrorListener,
  addConfigReceivedListener,
  addSignInListener,
  removeListener,
  signIn,
  signOut,
  syncSigningKey,
} from "~/modules/google-signin";
import { Account } from "./cosmos/account";
import {
  BroadcastTxRequestType,
  BroadcastTxReturnType,
  GenerateSignDocReturnType,
  useProxy,
} from "./useProxy";
import * as LocalAuthentication from "expo-local-authentication";

export interface Coin {
  readonly denom: string;
  readonly amount: string;
}

export interface StdFee {
  readonly amount: readonly Coin[];
  readonly gas: string;
  readonly granter?: string;
  readonly payer?: string;
}

export interface EncodeObject {
  readonly typeUrl: string;
  readonly value: any;
}

type PayCommand = {
  from: NobleAddress;
  to: NobleAddress;
  amount: Coin[];
  fee: StdFee;
  memo?: string;
};

export type NobleAddress = `noble1${string}`;

type ExecutePayCommandReuestType = {
  onSuccess?: (response: BroadcastTxReturnType) => void;
  onError?: (reason: string) => void;
  sign: (
    signDoc: GenerateSignDocReturnType
  ) => Promise<BroadcastTxRequestType | undefined>;
  getPublicKey: () => Promise<Uint8Array | string>;
  command: PayCommand;
};

export const useAuth = () => {
  const proxy = useProxy();

  const webClientId =
    "573651329597-1iloep3au6m2ir2iarip6p4nn9e6c35m.apps.googleusercontent.com";

  const _signIn = async (
    args: {
      onSuccess?: (response: Record<string, string>) => void;
      onError?: (reason: string) => void;
    } = {}
  ) => {
    const sub = addSignInListener((userInfo) => {
      if (userInfo.error) {
        args.onError?.(userInfo.error);
      } else {
        args.onSuccess?.(userInfo);
      }
      removeListener(sub);
    });
    await signIn(webClientId);
  };

  const newSigningKey = () => {
    return Account.generate({
      prefix: "noble",
    });
  };

  const _syncSigningKey = async (args: {
    account: Account;
    encryptionKey: string;
    onSuccess?: (config: any) => void;
    onError?: (reason: string) => void;
  }) => {
    const { account, encryptionKey, onError, onSuccess } = args;
    try {
      addAuthorizationErrorListener((event) => onError?.(event.error));
      addConfigErrorListener((event) => onError?.(event.error));
      addConfigReceivedListener((event) => onSuccess?.(event.config));
      const serialized = await account.serialize(encryptionKey);
      await syncSigningKey(JSON.stringify(serialized));
    } catch (error: any) {
      onError?.(error.message);
    }
  };

  const parsePayCommand = (args: {
    from: NobleAddress;
    to: NobleAddress;
    amount: string;
    memo?: string;
  }): PayCommand => {
    const { from, to, amount, memo } = args;
    return {
      from,
      to,
      amount: [{ denom: "uusdc", amount }],
      fee: {
        amount: [{ denom: "uusdc", amount: "15000" }],
        gas: "150000",
      },
      memo,
    };
  };

  const _generateMsgSendObject = (
    from: NobleAddress,
    to: NobleAddress,
    amount: Coin[]
  ) => {
    return [
      {
        typeUrl: "/cosmos.bank.v1beta1.MsgSend",
        value: {
          fromAddress: from,
          toAddress: to,
          amount,
        },
      },
    ];
  };

  const executePayCommand = async (args: ExecutePayCommandReuestType) => {
    const { command, getPublicKey, sign, onSuccess, onError } = args;
    const { from, to, amount, fee, memo } = command;
    const pubKey = await getPublicKey();
    const signDoc = await proxy.generateSignDoc(
      from,
      pubKey,
      _generateMsgSendObject(from, to, amount),
      fee,
      memo
    );
    if (signDoc.error) {
      return onError?.(signDoc.unwrap_err());
    }
    const signed = await sign(signDoc.unwrap());
    if (!signed) return;

    const result = await proxy.broadcastTx(...signed);
    if (result.error) {
      return onError?.(result.unwrap_err());
    } else {
      return onSuccess?.(result.unwrap());
    }
  };

  const withBiometricAuth = (
    fn: (args: ExecutePayCommandReuestType) => Promise<void>
  ) => {
    return async (args: ExecutePayCommandReuestType): Promise<void> => {
      const sign = async (signDoc: GenerateSignDocReturnType) => {
        const isBiometricAvailable =
          await LocalAuthentication.hasHardwareAsync();
        const savedBiometrics =
          isBiometricAvailable && (await LocalAuthentication.isEnrolledAsync());

        if (savedBiometrics) {
          const biometricAuthResult =
            await LocalAuthentication.authenticateAsync({
              biometricsSecurityLevel: "strong",
              promptMessage: "Authenticate to confirm transaction",
              cancelLabel: "Cancel",
              disableDeviceFallback: true,
            });

          if (biometricAuthResult.success) {
            return args.sign(signDoc);
          } else if (biometricAuthResult.error) {
            args.onError?.(biometricAuthResult.error);
          }
        }
        args.onError?.("Biometric authentication not available");
      };
      return fn({ ...args, sign });
    };
  };

  return {
    signIn: _signIn,
    signOut,
    newSigningKey,
    syncSigningKey: _syncSigningKey,
    parsePayCommand,
    executePayCommand: withBiometricAuth(executePayCommand),
  };
};

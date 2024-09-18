import axios, { AxiosInstance } from "axios";
import { Coin, EncodeObject, NobleAddress, StdFee } from "./useAuth";
import { Err, Ok, Result } from "./utils";
import { toBase64, toHex } from "./cosmos/crypto";
import { SignDoc } from "cosmjs-types/cosmos/tx/v1beta1/tx";

export interface Transaction {
  txHash: string;
  height: string;
  from: string;
  to: string;
  amount: string;
  direction: "sent" | "received" | "self";
}

export type ProxyErr = { error?: string };
export type GetBalanceReturnType = Coin & ProxyErr;
export type SimulateTxReturnType = { result: number } & ProxyErr;
export type GenerateSignDocRequestType = [
  signerAddress: string,
  signerPubKey: Uint8Array | string,
  messages: EncodeObject[],
  fee: StdFee,
  memo?: string,
];

export type GenerateSignDocReturnType<T = Uint8Array> = {
  bodyBytes: T;
  authInfoBytes: T;
  chainId: string;
  accountNumber: bigint;
} & ProxyErr;

export type BroadcastTxRequestType<T = Uint8Array> = [
  signed: Omit<GenerateSignDocReturnType<T>, "error">,
  signature: { signature: string },
];

export type BroadcastTxReturnType = {
  success: boolean;
  height: number;
  txIndex: number;
  code: number;
  transactionHash: string;
  events: Record<string, any>[];
  /** @deprecated This field is not filled anymore in Cosmos SDK 0.50+ */
  rawLog?: string;
  /** @deprecated Use `msgResponses` instead. */
  data?: Record<string, any>[];

  msgResponses: Array<{
    typeUrl: string;
    value: any;
  }>;
  gasUsed: bigint;
  gasWanted: bigint;
} & ProxyErr;

export type GetTransactionsReturnType = { items: Transaction[] } & ProxyErr;

export const useProxy = () => {
  const endpoint = "https://vvyyum1eoc.execute-api.us-east-1.amazonaws.com";

  const instance: AxiosInstance = axios.create({
    baseURL: endpoint,
  });

  const getBalance = async (
    address: string
  ): Promise<Result<GetBalanceReturnType>> => {
    const response = await instance.get<GetBalanceReturnType>(
      `/balance/${address}`
    );
    if (response.data.error) {
      return Err(response.data.error);
    }
    return Ok(response.data);
  };

  const simulateTx = async (
    messages: EncodeObject[]
  ): Promise<Result<SimulateTxReturnType>> => {
    const response = await instance.post<SimulateTxReturnType>(`/simulate`, {
      messages,
    });
    if (response.data.error) {
      return Err(response.data.error);
    }
    return Ok(response.data);
  };

  const generateSignDoc = async (
    ...args: GenerateSignDocRequestType
  ): Promise<Result<GenerateSignDocReturnType>> => {
    typeof args[1] !== "string" && (args[1] = toHex(args[1]));
    const response = await instance.post<GenerateSignDocReturnType<string>>(
      `/generate`,
      {
        ...args,
      }
    );
    if (response.data.error) {
      return Err(response.data.error);
    }
    return Ok(SignDoc.fromJSON(response.data));
  };

  const broadcastTx = async (
    ...args: BroadcastTxRequestType
  ): Promise<Result<BroadcastTxReturnType>> => {
    const response = await instance.post<BroadcastTxReturnType>(`/broadcast`, {
      bodyBytes: toBase64(args[0].bodyBytes),
      authInfoBytes: toBase64(args[0].authInfoBytes),
      signature: args[1].signature,
    });
    if (response.data.error) {
      return Err(response.data.error);
    }
    return Ok(response.data);
  };

  const getTransactions = async (
    address: NobleAddress,
    nextPage: number = 1
  ): Promise<Result<GetTransactionsReturnType>> => {
    const response = await instance.get<GetTransactionsReturnType>(
      `/txs/${address}?nextPage=${nextPage}`
    );
    if (response.data.error) {
      return Err(response.data.error);
    }
    return Ok(response.data);
  };

  return {
    getTransactions,
    getBalance,
    generateSignDoc,
    simulateTx,
    broadcastTx,
  };
};

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

interface RpcResponse {
  result?: {
    txs: Array<{
      hash: string;
      height: string;
      tx_result: {
        log: string;
      };
    }>;
  };
}

export type ProxyErr = { error?: string };
export type GetBalanceReturnType = { balance: Coin } & ProxyErr;
export type SimulateTxReturnType = { result: number } & ProxyErr;
export type GenerateSignDocRequestType = [
  signerAddress: string,
  signerPubKey: Uint8Array | string,
  messages: EncodeObject[],
  fee: StdFee,
  memo?: string
];

export type GenerateSignDocReturnType<T = Uint8Array> = {
  bodyBytes: T;
  authInfoBytes: T;
  chainId: string;
  accountNumber: bigint;
} & ProxyErr;

export type BroadcastTxRequestType = [
  signed: Omit<GenerateSignDocReturnType, "error">,
  signature: { signature: string }
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

export const useProxy = () => {
  const endpoint = "https://vvyyum1eoc.execute-api.us-east-1.amazonaws.com";
  const rpc = "https://noble-rpc.polkachu.com/";

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

  async function getTransactions(
    walletAddress: NobleAddress,
    nextPage: number = 1,
    rpcUrl: string = rpc
  ): Promise<Transaction[]> {
    const senderQuery = encodeURIComponent(`message.sender='${walletAddress}'`);
    const recipientQuery = encodeURIComponent(
      `transfer.recipient='${walletAddress}'`
    );

    const baseUrl = new URL(`${rpcUrl}/tx_search`);
    const commonParams = new URLSearchParams({
      page: nextPage.toString(),
      per_page: "50",
      order_by: '"asc"',
    });

    const sentUrl = new URL(baseUrl);
    sentUrl.searchParams.append("query", `"${senderQuery}"`);
    sentUrl.search += "&" + commonParams.toString();

    const receivedUrl = new URL(baseUrl);
    receivedUrl.searchParams.append("query", `"${recipientQuery}"`);
    receivedUrl.search += "&" + commonParams.toString();

    const [sentData, receivedData]: [RpcResponse, RpcResponse] =
      await Promise.all([
        fetch(sentUrl).then((res: Response) => res.json()),
        fetch(receivedUrl).then((res: Response) => res.json()),
      ]);

    const combinedTxs = (sentData.result?.txs || []).concat(
      receivedData.result?.txs || []
    );

    const transactionsMap = new Map<string, Transaction>();

    for (const tx of combinedTxs) {
      const txHash = tx.hash.toUpperCase();
      const height = tx.height;

      if (transactionsMap.has(txHash)) {
        continue;
      }

      const logs: Array<{
        events: Array<{
          type: string;
          attributes: Array<{ key: string; value: string }>;
        }>;
      }> = JSON.parse(tx.tx_result.log);

      let from = "";
      let to = "";
      let amount = "";
      let direction: "sent" | "received" | "self";

      for (const log of logs) {
        const events = log.events;
        const transferEvent = events.find((event) => event.type === "transfer");
        if (!transferEvent) {
          continue;
        }

        const attributes: Record<string, string> = {};
        for (const attr of transferEvent.attributes) {
          attributes[attr.key] = attr.value;
        }

        if (attributes["amount"] && attributes["amount"].endsWith("uusdc")) {
          const amountStr = attributes["amount"];
          amount = amountStr.replace("uusdc", "");
          from = attributes["sender"];
          to = attributes["recipient"];

          if (from === walletAddress && to !== walletAddress) {
            direction = "sent";
          } else if (to === walletAddress && from !== walletAddress) {
            direction = "received";
          } else if (from === walletAddress && to === walletAddress) {
            direction = "self";
          } else {
            continue;
          }

          transactionsMap.set(txHash, {
            txHash,
            height,
            from,
            to,
            amount,
            direction,
          });

          break;
        }
      }
    }

    return Array.from(transactionsMap.values()).sort(
      (a, b) => Number(b.height) - Number(a.height)
    );
  }

  return {
    getTransactions,
    getBalance,
    generateSignDoc,
    simulateTx,
    broadcastTx,
  };
};

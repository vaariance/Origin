import express from "express";
import serverless from "serverless-http";
import {
  StargateClient,
  SigningStargateClient,
  defaultRegistryTypes,
  isDeliverTxSuccess,
} from "@cosmjs/stargate";
import {
  DirectSecp256k1HdWallet,
  encodePubkey,
  makeAuthInfoBytes,
  makeSignDoc,
  Registry,
} from "@cosmjs/proto-signing";
import { SignDoc, TxRaw } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { fromBase64, fromHex, toHex } from "@cosmjs/encoding";
import { encodeSecp256k1Pubkey } from "@cosmjs/amino";
import { Int53 } from "@cosmjs/math";

const app = express();
const RPC_URL = "https://noble-rpc.polkachu.com:443";
const registry = new Registry(defaultRegistryTypes);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

BigInt.prototype.toJSON = function () {
  return this.toString();
};

const getRandomSimulator = () =>
  DirectSecp256k1HdWallet.generate(12, {
    prefix: "noble",
  });

/// Fetches the user balance
app.get("/balance/:address", async (req, res) => {
  const { address } = req.params;
  const client = await StargateClient.connect(RPC_URL);
  const balance = await client.getBalance(address, "uusdc");
  return res.status(200).json({
    balance,
  });
});

/// Simulates a transaction on chain
app.post("/simulate", async (req, res) => {
  const { messages } = req.body;
  const simulator = await getRandomSimulator();
  const simulatorAddress = (await simulator.getAccounts())[0].address;
  const client = await SigningStargateClient.connectWithSigner(
    RPC_URL,
    simulator
  );
  try {
    const result = await client.simulate(simulatorAddress, messages, undefined);
    res.status(200).json({ result });
  } catch (error: any) {
    res.status(400).json({ error: error.toString() });
  }
});

/// Generates a SignDocument
app.post("/generate", async (req, res) => {
  const { signerAddress, signerPubKey, messages, fee, memo } = req.body;
  const client = await StargateClient.connect(RPC_URL);
  const { accountNumber, sequence } = await client.getSequence(signerAddress);
  const chainId = await client.getChainId();
  const pubkey = encodePubkey(encodeSecp256k1Pubkey(fromHex(signerPubKey)));
  const txBodyEncodeObject = {
    typeUrl: "/cosmos.tx.v1beta1.TxBody",
    value: {
      messages: messages,
      memo: memo,
      timeoutHeight: undefined,
    },
  };
  const txBodyBytes = registry.encode(txBodyEncodeObject);
  const gasLimit = Int53.fromString(fee.gas).toNumber();
  const authInfoBytes = makeAuthInfoBytes(
    [{ pubkey, sequence }],
    fee.amount,
    gasLimit,
    fee.granter,
    fee.payer
  );
  const signDoc: Record<string, string> = SignDoc.toJSON(
    makeSignDoc(txBodyBytes, authInfoBytes, chainId, accountNumber)
  ) as never;

  res.status(200).json(signDoc);
});

/// Broadcasts the signed Document
app.post("/broadcast", async (req, res) => {
  const { bodyBytes, authInfoBytes, signature } = req.body;
  const raw = TxRaw.fromPartial({
    bodyBytes: fromBase64(bodyBytes),
    authInfoBytes: fromBase64(authInfoBytes),
    signatures: [fromBase64(signature)],
  });
  const txBytes = TxRaw.encode(raw).finish();
  const client = await StargateClient.connect(RPC_URL);
  try {
    const txResult = await client.broadcastTx(txBytes);
    res
      .status(200)
      .json({ ...txResult, success: isDeliverTxSuccess(txResult) });
  } catch (error: any) {
    res.status(400).json({ error: error.toString() });
  }
});

app.use((_, res) => {
  return res.status(404).json({
    error: "Not Found",
  });
});

export const handler = serverless(app);
export default handler;

/**
 * Level 1 requirement: fetch & display the connected wallet's XLM balance,
 * and send a plain XLM payment on testnet with success/fail feedback and a
 * tx hash. Deliberately separate from lib/contract.ts (the pool contract) —
 * this is the raw classic-Stellar payment path a non-crypto user sees first.
 */
import {
  Asset,
  Horizon,
  Networks,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { NETWORK_PASSPHRASE, STROOPS } from "./contract";
import { classifyTxError } from "./errors";
import type { Signer } from "./contract";

const HORIZON_URL =
  (import.meta.env.VITE_HORIZON_URL ?? "https://horizon-testnet.stellar.org").trim();

const horizon = () => new Horizon.Server(HORIZON_URL);

/** Native XLM balance for `address`, as a decimal string, or "0" if the
 * account doesn't exist on-chain yet (unfunded testnet account). */
export async function getXlmBalance(address: string): Promise<string> {
  try {
    const account = await horizon().loadAccount(address);
    const native = account.balances.find((b) => b.asset_type === "native");
    return native?.balance ?? "0";
  } catch (e) {
    const err = e as { response?: { status?: number } };
    if (err?.response?.status === 404) return "0"; // unfunded account
    throw classifyTxError(e);
  }
}

export type SendResult = { hash: string; ledger?: number };

/** Sends a plain XLM payment: source -> destination, `amountXlm` decimal. */
export async function sendXlm(
  source: string,
  destination: string,
  amountXlm: string,
  sign: Signer,
): Promise<SendResult> {
  const trimmedDest = destination.trim();
  if (!/^G[A-Z2-7]{55}$/.test(trimmedDest)) {
    throw classifyTxError(new Error("Destination must be a valid Stellar G... address."));
  }
  const amt = Number(amountXlm);
  if (!amountXlm || Number.isNaN(amt) || amt <= 0) {
    throw classifyTxError(new Error("Enter a positive XLM amount."));
  }

  const h = horizon();
  let account;
  try {
    account = await h.loadAccount(source);
  } catch (e) {
    throw classifyTxError(e);
  }

  const tx = new TransactionBuilder(account, {
    fee: "100000",
    networkPassphrase: NETWORK_PASSPHRASE || Networks.TESTNET,
  })
    .addOperation(
      Operation.payment({
        destination: trimmedDest,
        asset: Asset.native(),
        amount: amountXlm,
      }),
    )
    .setTimeout(60)
    .build();

  let signedXdr: string;
  try {
    signedXdr = await sign(tx.toXDR());
  } catch (e) {
    throw classifyTxError(e);
  }

  const signedTx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE || Networks.TESTNET);

  try {
    const res = await h.submitTransaction(signedTx);
    return { hash: res.hash, ledger: res.ledger };
  } catch (e) {
    const err = e as { response?: { data?: { extras?: { result_codes?: unknown } } } };
    const codes = err?.response?.data?.extras?.result_codes;
    throw classifyTxError(codes ? new Error(JSON.stringify(codes)) : e);
  }
}

export { STROOPS };

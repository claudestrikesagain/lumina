import { useCallback, useEffect, useState } from "react";
import { getXlmBalance, sendXlm } from "../lib/xlm";
import { errorLabel, type AppError } from "../lib/errors";
import type { Signer } from "../lib/contract";
import { Field, Ledger, Notice, Section } from "./ui";

/**
 * Level 1: connected wallet's XLM balance, and a plain XLM send with
 * success/fail feedback + tx hash. This is the foundation everything else
 * in the app sits on top of — kept separate from the pool contract.
 */
export function Wallet({ address, sign }: { address: string | null; sign: Signer }) {
  const [balance, setBalance] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState<AppError | null>(null);

  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<AppError | null>(null);
  const [sendResult, setSendResult] = useState<{ hash: string } | null>(null);

  const refreshBalance = useCallback(async () => {
    if (!address) return;
    setBalanceLoading(true);
    setBalanceError(null);
    try {
      setBalance(await getXlmBalance(address));
    } catch (e) {
      setBalanceError(e as AppError);
      setBalance(null);
    } finally {
      setBalanceLoading(false);
    }
  }, [address]);

  useEffect(() => {
    void refreshBalance();
  }, [refreshBalance]);

  async function submitSend() {
    if (!address) return;
    setSending(true);
    setSendError(null);
    setSendResult(null);
    try {
      const res = await sendXlm(address, destination, amount, sign);
      setSendResult({ hash: res.hash });
      setDestination("");
      setAmount("");
      await refreshBalance();
    } catch (e) {
      setSendError(e as AppError);
    } finally {
      setSending(false);
    }
  }

  if (!address) {
    return (
      <Section index="Statement 0" title="Wallet" note="Connect a wallet to see your XLM balance.">
        <p className="text-[13px] text-inkSoft">Not connected.</p>
      </Section>
    );
  }

  return (
    <Section
      index="Statement 0"
      title="Wallet"
      note="XLM balance and a plain testnet payment — the foundation the pool sits on top of."
    >
      <div className="grid grid-cols-12 gap-x-6 gap-y-6">
        <div className="col-span-12 md:col-span-5">
          <Ledger
            rows={[
              [
                "XLM balance",
                balanceLoading ? "reading…" : balance !== null ? `${balance} XLM` : "—",
              ],
            ]}
          />
          <button className="btn mt-4" onClick={() => void refreshBalance()} disabled={balanceLoading}>
            {balanceLoading ? "Reading" : "Refresh balance"}
          </button>
          {balanceError ? (
            <div className="mt-4">
              <Notice kind="accent" title={errorLabel[balanceError.kind]}>
                {balanceError.message}
              </Notice>
            </div>
          ) : null}
        </div>

        <div className="col-span-12 md:col-span-7 space-y-4">
          <Field label="Send XLM to">
            <input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="G…"
              disabled={sending}
            />
          </Field>
          <Field label="Amount (XLM)">
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="1.0000000"
              inputMode="decimal"
              disabled={sending}
            />
          </Field>
          <button
            className="btn btn-solid"
            onClick={() => void submitSend()}
            disabled={sending || !destination || !amount}
          >
            {sending ? "Sending" : "Send"}
          </button>

          {sendError ? (
            <Notice kind="accent" title={errorLabel[sendError.kind]}>
              {sendError.message}
            </Notice>
          ) : null}
          {sendResult ? (
            <Notice kind="accent" title="Payment confirmed on testnet">
              {`tx hash: ${sendResult.hash}\nhttps://stellar.expert/explorer/testnet/tx/${sendResult.hash}`}
            </Notice>
          ) : null}
        </div>
      </div>
    </Section>
  );
}

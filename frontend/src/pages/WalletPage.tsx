import { useCallback, useEffect, useState } from "react";
import { useWalletContext } from "../context/WalletContext";
import { useToast } from "../context/ToastContext";
import { errorLabel, type AppError } from "../lib/errors";
import { getXlmBalance, sendXlm } from "../lib/xlm";
import { Field, Ledger, Notice, Section } from "../components/ui";

/**
 * Foundation page: connected wallet's XLM balance and a plain XLM payment.
 * Sits underneath everything else — the pool contract is paid in native XLM,
 * so a working wallet path is non-optional.
 */
export function WalletPage() {
  const { address, sign } = useWalletContext();
  const { push } = useToast();

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
      push("success", "Payment confirmed", res.hash);
    } catch (e) {
      const err = e as AppError;
      setSendError(err);
      push("error", errorLabel[err.kind], err.message);
    } finally {
      setSending(false);
    }
  }

  if (!address) {
    return (
      <Section
        index="Statement 0"
        title="Wallet"
        note="Connect a wallet to see your XLM balance."
      >
        <p className="text-[13px] text-inkSoft">
          Not connected. Use <strong className="text-ink">Connect</strong> in
          the header to begin.
        </p>
      </Section>
    );
  }

  return (
    <>
      <header className="pb-8 border-b border-rule">
        <p className="eyebrow">Foundation</p>
        <h1 className="font-display text-[44px] md:text-[56px] leading-[0.98] tracking-[-0.03em] mt-2">
          Wallet
        </h1>
        <p className="text-[14px] text-inkSoft mt-3 max-w-[60ch]">
          The base layer. The pool is paid in native XLM, so a working wallet
          path with real balance + payment flows is a prerequisite for every
          other page in this app.
        </p>
      </header>

      <Section
        index="Balance"
        title="XLM balance"
        note="Fetched live from Horizon for your connected address."
      >
        <Ledger
          rows={[
            [
              "XLM balance",
              balanceLoading ? "reading…" : balance !== null ? `${balance} XLM` : "—",
            ],
          ]}
        />
        <button
          className="btn mt-4"
          onClick={() => void refreshBalance()}
          disabled={balanceLoading}
          type="button"
        >
          {balanceLoading ? "Reading" : "Refresh balance"}
        </button>
        {balanceError ? (
          <div className="mt-4">
            <Notice kind="accent" title={errorLabel[balanceError.kind]}>
              {balanceError.message}
            </Notice>
          </div>
        ) : null}
      </Section>

      <Section
        index="Send"
        title="Send XLM"
        note="Plain classic-Stellar payment. Separate from the pool contract."
      >
        <div className="grid grid-cols-12 gap-x-6 gap-y-4">
          <div className="col-span-12 md:col-span-6 space-y-4">
            <Field label="Destination">
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
              type="button"
            >
              {sending ? "Sending" : "Send"}
            </button>
          </div>
          <div className="col-span-12 md:col-span-6 space-y-4">
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
    </>
  );
}
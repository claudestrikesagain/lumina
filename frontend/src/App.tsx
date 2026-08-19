import { useCallback, useState } from "react";
import { useWallet } from "./lib/wallet";
import { errorLabel } from "./lib/errors";
import { PoolState, type PoolRoots } from "./components/PoolState";
import { Wallet } from "./components/Wallet";
import { Deposit } from "./components/Deposit";
import { Withdraw } from "./components/Withdraw";
import { Notice, truncate } from "./components/ui";

export default function App() {
  const { address, network, walletId, busy, error, connect, disconnect, sign } = useWallet();
  const [roots, setRoots] = useState<PoolRoots>({ root: null, aspRoot: null });
  const [reloadKey, setReloadKey] = useState(0);

  const onRoots = useCallback((r: PoolRoots) => setRoots(r), []);

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-report px-6 md:px-10 lg:px-14">
        <header className="pt-12 pb-6 grid grid-cols-12 gap-x-6 gap-y-6 items-end">
          <div className="col-span-12 md:col-span-7">
            <p className="eyebrow">Shielded liquidity pool · Stellar / Soroban</p>
            <h1 className="font-display text-[54px] md:text-[68px] leading-[0.95] tracking-[-0.03em] mt-2">
              Lumina
            </h1>
            <p className="text-[14px] text-inkSoft mt-3 max-w-[46ch]">
              Deposits are recorded as commitments. Withdrawals require a proof of note
              ownership and of exclusion from the compliance provider&rsquo;s blocklist.
            </p>
          </div>
          <div className="col-span-12 md:col-span-5 md:justify-self-end w-full md:w-auto">
            <table className="ledger w-full md:w-[22rem]">
              <tbody>
                <tr>
                  <td className="text-inkSoft uppercase text-micro tracking-[0.12em]">Account</td>
                  <td className="num" title={address ?? undefined}>
                    {address ? truncate(address, 8, 6) : "not connected"}
                  </td>
                </tr>
                <tr>
                  <td className="text-inkSoft uppercase text-micro tracking-[0.12em]">Network</td>
                  <td className="num">{network ?? "—"}</td>
                </tr>
                <tr>
                  <td className="text-inkSoft uppercase text-micro tracking-[0.12em]">Wallet</td>
                  <td className="num">{walletId ?? "—"}</td>
                </tr>
              </tbody>
            </table>
            <div className="flex gap-3 mt-4 md:justify-end">
              {address ? (
                <button className="btn" onClick={() => void disconnect()}>
                  Disconnect
                </button>
              ) : (
                <button className="btn btn-solid" onClick={() => void connect()} disabled={busy}>
                  {busy ? "Connecting" : "Connect wallet"}
                </button>
              )}
            </div>
          </div>
          {error ? (
            <div className="col-span-12">
              <Notice kind="accent" title={errorLabel[error.kind]}>
                {error.message}
              </Notice>
            </div>
          ) : null}
        </header>

        <main>
          <Wallet address={address} sign={sign} />
          <PoolState key={reloadKey} roots={roots} onRoots={onRoots} />
          <Deposit
            address={address}
            sign={sign}
            onDeposited={() => setReloadKey((k) => k + 1)}
          />
          <Withdraw address={address} sign={sign} roots={roots} />
        </main>

        <footer className="rule-top py-8 text-[12px] text-inkFaint flex flex-wrap gap-x-8 gap-y-2">
          <span>Lumina pool client</span>
          <span>Poseidon2 and BN254 verification pending CAP-0074 / CAP-0075</span>
          <span>No funds are custodied by this interface</span>
        </footer>
      </div>
    </div>
  );
}

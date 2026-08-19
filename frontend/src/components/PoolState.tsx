import { useCallback, useEffect, useState } from "react";
import {
  CONTRACT_ID,
  NETWORK_PASSPHRASE,
  RPC_URL,
  describeError,
  getAspRoot,
  getRoot,
  isDeployed,
} from "../lib/contract";
import { Ledger, Notice, Section } from "./ui";

export type PoolRoots = { root: string | null; aspRoot: string | null };

export function PoolState({
  roots,
  onRoots,
}: {
  roots: PoolRoots;
  onRoots: (r: PoolRoots) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!isDeployed()) return;
    setLoading(true);
    setError(null);
    try {
      const [root, aspRoot] = await Promise.all([getRoot(), getAspRoot()]);
      onRoots({ root, aspRoot });
    } catch (e) {
      onRoots({ root: null, aspRoot: null });
      setError(describeError(e));
    } finally {
      setLoading(false);
    }
  }, [onRoots]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Section
      index="Statement I"
      title="Pool position"
      note="Read directly from contract storage by simulation. No indexer, no cache."
    >
      <div className="grid grid-cols-12 gap-x-6 gap-y-8">
        <div className="col-span-12 lg:col-span-7">
          <Ledger
            rows={[
              ["Contract", CONTRACT_ID || "—"],
              ["RPC endpoint", RPC_URL],
              ["Network passphrase", NETWORK_PASSPHRASE],
            ]}
          />
        </div>
        <div className="col-span-12 lg:col-span-5">
          {isDeployed() ? (
            <>
              <Ledger
                rows={[
                  ["get_root()", roots.root ?? (loading ? "reading…" : "—")],
                  ["get_asp_root()", roots.aspRoot ?? (loading ? "reading…" : "—")],
                ]}
              />
              <button className="btn mt-4" onClick={() => void load()} disabled={loading}>
                {loading ? "Reading" : "Re-read state"}
              </button>
            </>
          ) : null}
        </div>

        {!isDeployed() ? (
          <div className="col-span-12">
            <Notice title="Contract not yet deployed">
              {`VITE_CONTRACT_ID is empty, so there is no pool to read from.
Deploy contracts/lumina_pool, then set VITE_CONTRACT_ID in .env (see .env.example) and reload.
Deposit and withdraw stay disabled until then — nothing on this page is simulated.`}
            </Notice>
          </div>
        ) : null}

        {error ? (
          <div className="col-span-12">
            <Notice kind="accent" title="Read failed">
              {error}
            </Notice>
          </div>
        ) : null}
      </div>
    </Section>
  );
}

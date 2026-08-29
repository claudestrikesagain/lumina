import { Link } from "react-router-dom";
import { usePoolContext } from "../context/PoolContext";
import { useWalletContext } from "../context/WalletContext";
import { isDeployed, CONTRACT_ID, NETWORK_PASSPHRASE } from "../lib/contract";
import { Ledger, Notice, Section, truncate } from "../components/ui";

/**
 * The landing/dashboard page. Surfaces live pool health and links into the
 * main actions: deposit, view notes, proof lab. Honest about deploy status.
 */
export function OverviewPage() {
  const { root, aspRoot, loading, error, version, refresh } = usePoolContext();
  const { address } = useWalletContext();

  return (
    <>
      <header className="pb-8 border-b border-rule">
        <p className="eyebrow">Pool · Statement I</p>
        <h1 className="font-display text-[44px] md:text-[56px] leading-[0.98] tracking-[-0.03em] mt-2">
          Overview
        </h1>
        <p className="text-[14px] text-inkSoft mt-3 max-w-[60ch]">
          Live read of the deployed <code className="font-mono text-ink">lumina_pool</code>{" "}
          contract on Stellar Testnet. State is polled every 30 seconds; deposits
          trigger an immediate re-read.
        </p>
      </header>

      <Section
        index="Health"
        title="Pool position"
        note="Read directly from contract storage by simulation. No indexer, no cache."
      >
        {!isDeployed() ? (
          <Notice title="Contract not yet deployed">
            {`VITE_CONTRACT_ID is empty — there is no pool to read from. Deploy contracts/lumina_pool, then set VITE_CONTRACT_ID in .env and reload. Deposit and withdraw stay disabled until then.`}
          </Notice>
        ) : (
          <div className="grid grid-cols-12 gap-x-6 gap-y-6">
            <div className="col-span-12 lg:col-span-7">
              <Ledger
                rows={[
                  ["Contract", CONTRACT_ID],
                  ["Network passphrase", NETWORK_PASSPHRASE],
                  ["Polling", "30s · last read #" + version],
                ]}
              />
            </div>
            <div className="col-span-12 lg:col-span-5">
              <Ledger
                rows={[
                  [
                    "get_root()",
                    root ?? (loading ? "reading…" : "—"),
                  ],
                  [
                    "get_asp_root()",
                    aspRoot ?? (loading ? "reading…" : "—"),
                  ],
                ]}
              />
              <button
                className="btn mt-4"
                onClick={() => void refresh()}
                disabled={loading}
                type="button"
              >
                {loading ? "Reading" : "Re-read state"}
              </button>
            </div>

            {error ? (
              <div className="col-span-12">
                <Notice kind="accent" title="Read failed">
                  {error}
                </Notice>
              </div>
            ) : null}
          </div>
        )}
      </Section>

      <Section
        index="Actions"
        title="Quick actions"
        note="The four user-visible flows. Withdrawals are intentionally fail-closed today."
      >
        <div className="grid grid-cols-12 gap-4">
          <ActionCard
            to="/deposit"
            title="Deposit"
            hint="Commit funds to the pool"
            enabled={!!address && isDeployed()}
            reason={!address ? "Connect wallet to deposit" : !isDeployed() ? "Pool not deployed" : null}
          />
          <ActionCard
            to="/notes"
            title="My notes"
            hint="Browse & export saved deposit notes"
            enabled
          />
          <ActionCard
            to="/proof-lab"
            title="Proof Lab"
            hint="Educational ZK pipeline + fail-closed withdraw demo"
            enabled={!!address && isDeployed()}
            reason={!address ? "Connect wallet to attempt" : !isDeployed() ? "Pool not deployed" : null}
          />
          <ActionCard
            to="/ledger"
            title="Ledger"
            hint="Root history & nullifier lookup"
            enabled={isDeployed()}
            reason={!isDeployed() ? "Pool not deployed" : null}
          />
        </div>
      </Section>

      <Section
        index="Status"
        title="Honest status"
        note="What works today, and what is blocked on platform capabilities."
      >
        <div className="grid grid-cols-12 gap-4">
          <StatusCard
            title="Deposits"
            verdict="working"
            body="Tested live on Stellar Testnet. Funds move into the pool, commitment tree advances."
          />
          <StatusCard
            title="Withdrawals"
            verdict="fail-closed"
            body={`On-chain verifier returns false unconditionally until BN254 host functions ship (CAP-0074). Every submission is rejected with Error(Contract, #8) InvalidProof — by design, not by bug. Verify by submitting in Proof Lab: ${truncate(root ?? "—", 8, 8)}.`}
          />
          <StatusCard
            title="Compliance layer"
            verdict="wired"
            body="ASP exclusion root is checked on every withdrawal. Default root registered at init; admin can rotate on-chain."
          />
          <StatusCard
            title="Poseidon2 hash"
            verdict="pending"
            body="Circuit target uses Poseidon2. Contract currently hashes with SHA-256. Migration depends on CAP-0075."
          />
        </div>
      </Section>
    </>
  );
}

function ActionCard({
  to,
  title,
  hint,
  enabled,
  reason,
}: {
  to: string;
  title: string;
  hint: string;
  enabled: boolean;
  reason?: string | null;
}) {
  return (
    <Link
      to={to}
      className={`col-span-12 sm:col-span-6 lg:col-span-3 border border-rule p-4 bg-paperEdge hover:border-ink transition-colors block ${
        enabled ? "" : "opacity-50 pointer-events-none"
      }`}
    >
      <p className="eyebrow">{title}</p>
      <p className="text-[13px] text-ink mt-2">{hint}</p>
      {!enabled && reason ? (
        <p className="text-[11px] text-inkFaint mt-3">{reason}</p>
      ) : null}
    </Link>
  );
}

function StatusCard({
  title,
  verdict,
  body,
}: {
  title: string;
  verdict: "working" | "fail-closed" | "wired" | "pending";
  body: string;
}) {
  const styles: Record<string, string> = {
    working: "border-ink text-ink",
    "fail-closed": "border-oxblood text-oxblood",
    wired: "border-ink text-ink",
    pending: "border-rule text-inkFaint",
  };
  return (
    <div className="col-span-12 md:col-span-6 lg:col-span-3 border border-rule p-4">
      <div className="flex items-baseline justify-between">
        <p className="eyebrow">{title}</p>
        <span
          className={`text-[10px] uppercase tracking-[0.14em] border px-1.5 py-0.5 ${styles[verdict]}`}
        >
          {verdict}
        </span>
      </div>
      <p className="text-[12px] text-inkSoft mt-3 leading-relaxed">{body}</p>
    </div>
  );
}
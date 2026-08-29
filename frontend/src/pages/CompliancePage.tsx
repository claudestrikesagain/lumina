import { useState } from "react";
import { usePoolContext } from "../context/PoolContext";
import { useToast } from "../context/ToastContext";
import { CONTRACT_ID, isDeployed } from "../lib/contract";
import { Ledger, Notice, Section, truncate } from "../components/ui";

/**
 * Compliance explainer + admin root rotation. The latter is gated on wallet
 * connection; the rotation itself is exposed via the contract's admin-only
 * `update_asp_root` call, which is not wired in this UI yet (it's gated on
 * the wallet's address matching the contract admin and on the live
 * verifier — out of scope for this iteration).
 */
export function CompliancePage() {
  const { root, aspRoot, loading, error, refresh } = usePoolContext();
  const { push } = useToast();

  const [newRoot, setNewRoot] = useState("");

  function copyAsp() {
    if (!aspRoot) return;
    void navigator.clipboard.writeText(aspRoot);
    push("success", "ASP root copied");
  }

  return (
    <>
      <header className="pb-8 border-b border-rule">
        <p className="eyebrow">Privacy · ASP</p>
        <h1 className="font-display text-[44px] md:text-[56px] leading-[0.98] tracking-[-0.03em] mt-2">
          Compliance layer
        </h1>
        <p className="text-[14px] text-inkSoft mt-3 max-w-[64ch]">
          How Lumina enforces sanctions-style exclusion without deanonymizing
          honest users. The contract checks that the spender's key is not in
          the active Association Set Provider (ASP) blocklist — proven inside
          the withdrawal circuit.
        </p>
      </header>

      <Section
        index="Current"
        title="ASP root"
        note="The blocklist root the contract enforces. Admin-only rotation."
      >
        {isDeployed() ? (
          <div className="grid grid-cols-12 gap-x-6 gap-y-6">
            <div className="col-span-12 md:col-span-8">
              <Ledger
                rows={[
                  ["Contract", CONTRACT_ID],
                  [
                    "get_asp_root()",
                    aspRoot ?? (loading ? "reading…" : "—"),
                  ],
                  [
                    "get_root()",
                    root ?? (loading ? "reading…" : "—"),
                  ],
                ]}
              />
            </div>
            <div className="col-span-12 md:col-span-4 flex md:justify-end gap-2">
              <button
                className="btn"
                onClick={() => void refresh()}
                disabled={loading}
                type="button"
              >
                {loading ? "Reading" : "Re-read"}
              </button>
              <button
                className="btn"
                onClick={copyAsp}
                disabled={!aspRoot}
                type="button"
              >
                Copy ASP root
              </button>
            </div>
            {error ? (
              <div className="col-span-12">
                <Notice kind="accent" title="Read failed">
                  {error}
                </Notice>
              </div>
            ) : null}
            {aspRoot ? (
              <div className="col-span-12">
                <p className="text-[12px] text-inkSoft break-all font-mono border border-ruleFaint p-3 bg-paperEdge">
                  {aspRoot}
                </p>
              </div>
            ) : null}
          </div>
        ) : (
          <Notice title="Contract not deployed">
            VITE_CONTRACT_ID is empty. The compliance layer is wired but cannot
            be exercised until the contract id is set.
          </Notice>
        )}
      </Section>

      <Section
        index="Mechanism"
        title="How it works"
        note="Conceptual, not promotional."
      >
        <div className="grid grid-cols-12 gap-x-6 gap-y-6 text-[13px] text-inkSoft leading-relaxed">
          <div className="col-span-12 md:col-span-6">
            <p className="eyebrow text-ink mb-2">Privacy pool</p>
            <p>
              A privacy pool hides which deposit a withdrawal corresponds to.
              Every withdrawal can come from any of N prior deposits, and an
              external observer cannot link them.
            </p>
          </div>
          <div className="col-span-12 md:col-span-6">
            <p className="eyebrow text-ink mb-2">Association Set Provider</p>
            <p>
              The ASP publishes a Merkle root of sanctioned public keys. The
              withdrawal circuit proves the spender is <em>not</em> in this set
              using a non-membership proof.
            </p>
          </div>
          <div className="col-span-12 md:col-span-6">
            <p className="eyebrow text-ink mb-2">Cryptographic enforcement</p>
            <p>
              Compliance is a property of the proof itself. There is no
              intermediary who decides; the chain rejects any withdrawal whose
              proof does not demonstrate ASP non-membership against the
              registered root.
            </p>
          </div>
          <div className="col-span-12 md:col-span-6">
            <p className="eyebrow text-ink mb-2">No deanonymization</p>
            <p>
              The contract never learns which deposit a withdrawal corresponds
              to. It only learns that a withdrawal is backed by a real, valid,
              unsanctioned note.
            </p>
          </div>
        </div>
      </Section>

      <Section
        index="Admin"
        title="ASP root rotation"
        note="Admin-only. The contract rejects any caller that is not the deployer."
      >
        <div className="grid grid-cols-12 gap-x-6 gap-y-6">
          <div className="col-span-12 md:col-span-7">
            <Notice title="Rotation interface — read-only today">
              {`The contract exposes update_asp_root(new_root) gated on the deployer
address. Wiring it into this UI requires the connected wallet to BE the deployer
(verified via the contract admin storage key) and the on-chain Groth16 verifier
to be live. The first is a small UX addition; the second is blocked on CAP-0074.
For now, ASP roots rotate via the contract CLI:

  stellar contract invoke --id ${CONTRACT_ID || "<contract-id>"} \\
    --source <admin-secret> --network testnet \\
    -- update_asp_root --new_root ${aspRoot ? truncate(aspRoot, 8, 8) : "<new-root-hex>"}`}
            </Notice>
          </div>
          <div className="col-span-12 md:col-span-5 space-y-3">
            <p className="eyebrow">New ASP root (preview)</p>
            <input
              value={newRoot}
              onChange={(e) => setNewRoot(e.target.value)}
              placeholder="64-character hex"
            />
            <button
              className="btn"
              disabled
              type="button"
              title="Wiring disabled pending CAP-0074"
            >
              Submit rotation
            </button>
            <p className="text-[11px] text-inkFaint">
              Disabled — see notice on the left.
            </p>
          </div>
        </div>
      </Section>
    </>
  );
}
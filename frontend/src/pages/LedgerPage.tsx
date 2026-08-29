import { useState } from "react";
import { usePoolContext } from "../context/PoolContext";
import { useToast } from "../context/ToastContext";
import {
  CONTRACT_ID,
  isDeployed,
  isKnownRoot,
  isNullifierSpent,
} from "../lib/contract";
import { Field, Ledger, Notice, Section } from "../components/ui";

/**
 * Pool transparency — root history viewer, nullifier lookup, "is this a known
 * root?" tool. These are direct on-chain reads; nothing is cached.
 *
 * The contract does not expose an indexed root-history view today (root
 * history lives inside a ring buffer in instance storage; reading arbitrary
 * indices requires per-slot RPCs). What we CAN show: current root, ASP root,
 * and ad-hoc nullifier / root lookups against the live chain.
 */
export function LedgerPage() {
  const { root, aspRoot, loading } = usePoolContext();
  const { push } = useToast();

  const [nullifierHex, setNullifierHex] = useState("");
  const [nullifierResult, setNullifierResult] = useState<boolean | null>(null);
  const [nullifierBusy, setNullifierBusy] = useState(false);
  const [nullifierErr, setNullifierErr] = useState<string | null>(null);

  const [rootHex, setRootHex] = useState("");
  const [rootResult, setRootResult] = useState<boolean | null>(null);
  const [rootBusy, setRootBusy] = useState(false);
  const [rootErr, setRootErr] = useState<string | null>(null);

  async function checkNullifier() {
    setNullifierBusy(true);
    setNullifierErr(null);
    setNullifierResult(null);
    try {
      const v = await isNullifierSpent(nullifierHex);
      setNullifierResult(v);
      push("info", v ? "Nullifier is spent" : "Nullifier is unspent");
    } catch (e) {
      setNullifierErr((e as Error).message);
    } finally {
      setNullifierBusy(false);
    }
  }

  async function checkRoot() {
    setRootBusy(true);
    setRootErr(null);
    setRootResult(null);
    try {
      const v = await isKnownRoot(rootHex);
      setRootResult(v);
      push("info", v ? "Root is in history" : "Root is not known");
    } catch (e) {
      setRootErr((e as Error).message);
    } finally {
      setRootBusy(false);
    }
  }

  return (
    <>
      <header className="pb-8 border-b border-rule">
        <p className="eyebrow">Privacy · Ledger</p>
        <h1 className="font-display text-[44px] md:text-[56px] leading-[0.98] tracking-[-0.03em] mt-2">
          Ledger
        </h1>
        <p className="text-[14px] text-inkSoft mt-3 max-w-[60ch]">
          Live on-chain lookups against the deployed contract. Nothing is
          cached, nothing is indexed — every value comes from a fresh RPC read.
        </p>
      </header>

      <Section
        index="Roots"
        title="Current roots"
        note="The two roots the contract enforces on every withdrawal."
      >
        {isDeployed() ? (
          <Ledger
            rows={[
              ["Contract", CONTRACT_ID],
              ["get_root()", root ?? (loading ? "reading…" : "—")],
              ["get_asp_root()", aspRoot ?? (loading ? "reading…" : "—")],
            ]}
          />
        ) : (
          <Notice title="Contract not deployed">
            VITE_CONTRACT_ID is empty. Reads are disabled until set.
          </Notice>
        )}
      </Section>

      <Section
        index="Nullifier"
        title="Is this nullifier spent?"
        note="is_nullifier_spent(nullifier: BytesN<32>) -> bool"
      >
        <div className="grid grid-cols-12 gap-x-6 gap-y-6">
          <div className="col-span-12 md:col-span-7 space-y-3">
            <Field label="Nullifier (32-byte hex)">
              <input
                value={nullifierHex}
                onChange={(e) => setNullifierHex(e.target.value)}
                placeholder="64 hex chars"
                disabled={!isDeployed() || nullifierBusy}
              />
            </Field>
            <button
              className="btn"
              onClick={() => void checkNullifier()}
              disabled={!isDeployed() || nullifierBusy || !nullifierHex}
              type="button"
            >
              {nullifierBusy ? "Reading" : "Check nullifier"}
            </button>
          </div>
          <div className="col-span-12 md:col-span-5">
            {nullifierResult !== null ? (
              <Notice
                kind={nullifierResult ? "accent" : "neutral"}
                title={nullifierResult ? "Spent" : "Unspent"}
              >
                {`is_nullifier_spent returned ${nullifierResult}`}
              </Notice>
            ) : null}
            {nullifierErr ? (
              <Notice kind="accent" title="Read failed">
                {nullifierErr}
              </Notice>
            ) : null}
          </div>
        </div>
      </Section>

      <Section
        index="History"
        title="Is this root known?"
        note="is_known_root(root: BytesN<32>) -> bool — true if the root is in the contract's accepted-history ring buffer."
      >
        <div className="grid grid-cols-12 gap-x-6 gap-y-6">
          <div className="col-span-12 md:col-span-7 space-y-3">
            <Field label="Merkle root (32-byte hex)">
              <input
                value={rootHex}
                onChange={(e) => setRootHex(e.target.value)}
                placeholder="64 hex chars"
                disabled={!isDeployed() || rootBusy}
              />
            </Field>
            <button
              className="btn"
              onClick={() => void checkRoot()}
              disabled={!isDeployed() || rootBusy || !rootHex}
              type="button"
            >
              {rootBusy ? "Reading" : "Check root"}
            </button>
          </div>
          <div className="col-span-12 md:col-span-5">
            {rootResult !== null ? (
              <Notice
                kind={rootResult ? "neutral" : "accent"}
                title={rootResult ? "Known" : "Unknown"}
              >
                {`is_known_root returned ${rootResult}`}
              </Notice>
            ) : null}
            {rootErr ? (
              <Notice kind="accent" title="Read failed">
                {rootErr}
              </Notice>
            ) : null}
          </div>
        </div>
      </Section>

      <Section
        index="About"
        title="What this page does not show"
        note="Limits are honest limits."
      >
        <p className="text-[13px] text-inkSoft max-w-[64ch] leading-relaxed">
          The contract stores up to N historical roots in a ring buffer, but
          does not expose a per-slot getter — only <code className="font-mono">is_known_root</code>.
          A full historical table would require either a contract view method
          or an off-chain indexer. Neither is in scope today. This page
          surfaces what the contract exposes; for the rest,{" "}
          <a
            className="underline"
            href={`https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID}`}
            target="_blank"
            rel="noreferrer"
          >
            open Stellar Expert ↗
          </a>{" "}
          to inspect storage directly.
        </p>
      </Section>
    </>
  );
}
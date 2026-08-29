import { useState } from "react";
import { useWalletContext } from "../context/WalletContext";
import { usePoolContext } from "../context/PoolContext";
import { useToast } from "../context/ToastContext";
import {
  describeError,
  fromStroops,
  isDeployed,
  isNullifierSpent,
  withdraw,
} from "../lib/contract";
import { nullifierOf, parseNote } from "../lib/note";
import { Field, Ledger, Notice, Section } from "../components/ui";
import { ZkPipelineVisualizer } from "../components/ZkPipelineVisualizer";

/**
 * Proof Lab — the educational ZK pipeline + live fail-closed withdraw demo.
 *
 * Two halves:
 *   • left:   5-stage ZK pipeline diagram (lights up as the user proceeds)
 *   • right:  real on-chain withdraw submission form, plus explainer
 *
 * Submissions will ALWAYS be rejected with Error(Contract, #8) InvalidProof
 * until CAP-0074 ships — that rejection is the point of the lab.
 */
export function ProofLabPage() {
  const { address, sign } = useWalletContext();
  const { root, aspRoot, loading } = usePoolContext();
  const { push } = useToast();

  const [noteText, setNoteText] = useState("");
  const [proof, setProof] = useState("");
  const [recipient, setRecipient] = useState("");
  const [merkleRoot, setMerkleRoot] = useState("");
  const [nullifier, setNullifier] = useState<string | null>(null);
  const [spent, setSpent] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const [amount, setAmount] = useState<bigint | null>(null);
  const [stage, setStage] = useState<0 | 1 | 2 | 3 | 4>(0);

  const effectiveRoot = merkleRoot.trim() || root || "";

  async function loadNote() {
    setError(null);
    setHash(null);
    setSpent(null);
    try {
      const n = parseNote(noteText);
      const nf = await nullifierOf(n);
      setNullifier(nf);
      setAmount(BigInt(n.amount));
      setStage(1);
      if (isDeployed()) setSpent(await isNullifierSpent(nf));
    } catch (e) {
      setNullifier(null);
      setAmount(null);
      setError(describeError(e));
    }
  }

  async function submit() {
    setBusy(true);
    setError(null);
    setHash(null);
    try {
      if (!nullifier || amount === null) throw new Error("Load a note first.");
      if (!aspRoot) throw new Error("ASP root unavailable — re-read pool state first.");
      if (!effectiveRoot) throw new Error("No merkle root available.");
      setStage(2);
      const res = await withdraw(
        {
          proofHex: proof,
          merkleRootHex: effectiveRoot,
          aspRootHex: aspRoot,
          nullifierHex: nullifier,
          recipient: recipient.trim(),
          amountStroops: amount,
        },
        address!,
        sign,
      );
      setStage(4);
      setHash(res.hash);
      push("success", "Withdraw accepted on-chain", res.hash);
    } catch (e) {
      const msg = describeError(e);
      setError(msg);
      setStage(3);
      push("warning", "Withdraw rejected by fail-closed verifier", msg);
    } finally {
      setBusy(false);
    }
  }

  const disabled = !address || !isDeployed() || busy;

  return (
    <>
      <header className="pb-8 border-b border-rule">
        <p className="eyebrow">Privacy · Statement III</p>
        <h1 className="font-display text-[44px] md:text-[56px] leading-[0.98] tracking-[-0.03em] mt-2">
          Proof Lab
        </h1>
        <p className="text-[14px] text-inkSoft mt-3 max-w-[64ch]">
          An interactive walkthrough of the Groth16 withdrawal pipeline and a
          live fail-closed demo. Every submission is rejected on-chain with
          Error(Contract,&nbsp;#8) InvalidProof until CAP-0074 ships the BN254
          host functions. That rejection is not a bug — it is the point.
        </p>
      </header>

      <ZkPipelineVisualizer currentStage={stage} hasNote={!!nullifier} />

      <Section
        index="Try it"
        title="Submit a withdrawal attempt"
        note="Real on-chain call. Real rejection. Read the explainer, not just the error."
      >
        <div className="grid grid-cols-12 gap-x-6 gap-y-6">
          <div className="col-span-12 lg:col-span-6 space-y-5">
            <Field label="Note" hint="The JSON saved at deposit time.">
              <textarea
                rows={6}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder='{ "nullifierSeed": "…", "secret": "…", "amount": "…", "commitment": "…" }'
                disabled={busy}
              />
            </Field>
            <button
              className="btn"
              onClick={() => void loadNote()}
              disabled={busy || !noteText}
              type="button"
            >
              Load note
            </button>

            <Field label="Proof" hint="Groth16 proof bytes (A, B, C), hex.">
              <textarea
                rows={3}
                value={proof}
                onChange={(e) => setProof(e.target.value)}
                placeholder="0x…"
                disabled={disabled}
              />
            </Field>

            <Field label="Recipient">
              <input
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="G…"
                disabled={disabled}
              />
            </Field>

            <Field
              label="Merkle root override"
              hint="Blank uses the pool's current root; a stale note may need an older, still-known root."
            >
              <input
                value={merkleRoot}
                onChange={(e) => setMerkleRoot(e.target.value)}
                placeholder={root ?? "—"}
                disabled={disabled}
              />
            </Field>

            <button
              className="btn btn-solid"
              onClick={() => void submit()}
              disabled={disabled || !nullifier || !proof || !recipient}
              type="button"
            >
              {busy ? "Submitting on-chain" : "Withdraw"}
            </button>
          </div>

          <div className="col-span-12 lg:col-span-6 space-y-4">
            <Ledger
              rows={[
                ["Nullifier H(k)", nullifier ?? "—"],
                ["Already spent", spent === null ? "—" : spent ? "yes" : "no"],
                ["Amount", amount === null ? "—" : fromStroops(amount)],
                ["Merkle root used", effectiveRoot || "—"],
                ["ASP root used", aspRoot ?? (loading ? "reading…" : "—")],
                ["Transaction", hash ?? "—"],
              ]}
            />

            <Notice title="Verifier is a fail-closed stub">
              {`verify_withdraw_proof() in contracts/lumina_pool returns false unconditionally until the BN254 host functions of CAP-0074 ship. Every withdrawal will be rejected on-chain with Error(Contract, #8) InvalidProof. That rejection is shown here verbatim — it is not simulated and it is not a client bug.`}
            </Notice>

            {error ? (
              <Notice kind="accent" title="Withdraw rejected">
                {error}
              </Notice>
            ) : null}
            {hash ? (
              <Notice kind="accent" title="Withdraw accepted on-chain">
                {hash}
              </Notice>
            ) : null}
          </div>
        </div>
      </Section>

      <Section
        index="Why this matters"
        title="What this proves even in test mode"
        note="Three things the fail-closed path still exercises for real."
      >
        <ul className="space-y-3 text-[13px] text-inkSoft max-w-[68ch]">
          <li className="flex gap-3">
            <span className="eyebrow text-oxblood shrink-0">1.</span>
            <span>
              <strong className="text-ink">Nullifier tracking.</strong> The
              contract records H(k) on first use and rejects any later attempt
              to spend the same note. You can verify this by submitting the same
              note twice.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="eyebrow text-oxblood shrink-0">2.</span>
            <span>
              <strong className="text-ink">Commitment validation.</strong> The
              leaf the proof claims membership for must match a real commitment
              in the on-chain tree.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="eyebrow text-oxblood shrink-0">3.</span>
            <span>
              <strong className="text-ink">ASP non-membership.</strong> The
              proof attests that the spender is not on the active blocklist —
              enforced at the circuit level once verification is wired in.
            </span>
          </li>
        </ul>
      </Section>
    </>
  );
}
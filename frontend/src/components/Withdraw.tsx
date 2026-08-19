import { useState } from "react";
import {
  describeError,
  fromStroops,
  isDeployed,
  isNullifierSpent,
  withdraw,
  type Signer,
} from "../lib/contract";
import { nullifierOf, parseNote } from "../lib/note";
import { Field, Ledger, Notice, Section } from "./ui";
import type { PoolRoots } from "./PoolState";

export function Withdraw({
  address,
  sign,
  roots,
}: {
  address: string | null;
  sign: Signer;
  roots: PoolRoots;
}) {
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

  const effectiveRoot = merkleRoot.trim() || roots.root || "";

  async function loadNote() {
    setError(null);
    setHash(null);
    setSpent(null);
    try {
      const note = parseNote(noteText);
      const n = await nullifierOf(note);
      setNullifier(n);
      setAmount(BigInt(note.amount));
      if (isDeployed()) setSpent(await isNullifierSpent(n));
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
      if (!roots.aspRoot) throw new Error("ASP root unavailable — re-read pool state first.");
      if (!effectiveRoot) throw new Error("No merkle root available.");
      const res = await withdraw(
        {
          proofHex: proof,
          merkleRootHex: effectiveRoot,
          aspRootHex: roots.aspRoot,
          nullifierHex: nullifier,
          recipient: recipient.trim(),
          amountStroops: amount,
        },
        address!,
        sign,
      );
      setHash(res.hash);
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy(false);
    }
  }

  const disabled = !address || !isDeployed() || busy;

  return (
    <Section
      index="Statement III"
      title="Withdraw"
      note="Spends a note against a Groth16 proof of membership and ASP non-membership."
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
          <button className="btn" onClick={() => void loadNote()} disabled={busy || !noteText}>
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
              placeholder={roots.root ?? "—"}
              disabled={disabled}
            />
          </Field>

          <button
            className="btn btn-solid"
            onClick={() => void submit()}
            disabled={disabled || !nullifier || !proof || !recipient}
          >
            {busy ? "Submitting" : "Withdraw"}
          </button>
        </div>

        <div className="col-span-12 lg:col-span-6 space-y-4">
          <Ledger
            rows={[
              ["Nullifier H(k)", nullifier ?? "—"],
              [
                "Already spent",
                spent === null ? "—" : spent ? "yes" : "no",
              ],
              ["Amount", amount === null ? "—" : fromStroops(amount)],
              ["Merkle root used", effectiveRoot || "—"],
              ["ASP root used", roots.aspRoot ?? "—"],
              ["Transaction", hash ?? "—"],
            ]}
          />

          <Notice title="Verifier is a fail-closed stub">
            {`verify_withdraw_proof() in contracts/lumina_pool returns false unconditionally until the
BN254 host functions of CAP-0074 ship. Every withdrawal will be rejected on-chain with
Error(Contract, #8) InvalidProof. That rejection is shown here verbatim — it is not simulated
and it is not a client bug.`}
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
  );
}

import { useState } from "react";
import { deposit, describeError, isDeployed, toStroops, type Signer } from "../lib/contract";
import { createNote, serializeNote, type Note } from "../lib/note";
import { Field, Ledger, Notice, Section } from "./ui";

export function Deposit({
  address,
  sign,
  onDeposited,
}: {
  address: string | null;
  sign: Signer;
  onDeposited: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<Note | null>(null);
  const [hash, setHash] = useState<string | null>(null);

  const disabled = !address || !isDeployed() || busy;

  async function submit() {
    setBusy(true);
    setError(null);
    setNote(null);
    setHash(null);
    try {
      const stroops = toStroops(amount);
      const fresh = await createNote(stroops);
      const res = await deposit(address!, stroops, fresh.commitment, sign);
      setNote({ ...fresh, leafIndex: res.leafIndex });
      setHash(res.hash);
      onDeposited();
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section
      index="Statement II"
      title="Deposit"
      note="Funds enter the pool against a commitment. The note below is the only record of ownership — it is never sent anywhere."
    >
      <div className="grid grid-cols-12 gap-x-6 gap-y-6">
        <div className="col-span-12 md:col-span-5">
          <Field label="Amount" hint="Pool asset, 7 decimals. Requires an existing trustline.">
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="100.0000000"
              inputMode="decimal"
              disabled={disabled}
            />
          </Field>
          <button className="btn btn-solid mt-4" onClick={() => void submit()} disabled={disabled}>
            {busy ? "Signing" : "Deposit"}
          </button>
          {!address ? (
            <p className="text-[12px] text-inkFaint mt-3">Connect a wallet to deposit.</p>
          ) : null}
        </div>

        <div className="col-span-12 md:col-span-7">
          {note ? (
            <div className="animate-fade">
              <Notice kind="accent" title="Save this note now — it cannot be recovered">
                {serializeNote(note)}
              </Notice>
              <div className="mt-4">
                <Ledger
                  rows={[
                    ["Leaf index", String(note.leafIndex ?? "—")],
                    ["Commitment", note.commitment],
                    ["Transaction", hash ?? "—"],
                  ]}
                />
              </div>
              <button
                className="btn mt-4"
                onClick={() => void navigator.clipboard.writeText(serializeNote(note))}
              >
                Copy note
              </button>
            </div>
          ) : (
            <p className="text-[13px] text-inkSoft max-w-[52ch]">
              The commitment is hashed in the browser from a fresh random nullifier seed and
              secret. The contract currently hashes with SHA-256, not Poseidon2 — this client
              matches the deployed contract rather than the target circuit.
            </p>
          )}
          {error ? (
            <div className="mt-4">
              <Notice kind="accent" title="Deposit rejected">
                {error}
              </Notice>
            </div>
          ) : null}
        </div>
      </div>
    </Section>
  );
}

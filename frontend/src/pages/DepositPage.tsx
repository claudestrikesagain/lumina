import { useState } from "react";
import { useWalletContext } from "../context/WalletContext";
import { usePoolContext } from "../context/PoolContext";
import { useNoteVault } from "../context/NoteVaultContext";
import { useToast } from "../context/ToastContext";
import {
  CONTRACT_ID,
  deposit as contractDeposit,
  describeError,
  isDeployed,
  toStroops,
} from "../lib/contract";
import { createNote, serializeNote, type Note } from "../lib/note";
import { Field, Ledger, Notice, Section, truncate } from "../components/ui";
import { NoteBackupModal } from "../components/NoteBackupModal";

/**
 * The deposit ceremony. The flow:
 *   1. amount input
 *   2. "Generating note…" — derive commitment client-side
 *   3. NoteBackupModal — user MUST save the note (cannot dismiss without ack)
 *   4. submit deposit → on-chain confirmation
 *   5. leaf index + tx hash surfaced
 *
 * Note: this client hashes with SHA-256 today because the deployed contract
 * does. Poseidon2 is the circuit target — see Compliance page.
 */
export function DepositPage() {
  const { address, sign } = useWalletContext();
  const { refresh } = usePoolContext();
  const { add: addNote } = useNoteVault();
  const { push } = useToast();

  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<Note | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const [backupOpen, setBackupOpen] = useState(false);

  const disabled = !address || !isDeployed() || busy;

  async function runDeposit() {
    setBusy(true);
    setError(null);
    setNote(null);
    setHash(null);
    try {
      const stroops = toStroops(amount);
      const fresh = await createNote(stroops);
      const tx = await contractDeposit(address!, stroops, fresh.commitment, sign);
      const finalNote = { ...fresh, leafIndex: tx.leafIndex };
      setNote(finalNote);
      setHash(tx.hash);
      addNote(finalNote);
      push("success", `Deposit confirmed · leaf ${tx.leafIndex}`, tx.hash);
      setBackupOpen(true);
      await refresh();
    } catch (e) {
      const msg = describeError(e);
      setError(msg);
      push("error", "Deposit rejected", msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Section
        index="Pool · Statement II"
        title="Deposit"
        note="Funds enter the pool against a commitment. The note is the only record of ownership — it is never sent anywhere."
      >
        <div className="grid grid-cols-12 gap-x-6 gap-y-6">
          <div className="col-span-12 md:col-span-5 space-y-4">
            <Field
              label="Amount (XLM)"
              hint="7 decimals. The contract currently hashes commitments with SHA-256, not Poseidon2."
            >
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="100.0000000"
                inputMode="decimal"
                disabled={disabled}
              />
            </Field>
            <button
              className="btn btn-solid"
              onClick={() => void runDeposit()}
              disabled={disabled || !amount}
            >
              {busy ? "Signing transaction" : "Deposit"}
            </button>
            {!address ? (
              <p className="text-[12px] text-inkFaint">
                Connect a wallet to deposit.
              </p>
            ) : null}
            {!isDeployed() ? (
              <Notice title="Contract not deployed">
                {`VITE_CONTRACT_ID is empty — deposits are disabled. Set it in .env to a real C… address (e.g. ${CONTRACT_ID || "<contract id>"}) and reload.`}
              </Notice>
            ) : null}
          </div>

          <div className="col-span-12 md:col-span-7 space-y-4">
            <Ledger
              rows={[
                ["Contract", CONTRACT_ID || "—"],
                ["Network", "Testnet"],
                [
                  "Hash algorithm",
                  "SHA-256 today (Poseidon2 target — pending CAP-0075)",
                ],
                ["Pool asset", "Native XLM (Lumens)"],
              ]}
            />

            {note ? (
              <div className="animate-slide-up">
                <Notice kind="accent" title="Save this note — it cannot be recovered">
                  {`Leaf ${note.leafIndex}\n${note.commitment}\n${truncate(hash ?? "", 12, 12)}`}
                </Notice>
                <div className="mt-3 flex gap-2 flex-wrap">
                  <button
                    className="btn"
                    onClick={() => setBackupOpen(true)}
                    type="button"
                  >
                    Show & save note
                  </button>
                  <button
                    className="btn"
                    onClick={() =>
                      void navigator.clipboard.writeText(serializeNote(note))
                    }
                    type="button"
                  >
                    Copy note JSON
                  </button>
                  {hash ? (
                    <a
                      className="btn"
                      href={`https://stellar.expert/explorer/testnet/tx/${hash}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View on Stellar Expert ↗
                    </a>
                  ) : null}
                </div>
              </div>
            ) : null}

            {error ? (
              <Notice kind="accent" title="Deposit rejected">
                {error}
              </Notice>
            ) : null}
          </div>
        </div>
      </Section>

      {note ? (
        <NoteBackupModal
          note={note}
          open={backupOpen}
          onClose={() => setBackupOpen(false)}
          hash={hash}
        />
      ) : null}
    </>
  );
}
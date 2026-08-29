import { useEffect, useState } from "react";
import type { Note } from "../lib/note";
import { serializeNote } from "../lib/note";

/**
 * Full-screen modal shown immediately after a deposit confirms. The user MUST
 * acknowledge that they have saved the note before the modal can close — this
 * mirrors banking-app "secret recovery phrase" UX and prevents accidental loss.
 *
 * Provides three save paths: copy to clipboard, download as .json, and
 * "I've saved it" acknowledgment that closes the modal.
 */
export function NoteBackupModal({
  note,
  hash,
  open,
  onClose,
}: {
  note: Note;
  hash: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const [ack, setAck] = useState(false);
  const [copied, setCopied] = useState(false);

  // Reset every time the modal opens with a new note.
  useEffect(() => {
    if (open) {
      setAck(false);
      setCopied(false);
    }
  }, [open, note.commitment]);

  if (!open) return null;

  const json = serializeNote(note);

  async function copy() {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
    } catch {
      /* clipboard can be blocked; downloading still works */
    }
  }

  function download() {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lumina-note-leaf-${note.leafIndex ?? "x"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div
      className="fixed inset-0 z-40 bg-ink/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="backup-modal-title"
    >
      <div className="bg-paper border-2 border-oxblood max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="border-b border-oxblood bg-oxbloodFaint px-6 py-5">
          <p className="eyebrow !text-oxblood">Critical · save now</p>
          <h2
            id="backup-modal-title"
            className="font-display text-[32px] leading-[1.05] tracking-[-0.02em] mt-1 text-oxblood"
          >
            Stop — save this note.
          </h2>
          <p className="text-[13px] text-ink mt-2 max-w-[52ch]">
            This is the only record of your deposit. Lumina cannot recover it for
            you. If you lose this JSON you lose access to the funds permanently.
          </p>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div>
            <p className="eyebrow mb-2">Note JSON</p>
            <pre className="bg-paperDeep border border-rule p-3 text-[12px] font-mono text-ink overflow-x-auto whitespace-pre-wrap break-all">
              {json}
            </pre>
          </div>

          <div className="flex flex-wrap gap-2">
            <button className="btn" onClick={() => void copy()} type="button">
              {copied ? "Copied ✓" : "Copy to clipboard"}
            </button>
            <button className="btn" onClick={download} type="button">
              Download .json
            </button>
            {hash ? (
              <a
                className="btn"
                href={`https://stellar.expert/explorer/testnet/tx/${hash}`}
                target="_blank"
                rel="noreferrer"
              >
                Deposit tx ↗
              </a>
            ) : null}
          </div>

          <label className="flex items-start gap-3 border-t border-ruleFaint pt-4 cursor-pointer">
            <input
              type="checkbox"
              checked={ack}
              onChange={(e) => setAck(e.target.checked)}
              className="!w-4 !h-4 !p-0 mt-0.5"
            />
            <span className="text-[13px] text-ink">
              I have saved this note somewhere safe. I understand Lumina cannot
              recover it.
            </span>
          </label>
        </div>

        <div className="border-t border-rule px-6 py-3 flex justify-end">
          <button
            className="btn btn-solid"
            disabled={!ack}
            onClick={onClose}
            type="button"
          >
            {ack ? "I've saved it — close" : "Save the note first"}
          </button>
        </div>
      </div>
    </div>
  );
}
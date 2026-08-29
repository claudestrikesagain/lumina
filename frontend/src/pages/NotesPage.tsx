import { useEffect, useState } from "react";
import { useNoteVault } from "../context/NoteVaultContext";
import { useToast } from "../context/ToastContext";
import { isDeployed, isNullifierSpent } from "../lib/contract";
import { nullifierOf, serializeNote, type Note } from "../lib/note";
import { Field, Ledger, Notice, Section, truncate } from "../components/ui";

type Status = "loading" | "spent" | "live" | "unknown";

/**
 * Local encrypted note vault. Notes are stored in localStorage; nothing is
 * uploaded. Each note can be checked on-chain to see if its nullifier has
 * been spent (i.e. it has been withdrawn).
 */
export function NotesPage() {
  const { notes, remove, clear, importJson, exportJson } = useNoteVault();
  const { push } = useToast();

  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [importText, setImportText] = useState("");

  useEffect(() => {
    if (!isDeployed()) return;
    let cancelled = false;
    (async () => {
      const next: Record<string, Status> = {};
      for (const n of notes) {
        next[n.commitment] = "loading";
      }
      if (!cancelled) setStatuses(next);
      for (const n of notes) {
        try {
          const nf = await nullifierOf(n);
          const spent = await isNullifierSpent(nf);
          if (cancelled) return;
          setStatuses((prev) => ({ ...prev, [n.commitment]: spent ? "spent" : "live" }));
        } catch {
          if (cancelled) return;
          setStatuses((prev) => ({ ...prev, [n.commitment]: "unknown" }));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [notes]);

  function downloadBackup() {
    const blob = new Blob([exportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lumina-notes-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function doImport() {
    try {
      const n = importJson(importText);
      setImportText("");
      push("success", `Imported ${n} note${n === 1 ? "" : "s"}`);
    } catch (e) {
      push("error", "Import failed", (e as Error).message);
    }
  }

  function downloadCsv() {
    const header = ["commitment", "amount_stroops", "leaf_index", "nullifier_seed", "secret"];
    const rows = notes.map((n) =>
      [n.commitment, n.amount, n.leafIndex ?? "", n.nullifierSeed, n.secret]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lumina-notes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    push("success", `Exported ${notes.length} note${notes.length === 1 ? "" : "s"}`);
  }

  return (
    <>
      <header className="pb-8 border-b border-rule">
        <p className="eyebrow">Pool · Local vault</p>
        <h1 className="font-display text-[44px] md:text-[56px] leading-[0.98] tracking-[-0.03em] mt-2">
          My notes
        </h1>
        <p className="text-[14px] text-inkSoft mt-3 max-w-[60ch]">
          Every deposit you confirm here saves the note to this browser's
          localStorage. Nothing is uploaded. Back up to JSON or CSV regularly.
        </p>
      </header>

      <Section
        index="Vault"
        title={`Saved notes (${notes.length})`}
        note="One row per deposit. Status checks the live contract for spent nullifiers."
      >
        {notes.length === 0 ? (
          <Notice title="No notes saved yet">
            {`Deposit some XLM first — your notes will appear here automatically. You can also paste a previously-saved note JSON in the import box below.`}
          </Notice>
        ) : (
          <div className="space-y-3">
            {notes.map((n) => (
              <NoteRow
                key={n.commitment}
                note={n}
                status={statuses[n.commitment] ?? "loading"}
                onCopy={() => {
                  void navigator.clipboard.writeText(serializeNote(n));
                  push("success", "Note copied");
                }}
                onRemove={() => {
                  remove(n.commitment);
                  push("info", "Note removed from local vault");
                }}
              />
            ))}
          </div>
        )}

        {notes.length > 0 ? (
          <div className="mt-6 flex flex-wrap gap-2">
            <button className="btn" onClick={downloadBackup} type="button">
              Download JSON backup
            </button>
            <button className="btn" onClick={downloadCsv} type="button">
              Export CSV
            </button>
            <button
              className="btn"
              onClick={() => {
                if (confirm(`Remove all ${notes.length} saved note(s) from this browser?`)) {
                  clear();
                  push("info", "Vault cleared");
                }
              }}
              type="button"
            >
              Clear vault
            </button>
          </div>
        ) : null}
      </Section>

      <Section
        index="Import"
        title="Recover a note"
        note="Paste a previously-saved JSON to add it back to this vault."
      >
        <div className="space-y-3 max-w-2xl">
          <Field label="Note JSON">
            <textarea
              rows={5}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder='{ "nullifierSeed": "…", "secret": "…", "amount": "…", "commitment": "…" }'
            />
          </Field>
          <button
            className="btn"
            onClick={doImport}
            disabled={!importText}
            type="button"
          >
            Import
          </button>
        </div>
      </Section>
    </>
  );
}

function NoteRow({
  note,
  status,
  onCopy,
  onRemove,
}: {
  note: Note;
  status: Status;
  onCopy: () => void;
  onRemove: () => void;
}) {
  const STATUS_LABEL: Record<Status, string> = {
    loading: "checking…",
    spent: "spent",
    live: "live",
    unknown: "—",
  };
  const STATUS_COLOR: Record<Status, string> = {
    loading: "text-inkFaint",
    spent: "text-oxblood",
    live: "text-ink",
    unknown: "text-inkFaint",
  };
  return (
    <div className="border border-rule p-4 bg-paperEdge">
      <div className="grid grid-cols-12 gap-x-6 gap-y-3 items-start">
        <div className="col-span-12 md:col-span-8 min-w-0">
          <Ledger
            rows={[
              ["Amount", `${note.amount} stroops`],
              ["Commitment", truncate(note.commitment, 16, 16)],
              ["Leaf index", note.leafIndex !== undefined ? String(note.leafIndex) : "—"],
              ["Status", <span key="s" className={STATUS_COLOR[status]}>{STATUS_LABEL[status]}</span>],
            ]}
          />
        </div>
        <div className="col-span-12 md:col-span-4 flex md:justify-end gap-2">
          <button className="btn !py-1 !px-3 text-[10px]" onClick={onCopy} type="button">
            Copy
          </button>
          <button className="btn !py-1 !px-3 text-[10px]" onClick={onRemove} type="button">
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { parseNote, type Note } from "../lib/note";

const STORAGE_KEY = "lumina.notes.v1";

type NoteVaultState = {
  notes: Note[];
  add: (n: Note) => void;
  remove: (commitment: string) => void;
  clear: () => void;
  importJson: (text: string) => number;
  exportJson: () => string;
};

const NoteVaultContext = createContext<NoteVaultState | null>(null);

function readStorage(): Note[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Validate each entry; drop bad ones silently rather than blow up the vault.
    const out: Note[] = [];
    for (const item of parsed) {
      try {
        out.push(parseNote(JSON.stringify(item)));
      } catch {
        /* drop malformed */
      }
    }
    return out;
  } catch {
    return [];
  }
}

function writeStorage(notes: Note[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

export function NoteVaultProvider({ children }: { children: ReactNode }) {
  const [notes, setNotes] = useState<Note[]>(() => readStorage());

  // Cross-tab sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setNotes(readStorage());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const add = useCallback((n: Note) => {
    setNotes((prev) => {
      if (prev.some((x) => x.commitment === n.commitment)) return prev;
      const next = [...prev, n];
      writeStorage(next);
      return next;
    });
  }, []);

  const remove = useCallback((commitment: string) => {
    setNotes((prev) => {
      const next = prev.filter((n) => n.commitment !== commitment);
      writeStorage(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    writeStorage([]);
    setNotes([]);
  }, []);

  const importJson = useCallback((text: string): number => {
    const parsed = JSON.parse(text);
    const items: unknown[] = Array.isArray(parsed) ? parsed : [parsed];
    let added = 0;
    setNotes((prev) => {
      const next = [...prev];
      for (const item of items) {
        try {
          const n = parseNote(JSON.stringify(item));
          if (!next.some((x) => x.commitment === n.commitment)) {
            next.push(n);
            added += 1;
          }
        } catch {
          /* skip bad entries */
        }
      }
      writeStorage(next);
      return next;
    });
    return added;
  }, []);

  const exportJson = useCallback(() => JSON.stringify(notes, null, 2), [notes]);

  const value = useMemo<NoteVaultState>(
    () => ({ notes, add, remove, clear, importJson, exportJson }),
    [notes, add, remove, clear, importJson, exportJson],
  );

  return <NoteVaultContext.Provider value={value}>{children}</NoteVaultContext.Provider>;
}

export function useNoteVault(): NoteVaultState {
  const ctx = useContext(NoteVaultContext);
  if (!ctx) throw new Error("useNoteVault must be used inside <NoteVaultProvider>");
  return ctx;
}
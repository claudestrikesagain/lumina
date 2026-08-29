import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ToastKind = "success" | "error" | "info" | "warning";

export type Toast = {
  id: number;
  kind: ToastKind;
  title: string;
  body?: string;
};

type ToastState = {
  toasts: Toast[];
  push: (kind: ToastKind, title: string, body?: string) => number;
  dismiss: (id: number) => void;
};

const ToastContext = createContext<ToastState | null>(null);

const AUTO_DISMISS_MS = 5000;
let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (kind: ToastKind, title: string, body?: string): number => {
      const id = nextId++;
      setToasts((prev) => [...prev, { id, kind, title, body }]);
      window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
      return id;
    },
    [dismiss],
  );

  const value = useMemo<ToastState>(
    () => ({ toasts, push, dismiss }),
    [toasts, push, dismiss],
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast(): ToastState {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
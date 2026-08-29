import { useToast } from "../context/ToastContext";

const KIND_STYLES: Record<string, string> = {
  success: "border-ink bg-paperEdge",
  error: "border-oxblood bg-oxbloodFaint",
  warning: "border-oxblood bg-oxbloodFaint",
  info: "border-rule bg-paperEdge",
};

const KIND_LABEL: Record<string, string> = {
  success: "Confirmed",
  error: "Error",
  warning: "Notice",
  info: "Info",
};

/** Renders all active toasts in a fixed bottom-right stack. */
export function ToastStack() {
  const { toasts, dismiss } = useToast();
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 w-80 max-w-[90vw] space-y-2"
      role="status"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`border-l-2 pl-3 pr-3 py-2 bg-paper ${KIND_STYLES[t.kind] ?? "border-rule"} animate-slide-up`}
        >
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-[0.16em] font-medium text-ink">
                {KIND_LABEL[t.kind] ?? t.kind}
              </p>
              <p className="text-[13px] text-ink mt-0.5">{t.title}</p>
              {t.body ? (
                <p className="text-[11px] text-inkSoft mt-1 whitespace-pre-wrap break-words">
                  {t.body}
                </p>
              ) : null}
            </div>
            <button
              className="text-inkFaint hover:text-ink text-[14px] leading-none"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
              type="button"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
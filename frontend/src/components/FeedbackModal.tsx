import { useState } from "react";
import { useUI } from "../context/UIContext";
import { useToast } from "../context/ToastContext";

const STORAGE_KEY = "lumina.feedback.v1";

type Feedback = {
  ts: string;
  rating: number;
  clarity: number;
  trust: number;
  intent: string;
  comments: string;
};

function readAll(): Feedback[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(items: Feedback[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

/**
 * Local-first feedback collector. Mirrors AuthZK's pattern: a small
 * structured form that writes to localStorage, with a CSV export for the
 * maintainer to grab later. No third-party service required.
 */
export function FeedbackModal() {
  const { feedbackOpen, closeFeedback } = useUI();
  const { push } = useToast();

  const [rating, setRating] = useState(5);
  const [clarity, setClarity] = useState(4);
  const [trust, setTrust] = useState(4);
  const [intent, setIntent] = useState("curious");
  const [comments, setComments] = useState("");

  if (!feedbackOpen) return null;

  function reset() {
    setRating(5);
    setClarity(4);
    setTrust(4);
    setIntent("curious");
    setComments("");
  }

  function submit() {
    const entry: Feedback = {
      ts: new Date().toISOString(),
      rating,
      clarity,
      trust,
      intent,
      comments,
    };
    const all = readAll();
    all.push(entry);
    writeAll(all);
    reset();
    closeFeedback();
    push("success", "Feedback saved locally");
  }

  function exportCsv() {
    const all = readAll();
    if (all.length === 0) {
      push("info", "No feedback to export yet");
      return;
    }
    const header = ["ts", "rating", "clarity", "trust", "intent", "comments"];
    const rows = all.map((f) =>
      [f.ts, f.rating, f.clarity, f.trust, f.intent, f.comments]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lumina-feedback-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    push("success", `Exported ${all.length} response${all.length === 1 ? "" : "s"}`);
  }

  return (
    <div
      className="fixed inset-0 z-40 bg-ink/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-title"
    >
      <div className="bg-paper border border-ink max-w-xl w-full max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="border-b border-rule px-6 py-4 flex items-baseline justify-between">
          <p className="eyebrow">Feedback · local</p>
          <button
            className="text-inkFaint hover:text-ink text-[14px]"
            onClick={closeFeedback}
            aria-label="Close"
            type="button"
          >
            ×
          </button>
        </div>
        <div className="px-6 py-6 space-y-5">
          <h2
            id="feedback-title"
            className="font-display text-[28px] leading-[1.1] tracking-[-0.02em]"
          >
            Help us improve Lumina.
          </h2>
          <p className="text-[12px] text-inkSoft max-w-[52ch]">
            Saved to this browser only. Export to CSV to share with the team.
            Nothing is uploaded.
          </p>

          <Stars label="Overall rating" value={rating} onChange={setRating} />
          <Stars
            label="Clarity of ZK explanation"
            value={clarity}
            onChange={setClarity}
          />
          <Stars
            label="Trust in the compliance model"
            value={trust}
            onChange={setTrust}
          />

          <label className="block">
            <span className="eyebrow block mb-2">Would you use this on mainnet?</span>
            <select
              className="w-full"
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
            >
              <option value="curious">Just curious</option>
              <option value="considering">Considering it</option>
              <option value="yes">Yes, when audited</option>
              <option value="no">No</option>
            </select>
          </label>

          <label className="block">
            <span className="eyebrow block mb-2">Comments (optional)</span>
            <textarea
              rows={4}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="What was confusing? What was missing?"
            />
          </label>
        </div>
        <div className="border-t border-rule px-6 py-3 flex justify-between">
          <button className="btn !py-1 !px-3 text-[10px]" onClick={exportCsv} type="button">
            Export CSV
          </button>
          <button className="btn btn-solid !py-1 !px-3 text-[10px]" onClick={submit} type="button">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function Stars({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <span className="eyebrow block mb-2">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className={`text-[20px] leading-none w-8 h-8 border ${
              n <= value ? "border-ink text-ink bg-paperEdge" : "border-rule text-inkFaint"
            }`}
            onClick={() => onChange(n)}
            aria-label={`${n} of 5`}
          >
            {n <= value ? "●" : "○"}
          </button>
        ))}
      </div>
    </div>
  );
}
import type { ReactNode } from "react";

export function Section({
  index,
  title,
  note,
  children,
}: {
  index: string;
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <section className="rule-top py-10 grid grid-cols-12 gap-x-6 gap-y-6">
      <header className="col-span-12 md:col-span-3">
        <p className="eyebrow">{index}</p>
        <h2 className="font-display text-[28px] leading-[1.1] tracking-[-0.02em] mt-1">
          {title}
        </h2>
        {note ? <p className="text-[13px] text-inkSoft mt-3 max-w-[26ch]">{note}</p> : null}
      </header>
      <div className="col-span-12 md:col-span-9">{children}</div>
    </section>
  );
}

export function Ledger({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <table className="ledger w-full">
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={label}>
            <td className="w-[38%] text-inkSoft uppercase text-micro tracking-[0.12em] pr-4">
              {label}
            </td>
            <td className="num text-ink break-all">{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="eyebrow block mb-2">{label}</span>
      {children}
      {hint ? <span className="block text-[12px] text-inkFaint mt-1.5">{hint}</span> : null}
    </label>
  );
}

/** Single accent use: state changes and rejections are marked in oxblood. */
export function Notice({
  kind = "neutral",
  title,
  children,
}: {
  kind?: "neutral" | "accent";
  title: string;
  children?: ReactNode;
}) {
  const accent = kind === "accent";
  return (
    <div
      className={`animate-fade border-l-2 pl-4 py-3 ${
        accent ? "border-oxblood bg-oxbloodFaint" : "border-ink bg-paperDeep"
      }`}
    >
      <p
        className={`text-micro uppercase tracking-[0.14em] font-medium ${
          accent ? "text-oxblood" : "text-ink"
        }`}
      >
        {title}
      </p>
      {children ? (
        <div className="text-[13px] text-inkSoft mt-2 whitespace-pre-wrap break-words font-mono leading-relaxed">
          {children}
        </div>
      ) : null}
    </div>
  );
}

export const truncate = (s: string, head = 6, tail = 6) =>
  s.length <= head + tail + 1 ? s : `${s.slice(0, head)}…${s.slice(-tail)}`;

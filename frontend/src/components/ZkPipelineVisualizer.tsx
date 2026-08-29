type Stage = 0 | 1 | 2 | 3 | 4;

const STAGES: Array<{ title: string; body: string; pending?: string }> = [
  {
    title: "Note + nullifier",
    body: "Browser holds (k, s, amount). nullifier = H(k) is computed locally.",
  },
  {
    title: "Commitment H(k, s, amt)",
    body: "Poseidon2 in the circuit, SHA-256 in today's contract. Both bind to the same leaf.",
  },
  {
    title: "Groth16 proof",
    body: "Proves: I know a leaf in this Merkle tree AND my key is not in the ASP set.",
  },
  {
    title: "On-chain verify",
    body: "BN254 pairing check. Pending CAP-0074 — currently stub-returns false.",
    pending: "Fail-closed",
  },
  {
    title: "Settlement",
    body: "Nullifier recorded, payout sent to recipient, pool debited.",
  },
];

/**
 * 5-stage ZK proof pipeline diagram. The `currentStage` prop highlights
 * stages up to and including the current one as the user progresses.
 */
export function ZkPipelineVisualizer({
  currentStage,
  hasNote,
}: {
  currentStage: Stage;
  hasNote: boolean;
}) {
  return (
    <section className="rule-top py-10">
      <header className="mb-6 flex items-baseline justify-between">
        <div>
          <p className="eyebrow">Pipeline</p>
          <h2 className="font-display text-[28px] leading-[1.1] tracking-[-0.02em] mt-1">
            How a withdrawal proof flows
          </h2>
        </div>
        <span className="text-[10px] uppercase tracking-[0.14em] text-inkFaint">
          stage {currentStage}/4
        </span>
      </header>

      <ol className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {STAGES.map((s, i) => {
          const reached = i <= currentStage && (currentStage > 0 || i === 0);
          const isStub = i === 3;
          return (
            <li
              key={s.title}
              className={`relative border p-4 transition-colors duration-200 ${
                reached
                  ? isStub
                    ? "border-oxblood bg-oxbloodFaint"
                    : "border-ink bg-paperEdge"
                  : "border-rule bg-paper"
              }`}
            >
              <div className="flex items-baseline justify-between mb-2">
                <span
                  className={`text-[10px] uppercase tracking-[0.14em] font-medium ${
                    reached ? (isStub ? "text-oxblood" : "text-ink") : "text-inkFaint"
                  }`}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                {reached ? (
                  <span
                    className={`status-dot ${
                      isStub ? "bg-oxblood animate-pulse-dot" : "status-dot-live"
                    }`}
                    aria-hidden
                  />
                ) : (
                  <span className="status-dot bg-inkFaint" aria-hidden />
                )}
              </div>
              <p
                className={`text-[13px] font-medium ${
                  reached ? "text-ink" : "text-inkSoft"
                }`}
              >
                {s.title}
              </p>
              <p className="text-[11px] text-inkSoft mt-2 leading-relaxed">{s.body}</p>
              {s.pending && reached ? (
                <p className="text-[10px] uppercase tracking-[0.14em] text-oxblood mt-3 font-medium">
                  · {s.pending}
                </p>
              ) : null}
              {!hasNote && i === 0 ? (
                <p className="text-[10px] uppercase tracking-[0.14em] text-inkFaint mt-3">
                  · load a note
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
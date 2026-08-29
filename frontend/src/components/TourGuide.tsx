import { useEffect, useState } from "react";
import { useUI } from "../context/UIContext";

const STEPS = [
  {
    title: "What is a ZK privacy pool?",
    body:
      "Deposits record only a cryptographic commitment. Withdrawals can come from any prior deposit. The chain cannot tell which.",
  },
  {
    title: "How the deposit note works",
    body:
      "When you deposit, this app generates a random (k, s) pair, computes commitment = H(k, s, amount), and sends only the commitment to the chain. The note JSON you save is the only proof of ownership.",
  },
  {
    title: "Why withdrawals fail today",
    body:
      "The on-chain Groth16 verifier is a fail-closed stub. Withdrawals are rejected with Error(Contract, #8) until BN254 host functions (CAP-0074) ship. The Proof Lab exercises this on-chain so you can verify.",
  },
  {
    title: "How compliance works without deanonymizing",
    body:
      "The withdrawal circuit proves two things: you know the preimage of a real leaf, AND your key is not in the ASP blocklist. The contract enforces the second property cryptographically.",
  },
];

/**
 * 4-step onboarding tour. Modal overlays the page. Auto-opens the first time
 * the user lands; can also be triggered from the header.
 */
export function TourGuide() {
  const { tourOpen, closeTour } = useUI();
  const [step, setStep] = useState(0);

  // Reset every time it opens.
  useEffect(() => {
    if (tourOpen) setStep(0);
  }, [tourOpen]);

  if (!tourOpen) return null;
  const s = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <div
      className="fixed inset-0 z-40 bg-ink/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
    >
      <div className="bg-paper border border-ink max-w-xl w-full animate-slide-up">
        <div className="border-b border-rule px-6 py-4 flex items-baseline justify-between">
          <p className="eyebrow">Tour · step {step + 1} of {STEPS.length}</p>
          <button
            className="text-inkFaint hover:text-ink text-[14px]"
            onClick={closeTour}
            aria-label="Close"
            type="button"
          >
            ×
          </button>
        </div>
        <div className="px-6 py-6">
          <h2
            id="tour-title"
            className="font-display text-[28px] leading-[1.1] tracking-[-0.02em]"
          >
            {s.title}
          </h2>
          <p className="text-[13px] text-ink mt-4 leading-relaxed">{s.body}</p>
        </div>
        <div className="border-t border-rule px-6 py-3 flex items-center justify-between">
          <div className="flex gap-1">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`block w-6 h-1 ${
                  i === step ? "bg-ink" : "bg-rule"
                }`}
                aria-hidden
              />
            ))}
          </div>
          <div className="flex gap-2">
            {step > 0 ? (
              <button
                className="btn !py-1 !px-3 text-[10px]"
                onClick={() => setStep((s) => s - 1)}
                type="button"
              >
                Back
              </button>
            ) : null}
            <button
              className="btn btn-solid !py-1 !px-3 text-[10px]"
              onClick={() => (last ? closeTour() : setStep((s) => s + 1))}
              type="button"
            >
              {last ? "Done" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
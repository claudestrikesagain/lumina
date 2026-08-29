import { NavLink } from "react-router-dom";
import { useWalletContext } from "../context/WalletContext";
import { usePoolContext } from "../context/PoolContext";
import { useUI } from "../context/UIContext";
import { isDeployed } from "../lib/contract";
import { truncate } from "./ui";

/**
 * Sticky top header. Lives outside the page-level scroll so navigation is
 * always reachable. Three regions:
 *   left  — product mark + network badge
 *   right — wallet pill + tour + feedback + verifier warning pill
 */
export function Header() {
  const { address, network, walletId, busy, connect, disconnect } = useWalletContext();
  const { root, aspRoot, loading, error } = usePoolContext();
  const { openTour, openFeedback } = useUI();

  return (
    <header className="sticky top-0 z-30 bg-paper/95 backdrop-blur-sm border-b border-rule">
      <div className="mx-auto max-w-report px-6 md:px-10 lg:px-14">
        <div className="flex items-center gap-4 h-14">
          {/* Brand */}
          <NavLink to="/" className="flex items-baseline gap-3 mr-auto">
            <span className="font-display text-[20px] leading-none tracking-[-0.02em]">
              Lumina
            </span>
            <span className="hidden sm:inline text-[10px] uppercase tracking-[0.18em] text-inkFaint">
              shielded pool
            </span>
          </NavLink>

          {/* Compliance indicator (only when deployed) */}
          {isDeployed() ? (
            <span
              className="hidden md:inline-flex pill"
              title={
                aspRoot
                  ? `ASP root: ${truncate(aspRoot, 8, 8)}`
                  : "ASP root unavailable"
              }
            >
              <span
                className={`status-dot ${
                  error ? "bg-oxblood" : aspRoot ? "status-dot-live" : "bg-inkFaint"
                }`}
                aria-hidden
              />
              <span>ASP {aspRoot ? "live" : "—"}</span>
            </span>
          ) : null}

          {/* Network */}
          <span className="hidden lg:inline pill" title={network ?? "Network not detected"}>
            {network ?? "Testnet"}
          </span>

          {/* Honest fail-closed warning. The plan calls this out specifically. */}
          <span
            className="hidden md:inline-flex pill border-oxblood text-oxblood bg-oxbloodFaint"
            title="On-chain Groth16 verifier is a fail-closed stub; withdrawals will always be rejected until CAP-0074 ships."
          >
            <span className="status-dot bg-oxblood" aria-hidden />
            Verifier · Stub
          </span>

          {/* Tour + feedback */}
          <button
            className="hidden sm:inline-flex btn !py-1 !px-3 text-[10px]"
            onClick={openTour}
            type="button"
          >
            Tour
          </button>
          <button
            className="hidden sm:inline-flex btn !py-1 !px-3 text-[10px]"
            onClick={openFeedback}
            type="button"
          >
            Feedback
          </button>

          {/* Wallet pill */}
          {address ? (
            <div className="flex items-center gap-2">
              <span
                className="pill !border-ink"
                title={`${address} (${walletId ?? "wallet"})`}
              >
                <span className="status-dot status-dot-live" aria-hidden />
                <span className="num">{truncate(address, 4, 4)}</span>
              </span>
              <button
                className="btn !py-1 !px-3 text-[10px]"
                onClick={() => void disconnect()}
                type="button"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              className="btn btn-solid !py-1 !px-3 text-[10px]"
              onClick={() => void connect()}
              disabled={busy}
              type="button"
            >
              {busy ? "Connecting" : "Connect"}
            </button>
          )}
        </div>

        {/* Sub-row: live roots + reload status. Visible on lg+. */}
        {isDeployed() ? (
          <div className="hidden lg:flex items-center gap-6 h-9 text-[11px] text-inkFaint border-t border-ruleFaint">
            <span className="flex items-center gap-2">
              <span className="eyebrow !text-inkFaint">Root</span>
              <span className="num text-inkSoft">{root ? truncate(root, 10, 10) : "—"}</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="eyebrow !text-inkFaint">ASP root</span>
              <span className="num text-inkSoft">
                {aspRoot ? truncate(aspRoot, 10, 10) : "—"}
              </span>
            </span>
            <span className="ml-auto eyebrow !text-inkFaint">
              {loading ? "Reading…" : "Polling 30s"}
            </span>
          </div>
        ) : null}
      </div>
    </header>
  );
}
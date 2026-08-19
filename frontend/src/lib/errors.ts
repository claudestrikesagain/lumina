/**
 * One place that classifies every error this app can hit into a small,
 * user-facing set of kinds. Used by the wallet layer and the XLM send flow
 * so the UI can show "wallet not found" vs "you rejected it" vs
 * "insufficient balance" as genuinely distinct states, not one grey error
 * box for everything.
 */
export type AppErrorKind =
  | "wallet-not-found"
  | "rejected"
  | "insufficient-balance"
  | "network"
  | "unknown";

export class AppError extends Error {
  kind: AppErrorKind;
  constructor(kind: AppErrorKind, message: string) {
    super(message);
    this.kind = kind;
  }
}

function msgOf(err: unknown): string {
  if (!err) return "";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && "message" in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === "string") return m;
  }
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

/** Classifies an arbitrary thrown value from a wallet call into an AppError. */
export function classifyWalletError(err: unknown): AppError {
  const msg = msgOf(err);
  const low = msg.toLowerCase();
  if (
    low.includes("not installed") ||
    low.includes("not available") ||
    low.includes("no wallet") ||
    low.includes("not detected") ||
    low.includes("not found")
  ) {
    return new AppError("wallet-not-found", msg || "Wallet extension not found.");
  }
  if (
    low.includes("declin") ||
    low.includes("reject") ||
    low.includes("user cancel") ||
    low.includes("denied")
  ) {
    return new AppError("rejected", msg || "The wallet rejected the request.");
  }
  return new AppError("unknown", msg || "Unknown wallet error.");
}

/** Classifies a Horizon/RPC submission failure (payments, contract calls). */
export function classifyTxError(err: unknown): AppError {
  const msg = msgOf(err);
  const low = msg.toLowerCase();
  if (
    low.includes("op_underfunded") ||
    low.includes("insufficient") ||
    low.includes("tx_insufficient_balance") ||
    low.includes("underfunded")
  ) {
    return new AppError(
      "insufficient-balance",
      "Insufficient XLM balance to cover this amount plus the network fee.",
    );
  }
  if (
    low.includes("declin") ||
    low.includes("reject") ||
    low.includes("user cancel") ||
    low.includes("denied")
  ) {
    return new AppError("rejected", msg || "You rejected the transaction in your wallet.");
  }
  if (low.includes("network") || low.includes("fetch") || low.includes("timeout")) {
    return new AppError("network", msg || "Network error talking to the Stellar RPC/Horizon endpoint.");
  }
  return new AppError("unknown", msg || "Unknown transaction error.");
}

export const errorLabel: Record<AppErrorKind, string> = {
  "wallet-not-found": "Wallet not found",
  rejected: "Rejected",
  "insufficient-balance": "Insufficient balance",
  network: "Network error",
  unknown: "Error",
};

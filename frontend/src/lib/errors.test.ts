import { describe, expect, it } from "vitest";
import { classifyTxError, classifyWalletError } from "./errors";

describe("classifyWalletError", () => {
  it("classifies a missing extension as wallet-not-found", () => {
    expect(classifyWalletError(new Error("Freighter not detected")).kind).toBe(
      "wallet-not-found",
    );
  });

  it("classifies a user decline as rejected", () => {
    expect(classifyWalletError(new Error("User declined access")).kind).toBe("rejected");
  });

  it("falls back to unknown for an unrecognized message", () => {
    expect(classifyWalletError(new Error("something exploded")).kind).toBe("unknown");
  });
});

describe("classifyTxError", () => {
  it("classifies an underfunded payment as insufficient-balance", () => {
    expect(classifyTxError(new Error("op_underfunded")).kind).toBe("insufficient-balance");
  });

  it("classifies a signer rejection as rejected", () => {
    expect(classifyTxError(new Error("User rejected the transaction")).kind).toBe("rejected");
  });

  it("classifies a fetch failure as network", () => {
    expect(classifyTxError(new Error("network request failed")).kind).toBe("network");
  });
});

import { describe, expect, it } from "vitest";
import { bytesToHex, fromStroops, hexToBytes, toStroops } from "./contract";

describe("toStroops / fromStroops", () => {
  it("round-trips a decimal XLM amount to stroops and back", () => {
    expect(toStroops("100.0000000")).toBe(1_000_000_000n);
    expect(fromStroops(1_000_000_000n)).toBe("100.0000000");
  });

  it("rejects non-positive or garbage amounts", () => {
    expect(() => toStroops("0")).toThrow();
    expect(() => toStroops("-5")).toThrow();
    expect(() => toStroops("abc")).toThrow();
    expect(() => toStroops("")).toThrow();
  });

  it("truncates (does not round) fractional stroops beyond 7 decimals", () => {
    expect(toStroops("1.00000009")).toBe(10_000_000n);
  });
});

describe("hexToBytes / bytesToHex", () => {
  it("round-trips a 32-byte hex string", () => {
    const hex = "11".repeat(32);
    const bytes = hexToBytes(hex, 32);
    expect(bytes.length).toBe(32);
    expect(bytesToHex(bytes)).toBe(hex);
  });

  it("rejects a value that is not exactly the expected length", () => {
    expect(() => hexToBytes("1122", 32)).toThrow();
  });

  it("rejects non-hex characters", () => {
    expect(() => hexToBytes("zz".repeat(32), 32)).toThrow();
  });
});

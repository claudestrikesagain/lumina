/**
 * Every stellar-sdk / Soroban call in this app lives here.
 * Mirrors contracts/lumina_pool/src/lib.rs exactly — no invented functions.
 */
import {
  Contract,
  TransactionBuilder,
  nativeToScVal,
  rpc,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";
// stellar-sdk's xdr types take Buffer; `buffer` ships with the SDK.
import { Buffer } from "buffer";

export const CONTRACT_ID = (import.meta.env.VITE_CONTRACT_ID ?? "").trim();
export const RPC_URL = (
  import.meta.env.VITE_RPC_URL ?? "https://soroban-testnet.stellar.org"
).trim();
export const NETWORK_PASSPHRASE = (
  import.meta.env.VITE_NETWORK_PASSPHRASE ?? "Test SDF Network ; September 2015"
).trim();

export const isDeployed = () => CONTRACT_ID.length > 0;

/** Placeholder source account used for read-only simulations. */
const NULL_ACCOUNT = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

const server = () => new rpc.Server(RPC_URL, { allowHttp: RPC_URL.startsWith("http://") });

function requireDeployed(): string {
  if (!isDeployed()) {
    throw new Error("VITE_CONTRACT_ID is not set — the pool contract is not deployed.");
  }
  return CONTRACT_ID;
}

// ---------------------------------------------------------------- conversions

export const STROOPS = 10_000_000n;

export function toStroops(amount: string): bigint {
  const t = amount.trim();
  if (!t || Number.isNaN(Number(t)) || Number(t) <= 0) {
    throw new Error("Enter a positive amount.");
  }
  const [whole, frac = ""] = t.split(".");
  return BigInt(whole || "0") * STROOPS + BigInt(frac.padEnd(7, "0").slice(0, 7) || "0");
}

export function fromStroops(v: bigint): string {
  const neg = v < 0n;
  const a = neg ? -v : v;
  const s = `${a / STROOPS}.${(a % STROOPS).toString().padStart(7, "0")}`;
  return (neg ? "-" : "") + s;
}

export function hexToBytes(hex: string, expectedLen = 32): Uint8Array {
  const clean = hex.trim().replace(/^0x/, "");
  if (!/^[0-9a-fA-F]*$/.test(clean) || clean.length % 2 !== 0) {
    throw new Error("Value must be hexadecimal.");
  }
  if (expectedLen > 0 && clean.length !== expectedLen * 2) {
    throw new Error(`Value must be ${expectedLen} bytes (${expectedLen * 2} hex characters).`);
  }
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export function bytesToHex(b: Uint8Array | Buffer): string {
  return Array.from(b as Uint8Array)
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}

const bytesN32 = (hex: string): xdr.ScVal =>
  xdr.ScVal.scvBytes(Buffer.from(hexToBytes(hex, 32)));

const bytesAny = (hex: string): xdr.ScVal =>
  xdr.ScVal.scvBytes(Buffer.from(hexToBytes(hex, 0)));

// ------------------------------------------------------------------ read path

async function simulate(fn: string, args: xdr.ScVal[], source = NULL_ACCOUNT) {
  const id = requireDeployed();
  const s = server();
  const account = await s.getAccount(source);
  const tx = new TransactionBuilder(account, {
    fee: "100000",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(new Contract(id).call(fn, ...args))
    .setTimeout(30)
    .build();

  const sim = await s.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) throw new Error(sim.error);
  const retval = "result" in sim && sim.result?.retval ? sim.result.retval : undefined;
  return { tx, sim, value: retval ? scValToNative(retval) : undefined };
}

/** `get_root() -> BytesN<32>` — current commitment-tree root. */
export async function getRoot(): Promise<string> {
  const { value } = await simulate("get_root", []);
  return bytesToHex(value as Uint8Array);
}

/** `get_asp_root() -> BytesN<32>` — registered ASP exclusion root. */
export async function getAspRoot(): Promise<string> {
  const { value } = await simulate("get_asp_root", []);
  return bytesToHex(value as Uint8Array);
}

/** `is_known_root(root) -> bool`. */
export async function isKnownRoot(rootHex: string): Promise<boolean> {
  const { value } = await simulate("is_known_root", [bytesN32(rootHex)]);
  return Boolean(value);
}

/** `is_nullifier_spent(nullifier) -> bool`. */
export async function isNullifierSpent(nullifierHex: string): Promise<boolean> {
  const { value } = await simulate("is_nullifier_spent", [bytesN32(nullifierHex)]);
  return Boolean(value);
}

// ----------------------------------------------------------------- write path

export type Signer = (xdrString: string) => Promise<string>;

async function invoke(
  fn: string,
  args: xdr.ScVal[],
  source: string,
  sign: Signer,
): Promise<{ hash: string; value: unknown }> {
  const id = requireDeployed();
  const s = server();
  const account = await s.getAccount(source);
  const built = new TransactionBuilder(account, {
    fee: "1000000",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(new Contract(id).call(fn, ...args))
    .setTimeout(60)
    .build();

  const sim = await s.simulateTransaction(built);
  if (rpc.Api.isSimulationError(sim)) throw new Error(sim.error);

  const prepared = rpc.assembleTransaction(built, sim).build();
  const signed = await sign(prepared.toXDR());
  const send = await s.sendTransaction(
    TransactionBuilder.fromXDR(signed, NETWORK_PASSPHRASE),
  );
  if (send.status === "ERROR") {
    throw new Error(`Submission rejected: ${JSON.stringify(send.errorResult ?? send)}`);
  }

  for (let i = 0; i < 60; i++) {
    const got = await s.getTransaction(send.hash);
    if (got.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      const retval = got.returnValue ? scValToNative(got.returnValue) : undefined;
      return { hash: send.hash, value: retval };
    }
    if (got.status === rpc.Api.GetTransactionStatus.FAILED) {
      throw new Error(
        `Transaction ${send.hash} failed on-chain: ${JSON.stringify(got.resultXdr ?? "")}`,
      );
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Transaction ${send.hash} not confirmed within 60s.`);
}

/**
 * `deposit(depositor, amount: i128, commitment: BytesN<32>) -> u32`
 * Returns the leaf index assigned to the commitment.
 */
export async function deposit(
  depositor: string,
  amountStroops: bigint,
  commitmentHex: string,
  sign: Signer,
): Promise<{ hash: string; leafIndex: number }> {
  const { hash, value } = await invoke(
    "deposit",
    [
      nativeToScVal(depositor, { type: "address" }),
      nativeToScVal(amountStroops, { type: "i128" }),
      bytesN32(commitmentHex),
    ],
    depositor,
    sign,
  );
  return { hash, leafIndex: Number(value ?? 0) };
}

/**
 * `withdraw(proof: Bytes, merkle_root, asp_root, nullifier, recipient, amount: i128)`
 * The on-chain verifier is a fail-closed stub, so this is expected to be
 * rejected with Error(Contract, #8) InvalidProof until BN254 host functions ship.
 */
export async function withdraw(
  params: {
    proofHex: string;
    merkleRootHex: string;
    aspRootHex: string;
    nullifierHex: string;
    recipient: string;
    amountStroops: bigint;
  },
  source: string,
  sign: Signer,
): Promise<{ hash: string }> {
  const { hash } = await invoke(
    "withdraw",
    [
      bytesAny(params.proofHex),
      bytesN32(params.merkleRootHex),
      bytesN32(params.aspRootHex),
      bytesN32(params.nullifierHex),
      nativeToScVal(params.recipient, { type: "address" }),
      nativeToScVal(params.amountStroops, { type: "i128" }),
    ],
    source,
    sign,
  );
  return { hash };
}

/** Maps contracts/lumina_pool Error variants onto readable text. */
export function describeError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const codes: Record<string, string> = {
    "#1": "AlreadyInitialized — the pool has already been initialized.",
    "#2": "NotInitialized — the pool contract has not been initialized.",
    "#3": "Paused — the admin has paused deposits and withdrawals.",
    "#4": "TreeFull — the commitment tree has no free leaves left.",
    "#5": "UnknownRoot — the merkle root is not in the accepted root history.",
    "#6": "StaleAspRoot — the ASP root does not match the registered one.",
    "#7": "NullifierSpent — this note has already been withdrawn.",
    "#8": "InvalidProof — the on-chain Groth16 verifier rejected the proof.",
    "#9": "NotAdmin — caller is not the pool admin.",
  };
  for (const [code, text] of Object.entries(codes)) {
    if (msg.includes(`Error(Contract, ${code})`)) return `${text}\n\n${msg}`;
  }
  return msg;
}

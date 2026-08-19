/**
 * Note construction. The circuit specifies Poseidon2, but the deployed
 * contract still hashes with SHA-256 (see poseidon2() in lib.rs), so this
 * uses SHA-256 to match what is actually on-chain. Labelled as such in the UI.
 */
import { bytesToHex, hexToBytes } from "./contract";

export type Note = {
  nullifierSeed: string; // k, 32-byte hex
  secret: string; // s, 32-byte hex
  amount: string; // stroops, decimal string
  commitment: string; // H(k || s || amount_i128_be)
  leafIndex?: number;
};

const randomHex32 = () => bytesToHex(crypto.getRandomValues(new Uint8Array(32)));

async function sha256(...parts: Uint8Array[]): Promise<string> {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const buf = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    buf.set(p, o);
    o += p.length;
  }
  return bytesToHex(new Uint8Array(await crypto.subtle.digest("SHA-256", buf)));
}

function i128BE(v: bigint): Uint8Array {
  const out = new Uint8Array(16);
  let x = v < 0n ? (1n << 128n) + v : v;
  for (let i = 15; i >= 0; i--) {
    out[i] = Number(x & 0xffn);
    x >>= 8n;
  }
  return out;
}

/** commitment = H(k, s, amount) — the leaf inserted by `deposit`. */
export async function createNote(amountStroops: bigint): Promise<Note> {
  const nullifierSeed = randomHex32();
  const secret = randomHex32();
  const commitment = await sha256(
    hexToBytes(nullifierSeed),
    hexToBytes(secret),
    i128BE(amountStroops),
  );
  return { nullifierSeed, secret, amount: amountStroops.toString(), commitment };
}

/** nullifier = H(k) — the double-spend tag revealed by `withdraw`. */
export async function nullifierOf(note: Pick<Note, "nullifierSeed">): Promise<string> {
  return sha256(hexToBytes(note.nullifierSeed));
}

export const serializeNote = (n: Note) => JSON.stringify(n, null, 2);

export function parseNote(text: string): Note {
  const raw = JSON.parse(text) as Partial<Note>;
  for (const k of ["nullifierSeed", "secret", "amount", "commitment"] as const) {
    if (!raw[k]) throw new Error(`Note is missing "${k}".`);
  }
  hexToBytes(raw.nullifierSeed!);
  hexToBytes(raw.secret!);
  hexToBytes(raw.commitment!);
  BigInt(raw.amount!);
  return raw as Note;
}

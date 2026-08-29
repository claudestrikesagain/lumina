import { useState } from "react";
import { createNote, nullifierOf } from "../lib/note";
import { CONTRACT_ID } from "../lib/contract";
import { Field, Ledger, Section, truncate } from "../components/ui";

/**
 * Developer reference: contract interface, note format, hash-function note,
 * live commitment-derivation tool, and code snippets. Everything here is
 * verifiable against contracts/lumina_pool/src/lib.rs.
 */
export function DevelopersPage() {
  return (
    <>
      <header className="pb-8 border-b border-rule">
        <p className="eyebrow">Reference</p>
        <h1 className="font-display text-[44px] md:text-[56px] leading-[0.98] tracking-[-0.03em] mt-2">
          Developers
        </h1>
        <p className="text-[14px] text-inkSoft mt-3 max-w-[60ch]">
          Contract interface, note format, hash-function note, and a live
          commitment-derivation tool. Everything here mirrors{" "}
          <code className="font-mono">contracts/lumina_pool/src/lib.rs</code>{" "}
          — no invented functions.
        </p>
      </header>

      <Section
        index="Contract"
        title="Interface"
        note="Public entrypoints exposed by lumina_pool on Stellar Testnet."
      >
        <Ledger
          rows={[
            ["Contract id", CONTRACT_ID || "—"],
            [
              "stellar.expert",
              <a
                key="se"
                href={`https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID}`}
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                open ↗
              </a>,
            ],
            ["Network", "Testnet (Test SDF Network ; September 2015)"],
            ["Soroban SDK", "=22.0.1"],
          ]}
        />

        <div className="mt-6">
          <p className="eyebrow mb-3">Public functions</p>
          <table className="ledger w-full">
            <tbody>
              <Row fn="initialize(admin, asp_root)" reads="—" writes="—" />
              <Row fn="deposit(depositor, amount: i128, commitment: BytesN<32>) -> u32" reads="—" writes="leaf_index, root_history" />
              <Row fn="withdraw(proof: Bytes, merkle_root, asp_root, nullifier, recipient, amount: i128)" reads="nullifier_set" writes="nullifier_set" />
              <Row fn="get_root() -> BytesN<32>" reads="current_root" writes="—" />
              <Row fn="get_asp_root() -> BytesN<32>" reads="asp_root" writes="—" />
              <Row fn="is_known_root(root) -> bool" reads="root_history" writes="—" />
              <Row fn="is_nullifier_spent(nullifier) -> bool" reads="nullifier_set" writes="—" />
              <Row fn="set_paused(paused)" reads="—" writes="paused" />
              <Row fn="update_asp_root(new_root)" reads="—" writes="asp_root" />
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        index="Note"
        title="Note format"
        note="Client-side. Never sent to the contract."
      >
        <Ledger
          rows={[
            ["nullifierSeed", "k · 32-byte hex"],
            ["secret", "s · 32-byte hex"],
            ["amount", "stroops · decimal string"],
            ["commitment", "H(k, s, amount) · 32-byte hex"],
            ["leafIndex", "u32 · assigned on-chain after deposit"],
          ]}
        />
        <p className="text-[12px] text-inkSoft mt-4 max-w-[64ch]">
          The commitment is what the contract stores. The nullifier seed k is
          the secret you keep: its SHA-256 hash (nullifier = H(k)) is what
          reveals the spender at withdrawal time without linking back to the
          deposit.
        </p>
      </Section>

      <Section
        index="Hash"
        title="Hash function note"
        note="Honest about the deployed contract vs. the target circuit."
      >
        <div className="grid grid-cols-12 gap-x-6 gap-y-6 text-[13px] text-inkSoft">
          <div className="col-span-12 md:col-span-6">
            <p className="eyebrow text-ink mb-2">Today (deployed)</p>
            <p>
              The contract uses <code className="font-mono">SHA-256</code> for
              commitment derivation, as a placeholder for the Poseidon2 the
              circuit will use. This is documented in the contract source and
              on the Compliance page.
            </p>
          </div>
          <div className="col-span-12 md:col-span-6">
            <p className="eyebrow text-ink mb-2">Target (circuit)</p>
            <p>
              The withdrawal circuit is designed for <code className="font-mono">Poseidon2</code> over BN254, consistent with the BN254
              pairing check in the verifier. Migration is gated on CAP-0075
              (Poseidon2 host functions).
            </p>
          </div>
        </div>
      </Section>

      <Section
        index="Tool"
        title="Derive a commitment"
        note="Same SHA-256 path as the deployed contract. No values leave your browser."
      >
        <DeriveTool />
      </Section>

      <Section
        index="Snippets"
        title="Code snippets"
        note="TypeScript / JS. Mirrors src/lib/note.ts."
      >
        <pre className="bg-paperDeep border border-rule p-4 text-[12px] font-mono text-ink overflow-x-auto whitespace-pre">
{`// Deposit
import { createNote } from "./lib/note";
import { deposit, toStroops } from "./lib/contract";

const note = await createNote(toStroops("100"));
await deposit(address, toStroops("100"), note.commitment, sign);

// Look up nullifier status
import { nullifierOf } from "./lib/note";
import { isNullifierSpent } from "./lib/contract";

const nf = await nullifierOf(note);
const spent = await isNullifierSpent(nf);`}
        </pre>
      </Section>

      <Section index="Layout" title="Storage layout">
        <pre className="bg-paperDeep border border-rule p-4 text-[12px] font-mono text-ink overflow-x-auto whitespace-pre-wrap break-words">
{`Instance storage
├── admin: Address            # deployer
├── paused: bool
├── asp_root: BytesN<32>       # Association Set Provider blocklist root
├── current_root: BytesN<32>   # commitment-tree root
├── next_index: u32            # next leaf index to assign
├── leaves: Map<u32, BytesN<32>>
├── root_history: RingBuffer<BytesN<32>>
├── nullifier_set: Set<BytesN<32>>
└── pool_token: Address`}
        </pre>
      </Section>

      <Section index="Tests" title="Tests">
        <p className="text-[13px] text-inkSoft max-w-[60ch]">
          Five Rust tests cover happy-path deposit, paused deposit, unknown
          root, non-admin ASP update, and fail-closed stub proof. Twelve
          Vitest tests cover stroop/hex conversion and error classification.
          All run on <code className="font-mono">cargo test</code> and{" "}
          <code className="font-mono">npm test</code>.
        </p>
      </Section>
    </>
  );
}

function Row({ fn, reads, writes }: { fn: string; reads: string; writes: string }) {
  return (
    <tr>
      <td className="font-mono text-[12px] text-ink">{truncate(fn, 60, 8)}</td>
      <td className="text-[11px] text-inkSoft">{reads}</td>
      <td className="text-[11px] text-inkSoft">{writes}</td>
    </tr>
  );
}

function DeriveTool() {
  const [seed, setSeed] = useState("");
  const [secret, setSecret] = useState("");
  const [amount, setAmount] = useState("");
  const [out, setOut] = useState<{ commitment: string; nullifier: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const a = BigInt(amount);
      const n = await createNote(a);
      const nf = await nullifierOf(n);
      setOut({ commitment: n.commitment, nullifier: nf });
      // Populate the inputs with the values that were actually used so the
      // user can verify deterministically.
      setSeed(n.nullifierSeed);
      setSecret(n.secret);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid grid-cols-12 gap-x-6 gap-y-4">
      <div className="col-span-12 md:col-span-6 space-y-3">
        <Field label="Amount (stroops)">
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="1000000000"
            inputMode="numeric"
            disabled={busy}
          />
        </Field>
        <button
          className="btn"
          onClick={() => void run()}
          disabled={busy || !amount}
          type="button"
        >
          {busy ? "Deriving" : "Generate & derive"}
        </button>
        <p className="text-[11px] text-inkFaint">
          Generates a fresh random (k, s), then computes H(k, s, amt) and
          H(k). Mirrors the deployed contract.
        </p>
      </div>
      <div className="col-span-12 md:col-span-6 space-y-3">
        <Field label="Nullifier seed k">
          <input value={seed} readOnly placeholder="generated" />
        </Field>
        <Field label="Secret s">
          <input value={secret} readOnly placeholder="generated" />
        </Field>
        {out ? (
          <div className="space-y-2">
            <div>
              <p className="eyebrow mb-1">Commitment H(k, s, amt)</p>
              <p className="text-[12px] font-mono text-ink break-all border border-rule p-2 bg-paperEdge">
                {out.commitment}
              </p>
            </div>
            <div>
              <p className="eyebrow mb-1">Nullifier H(k)</p>
              <p className="text-[12px] font-mono text-ink break-all border border-rule p-2 bg-paperEdge">
                {out.nullifier}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
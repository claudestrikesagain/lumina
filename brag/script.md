# Lumina — 60s Explainer (Hyperframes Script)

**Goal:** Explain Lumina — a Soroban privacy pool with configurable compliance — in 60 seconds.

**Audience:** Privacy-conscious crypto users, institutional compliance teams, regulators.

**Tone:** Quiet, technical, ethical. Cool palette. Big-text rhythm.

---

## Beat 1 (0–8s) — Problem

**Visual:** A balance, slowly tipping. Counter: "$2B stolen in 2024 due to transparent ledgers." A hacker silhouette fades.

**VO:** "Two billion dollars stolen in 2024. Public ledgers don't just empower users — they empower attackers."

**On-screen text:** *"$2B stolen in 2024 • public ledger = target"*

**Palette:** Lumina brand — `#0A0E1A` ink, `#7C5CFF` violet, `#5EE6C8` mint.

---

## Beat 2 (8–20s) — Solution

**Visual:** A note animates open. "Deposit: 100 XLM, commitment `0x9f3e...`". Then a withdrawal from a different wallet: same amount, unlinkable. An ASP root blocklist flashes on the right.

**VO:** "Lumina is a Soroban privacy pool. Deposit XLM, get a private note. Withdraw from any wallet, unlinkable to the deposit. The compliance team controls the blocklist."

**On-screen text:** *"Shielded deposit • unlinkable withdraw • compliance root"*

---

## Beat 3 (20–35s) — Architecture

**Visual:** 4-box diagram: User → commitment tree → pool → ASP root. Withdraw path overlays: nullifier check, merkle root check, ASP blocklist check, Groth16 verifier (with a "host-functions pending" chip on the verifier box).

**VO:** "Five Rust tests cover the deposit and the failed-withdraw path. The Groth16 verifier returns false until BN254 host functions ship — by design. The shield still works. The withdraw correctly fails closed."

**On-screen text:** *"5 tests • nullifier set • fails closed until CAP-0074"*

---

## Beat 4 (35–50s) — Live Demo (on testnet)

**Visual:** Screen capture: connect Freighter → mint a deposit note → call deposit → watch the leaf animate into the tree. Then call withdraw with the stub proof → see "InvalidProof" revert.

**VO:** "Live on testnet. Deposit, watch the tree, attempt to withdraw with a stub proof, see the contract reject it cleanly. Privacy + accountability in one contract."

**On-screen text:** *"`CA2WN724TV7ID5DVGAAYNEHPQRAAYTKGGKO436R5AKGHGN5ZR6VXJOVE`"*

---

## Beat 5 (50–60s) — Closer

**Visual:** The balance from beat 1 re-levels. A small "✓ ASP" badge appears next to a regulatory tag. Bottom right: "Privacy with proof."

**VO:** "Privacy with proof. Once BN254 host functions ship, the real verifier swaps in — no other code changes. Open-source. MIT. Lumina is hiring ASP partners."

**On-screen text:** *"github.com/yourorg/lumina — privacy with proof"*

---

## Render notes

- Aspect 16:9
- BGMs: ambient pad, no percussion (≤15% under VO)
- Type: a clean sans (Inter)
- Accent: violet→mint gradient
- Hyperframes: tree-insert animation for the commitment leaf

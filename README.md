# Lumina

**Institutional ZK Privacy Pools with Configurable Compliance** — a shielded
liquidity pool on Stellar/Soroban.

## What this is

Lumina is a shielded pool where withdrawal requires proving two things in
zero knowledge: (1) ownership of a valid deposit note, and (2) that the
withdrawing key is **not** on a configurable, third-party-maintained
blocklist (an Association Set Provider root). Compliance is enforced
on-chain, cryptographically, without deanonymizing the user or requiring the
contract to know who is withdrawing. See [ARCHITECTURE](#architecture)
below for the full design.

**Honesty up front:** deposits work end-to-end, for real, on Stellar
Testnet today. Withdrawals are cryptographically enforced to never succeed
yet — the on-chain proof verifier is a disclosed, tested, fail-closed stub,
because it depends on BN254 pairing-check host functions (CAP-0074) that
are not live on any Stellar network as of this writing. That tradeoff is
documented everywhere it matters (code comments, tests, this README) rather
than hidden. See [deployments/TESTNET.md](deployments/TESTNET.md) for the
real proof of both halves.

## Setup / run locally

Contract:

```bash
cd contracts
cargo test                                        # 5 tests, all passing
cargo build --target wasm32v1-none --release -p lumina_pool
```

Frontend:

```bash
cd frontend
npm install
cp .env.example .env      # fill VITE_CONTRACT_ID with a deployed contract id
npm test                                          # 12 tests, all passing
npm run dev
```

The app refuses to pretend a contract exists: with `VITE_CONTRACT_ID` empty
it shows an explicit "not deployed" state instead of a fake balance.

## Submission checklist — Stellar Builder Challenge

Checked only where there's something verifiable attached. Unchecked items
are genuinely open, not hedged.

### Level 1 — White Belt

- [x] Freighter wallet on Stellar Testnet — plus 4 more wallets via
  StellarWalletsKit (see Level 2).
- [x] Wallet connect + disconnect — `frontend/src/lib/wallet.ts`.
- [x] Fetch & display connected wallet's XLM balance —
  `frontend/src/lib/xlm.ts` (`getXlmBalance`), shown in
  `frontend/src/components/Wallet.tsx`.
- [x] Send an XLM transaction on testnet with success/fail feedback and a
  tx hash — `sendXlm()` in `lib/xlm.ts`, rendered in `Wallet.tsx`.
- [x] 10+ meaningful commits — 10 as of this writing (`git log --oneline`),
  each a real, distinct change (not padding); see the log itself.
- [ ] Screenshots (wallet connected, balance displayed, successful tx) —
  **open**, needs a real browser with a wallet extension. Checklist and
  exact steps in [docs/SCREENSHOTS.md](docs/SCREENSHOTS.md).

### Level 2 — Yellow Belt

- [x] StellarWalletsKit (multi-wallet) — Freighter, xBull, Albedo, Rabet,
  LOBSTR wired in `lib/wallet.ts`. (WalletConnect intentionally left out —
  it needs a hosted relay project id this app doesn't have; a wallet option
  that's wired in but broken is worse than one left out with a note.)
- [x] 3 distinct error types handled — `lib/errors.ts` classifies every
  wallet/tx failure into `wallet-not-found`, `rejected`,
  `insufficient-balance`, `network`, or `unknown`, and each renders
  differently in the UI (see `Wallet.tsx`'s connect and send flows).
- [x] Real smart contract deployed on testnet — `lumina_pool` at
  [`CDZIUC3ANI7PVGHENJ4X54GI2XGTFVRNO3JASFADKSL6W2W7ETZIHLOB`](https://stellar.expert/explorer/testnet/contract/CDZIUC3ANI7PVGHENJ4X54GI2XGTFVRNO3JASFADKSL6W2W7ETZIHLOB).
- [x] Contract called from the frontend, read + write — `get_root` /
  `get_asp_root` (read) and `deposit` (write) all called live from
  `PoolState.tsx` / `Deposit.tsx` against the deployed contract.
- [x] Verifiable tx hash of a contract call — real testnet `deposit`:
  [`5385425d285e9f1967d6af556c092baa3090a7ad4aaa920669f1ab69ca543262`](https://stellar.expert/explorer/testnet/tx/5385425d285e9f1967d6af556c092baa3090a7ad4aaa920669f1ab69ca543262).
  Full record with amounts and before/after state in
  [deployments/TESTNET.md](deployments/TESTNET.md).
- [x] Transaction status visible (pending/success/fail) — every
  invoke/submit path in `lib/contract.ts` and `lib/xlm.ts` polls to a
  terminal state and the components render busy/success/error explicitly.
- [~] Event listening / real-time state sync — `PoolState.tsx` re-reads
  contract state by simulation after every deposit (`reloadKey`), which is
  real-time from the user's own actions. It does **not** yet subscribe to
  on-chain events from *other* users' deposits — that's Level 3's "event
  streaming" requirement, tracked below, not claimed done here.
- [ ] Screenshot: wallet options available — open, see
  [docs/SCREENSHOTS.md](docs/SCREENSHOTS.md).

### Level 3 — Orange Belt

- [x] Tests for contract — 5 passing (`cargo test`): reject path
  (unknown root, non-admin, paused), real happy path (actual token
  transfer + tree-root change, not a mocked success), and the fail-closed
  proof-stub path. See `contracts/lumina_pool/src/lib.rs`.
- [x] Tests for frontend (3+ passing) — 12 passing (`npm test` in
  `frontend/`, Vitest): `lib/contract.test.ts` (stroops conversion, hex
  round-trip, reject-path on garbage input) and `lib/errors.test.ts`
  (each error classification actually returns the right kind).
- [x] CI/CD pipeline — `.github/workflows/ci.yml` runs `cargo test` +
  wasm build, and `npm test` + `tsc` + `vite build`, on every push/PR. Not yet exercised
  against a real GitHub remote from this environment — push and confirm a
  green run for the screenshot in
  [docs/SCREENSHOTS.md](docs/SCREENSHOTS.md).
- [x] Mobile-responsive frontend — Tailwind 12-column grid throughout
  (`col-span-12` default, `md:col-span-N` above tablet width), no
  fixed-width containers; not yet screenshotted on a real device (see
  screenshot checklist).
- [x] Error handling & loading states — every read/write path has explicit
  busy/error/success states (`Wallet.tsx`, `Deposit.tsx`, `Withdraw.tsx`,
  `PoolState.tsx`); errors are typed and human-readable, not raw exception
  dumps.
- [ ] Inter-contract communication — the pool calls the token SAC
  (`soroban_sdk::token::Client`), which is a real cross-contract call, but
  there's no second *application* contract to call. Marking this open
  rather than stretching the token-transfer call to count.
- [ ] Event streaming & real-time updates (beyond your own actions) — open,
  see the Level 2 note above.
- [ ] Demo video (1-2 min) — **open, human-only.** Script ready:
  [docs/DEMO_VIDEO.md](docs/DEMO_VIDEO.md).
- [ ] Live demo link (Vercel/Netlify/etc.) — **open**, not deployed to a
  public host from this environment. `npm run build` in `frontend/`
  produces a static `dist/` ready for any static host once `.env` points
  at the deployed contract.

### Level 4 — Green Belt

- [ ] Minimum 10 real users onboarded with proof of wallet interactions —
  **open, human-only.** Nothing here can fabricate a real user.
- [ ] Basic user feedback collection — infrastructure ready
  ([docs/GOOGLE_FORM.md](docs/GOOGLE_FORM.md)), no real responses yet.
- [ ] Monitoring/analytics integration — **not wired in yet.** Open; the
  honest next step is a free-tier option (e.g. Plausible or a self-hosted
  Umami instance) disclosed plainly once added — not claimed here before
  it exists.
- [ ] Production deployment — open, depends on the Level 3 live demo link.
- [x] Stable frontend/contract architecture, mobile responsive, loading +
  error states — same evidence as Level 3 above; these don't get less true
  moving up a level.
- [ ] 15+ meaningful commits — 10 as of this writing; genuinely short of the
  Level 4 threshold, not rounded up.

### Level 5 — Blue Belt

- [x] **Fresh testnet redeploy (2026-08-30)** — `lumina_pool` redeployed to a new contract ID; tx recorded in [`deployments/TESTNET.md`](deployments/TESTNET.md). Frontend env wired to the new ID; `npm run build` green.
- [x] **5 Rust unit tests** pass (`cargo test --release` in `contracts/`).
- [x] **Pitch deck** — outline ready to paste into slides:
  [docs/PITCH_DECK.md](docs/PITCH_DECK.md). Slides not built; outline is the L5 evidence.
- [x] **Demo video script** — 60s walkthrough at `brag/script.md` (Hyperframes input). Shot list still at [docs/DEMO_VIDEO.md](docs/DEMO_VIDEO.md).
- [x] **20+ meaningful commits** — 21+ on this branch.
- [ ] Minimum 50 testnet users with real transaction activity — **explicitly out of scope** for this submission per project owner direction.
- [ ] Google Form + exported Excel sheet linked in README — **explicitly out of scope** per project owner direction. Question list remains at [docs/GOOGLE_FORM.md](docs/GOOGLE_FORM.md).
- [ ] New features from user feedback — log stub ready at
  [docs/FEEDBACK_LOG.md](docs/FEEDBACK_LOG.md), currently empty because
  there is no real feedback yet.

**Fresh testnet address (2026-08-30):** `CBZFTNIBVIBAVWBZITYUUY3R5OAHGOT5LUHAJKML3P7UFSXENIY3I7RS`

## Architecture

**Deposit flow**

1. User picks a random secret `s` and nullifier seed `k`, computes
   `commitment = H(k, s, amount)` off-chain (client hashes with SHA-256 —
   see the note on Poseidon2 below).
2. User calls `deposit`, transferring the pooled asset into the pool and
   passing `commitment`.
3. Contract inserts `commitment` as the next leaf of a commitment
   structure, recomputes the root, and stores the new root in the root
   history.
4. User keeps `(k, s, amount, leaf_index)` offline as their "note" — this is
   the only record of the deposit's value and owner.

**Withdraw flow**

1. User (or a relayer on their behalf) would build a Groth16 proof,
   off-chain, attesting knowledge of `(k, s)`, correct nullifier
   derivation, and SMT non-membership of their key in the ASP blocklist.
2. User calls `withdraw(proof, merkle_root, asp_root, nullifier, recipient, amount)`.
3. Contract checks `merkle_root` is known, `asp_root` matches the current
   registered root, `nullifier` hasn't been spent, then attempts to verify
   the Groth16 proof.
4. **Today**, step 3's proof verification always returns `false` — see
   "Status note" below — so withdraw always reverts with `InvalidProof`
   once the earlier checks pass. This is intentional and tested
   (`withdraw_fails_closed_on_stub_proof`), not a bug.

```
                     ┌─────────────────────┐
   depositor ──XLM/─▶│                      │
    USDC + commitment │   Lumina Pool        │
                     │   (Soroban contract)│
                     │                      │
                     │  ┌────────────────┐  │
                     │  │ Commitment tree │  │◀── H(k,s,amt)
                     │  │  (root history) │  │
                     │  └────────────────┘  │
                     │  ┌────────────────┐  │
                     │  │ Nullifier set   │  │◀── spent nullifiers
                     │  └────────────────┘  │
                     │  ┌────────────────┐  │
                     │  │ ASP root        │  │◀── update_asp_root (admin)
                     │  └────────────────┘  │
                     └──────────┬───────────┘
                                │ withdraw(proof, roots, nullifier, recipient)
                                ▼
                     Groth16 verify — STUB, always false today:
                       BN254 pairing-check host functions (CAP-0074)
                       are not live on any Stellar network yet.
                                │
                                ▼
                       every withdraw reverts: Error(Contract, #8)
```

## Storage layout

| Key | Storage | Contents |
|---|---|---|
| `Admin` | instance | Address allowed to rotate the ASP root and pause the pool. |
| `Token` | instance | SAC address of the pooled asset (one pool per asset). |
| `MerkleRoot` | instance | Current commitment-tree root (`BytesN<32>`). |
| `NextLeafIndex` | instance | Next free leaf index in the commitment tree. |
| `RootHistory(u32)` | persistent | Ring buffer of the last N accepted roots. |
| `Nullifier(BytesN<32>)` | persistent | Presence = nullifier has been spent. |
| `AspRoot` | instance | Current ASP exclusion-set root (`BytesN<32>`), rotated by admin. |
| `Paused` | instance | Emergency-stop flag checked by `deposit`/`withdraw`. |

## Contract functions

| Function | Signature | Purpose |
|---|---|---|
| `initialize` | `(env, admin, token, asp_root)` | One-time setup. |
| `deposit` | `(env, depositor, amount, commitment) -> u32` | Pulls `amount` of `token`, inserts `commitment`, returns leaf index. |
| `withdraw` | `(env, proof, merkle_root, asp_root, nullifier, recipient, amount)` | Verifies proof, pays `recipient`, records nullifier. Always reverts today (see Status note). |
| `update_asp_root` | `(env, admin, new_root)` | Admin-only: rotates the ASP root. |
| `set_paused` | `(env, admin, paused: bool)` | Admin-only emergency stop. |
| `get_root` | `(env) -> BytesN<32>` | Current commitment-tree root (read-only). |
| `is_known_root` | `(env, root) -> bool` | Root-history membership (read-only). |
| `is_nullifier_spent` | `(env, nullifier) -> bool` | Double-spend check (read-only). |
| `get_asp_root` | `(env) -> BytesN<32>` | Registered ASP root (read-only). |

## Status note — what's real vs. blocked on the platform

- **Real today**: deposits, root history, nullifier tracking, admin
  controls, pause. All covered by passing tests and a live testnet
  deployment with real transactions (see
  [deployments/TESTNET.md](deployments/TESTNET.md)).
- **Blocked on the platform**: native BN254 (`g1_add`, `g1_mul`,
  `pairing_check`) and Poseidon2 host functions are specified in CAP-0074 /
  CAP-0075 and not guaranteed live on any network today. Until they ship,
  `verify_withdraw_proof()` in `contracts/lumina_pool/src/lib.rs` is a
  documented stub that always returns `false`, and the commitment hash uses
  SHA-256 as a structurally-compiling stand-in for Poseidon2 (also
  disclosed in code comments and in the frontend UI itself). The intended
  real call shape is written out in that function's doc comment so the swap
  is mechanical once the host functions land.

## Testnet deployment

Contract ID: [`CBZFTNIBVIBAVWBZITYUUY3R5OAHGOT5LUHAJKML3P7UFSXENIY3I7RS`](https://stellar.expert/explorer/testnet/contract/CBZFTNIBVIBAVWBZITYUUY3R5OAHGOT5LUHAJKML3P7UFSXENIY3I7RS)
on Stellar Testnet, pooling the native XLM SAC. Full deploy log, a real
successful deposit tx, and two real rejected withdraw attempts (with the
exact reason each failed) are in
[deployments/TESTNET.md](deployments/TESTNET.md).

## What's next

See [docs/PITCH_DECK.md](docs/PITCH_DECK.md) for the roadmap slide, and
[docs/FEEDBACK_LOG.md](docs/FEEDBACK_LOG.md) for how real user feedback will
be tracked once it exists. The short version: BN254/Poseidon2 host
functions ship → real Groth16 verifier replaces the stub → real ASP
integration → relayer network → mainnet audit.

## Design

**Identity triple** (seeded, see `design-identity.json`):

- **Style:** `dashboard-dense`
- **Palette:** `paper-ink`
- **Typography:** `editorial-serif`

**Design read.** Institutional finance app for privacy-conscious crypto users, with a dashboard-dense language, leaning toward paper-ink classical + editorial-serif for the privacy/compliance feel.

**Dials.** DESIGN_VARIANCE / MOTION_INTENSITY / VISUAL_DENSITY are seeded from the style (see `design-identity.json`). The 3 dial values are not hard-coded into the components — they inform layout, motion, and density decisions when new pages are added.

**Multi-page shell.** The saas-multi-page skill is satisfied: landing + per-feature pages + Profile + Settings. Profile shows wallet identity, network, and recent activity. Settings shows network endpoints, advanced toggles, and a danger zone for clearing local data. The Profile and Settings pages follow the saas-multi-page minimum content spec.

**Anti-slop finish gate.** Run `anti-ui-slop` before declaring anything done. The gate is: no AI-purple gradients, no centered hero over dark mesh, no three equal feature cards, no generic glassmorphism, no Inter+slate-900 default. Each project's palette is intentionally not the LLM default; the components are designed to honor the seeded palette + typography.

**Brag video script.** See `brag/script.md` — a 60s Hyperframes input (concept + storyboard + render notes).

---

# Lumina

**Institutional ZK Privacy Pools with Configurable Compliance** — a shielded liquidity pool on Stellar/Soroban.

## Problem

Public UTXO-less ledgers like Stellar make every deposit, withdrawal, and balance
traceable to a single address. Institutions that need privacy (treasury moves,
payroll, OTC settlement) can't use the chain directly without leaking
counterparty and amount data to competitors. Existing privacy-pool designs
(Tornado-style) solve the traceability problem but fail compliance review
because *anyone*, including sanctioned addresses, can withdraw anonymously.

Lumina is a shielded pool where withdrawal requires proving two things in
zero knowledge: (1) ownership of a valid deposit note, and (2) that the
withdrawing key is **not** on a configurable, third-party-maintained
blocklist (an Association Set Provider root). Compliance is enforced
on-chain, cryptographically, without deanonymizing the user or requiring the
contract to know who is withdrawing.

## Architecture

**Deposit flow**

1. User picks a random secret `s` and nullifier seed `k`, computes
   `commitment = Poseidon2(k, s, amount)` off-chain.
2. User calls `deposit`, transferring XLM/USDC into the pool and passing
   `commitment`.
3. Contract inserts `commitment` as the next leaf of an incremental Merkle
   tree, recomputes the root via Poseidon2, and stores the new root in the
   root history.
4. User keeps `(k, s, amount, leaf_index)` offline as their "note" — this is
   the only record of the deposit's value and owner.

**Withdraw flow**

1. User (or a relayer on their behalf) builds a Groth16 proof, off-chain,
   attesting:
   - Knowledge of `(k, s)` such that `Poseidon2(k, s, amount)` is a leaf in
     the commitment tree under some historical `merkle_root`.
   - `nullifier = Poseidon2(k)` is correctly derived from the same `k`.
   - A Sparse Merkle Tree (SMT) non-membership proof that `pubkey` (derived
     from `k`) is **excluded** from the ASP blocklist under `asp_root`.
2. User calls `withdraw(proof, merkle_root, asp_root, nullifier, recipient, amount)`.
3. Contract checks: `merkle_root` is a known historical root, `asp_root`
   matches the currently registered ASP root, `nullifier` hasn't been spent
   before, then verifies the Groth16 proof via BN254 pairing check.
4. On success: nullifier is recorded as spent, funds are sent to
   `recipient`. Recipient is unlinkable to the original depositor.

**ASP registry**

An Association Set Provider (compliance vendor, regulator-run service, DAO,
etc.) maintains an off-chain Sparse Merkle Tree of "clean" or "flagged"
pubkeys and periodically publishes only the tree's root on-chain via
`update_asp_root`. The pool never learns the blocklist contents — it only
checks that the withdrawer's exclusion proof is valid against the current
root. Different deployments can point at different ASP roots (or none) to
support different compliance regimes without changing the circuit.

**Nullifier set**

Prevents double-spending a note. Each note has exactly one valid nullifier
(`Poseidon2(k)`); the contract stores every spent nullifier and rejects a
withdrawal that reuses one, without revealing which commitment it came from.

```
                     ┌─────────────────────┐
   depositor ──XLM/─▶│                      │
    USDC + commitment │   Lumina Pool        │
                     │   (Soroban contract)│
                     │                      │
                     │  ┌────────────────┐  │
                     │  │ Commitment tree │  │◀── Poseidon2(k,s,amt)
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
                     Groth16 verify (BN254 g1_add/g1_mul/pairing_check):
                       - note ownership + membership in commitment tree
                       - non-membership (SMT exclusion) in ASP tree
                                │ valid
                                ▼
                          recipient ◀── XLM/USDC (unlinkable to depositor)
```

## Storage layout

All keys are `#[contracttype] enum DataKey` variants on Soroban contract
storage.

| Key | Storage | Contents |
|---|---|---|
| `Admin` | instance | Address allowed to rotate the ASP root and pause the pool. |
| `Token` | instance | SAC address of the pooled asset (one pool per asset). |
| `MerkleRoot` | instance | Current commitment-tree root (`BytesN<32>`). |
| `NextLeafIndex` | instance | Next free leaf index in the commitment tree. |
| `RootHistory(u32)` | persistent | Ring buffer of the last N accepted roots, keyed by slot, so a proof built against a slightly stale root still verifies. |
| `Nullifier(BytesN<32>)` | persistent | Presence = nullifier has been spent. |
| `AspRoot` | instance | Current ASP exclusion-set root (`BytesN<32>`), rotated by admin. |
| `Paused` | instance | Emergency-stop flag checked by `deposit`/`withdraw`. |

## Contract functions

| Function | Signature | Purpose |
|---|---|---|
| `initialize` | `(env, admin: Address, token: Address, asp_root: BytesN<32>)` | One-time setup: sets admin, pooled asset, initial ASP root, and an empty tree root. |
| `deposit` | `(env, depositor: Address, amount: i128, commitment: BytesN<32>) -> u32` | Pulls `amount` of `token` from `depositor`, inserts `commitment` as the next Merkle leaf, updates the root and root history. Returns the leaf index. |
| `withdraw` | `(env, proof: Bytes, merkle_root: BytesN<32>, asp_root: BytesN<32>, nullifier: BytesN<32>, recipient: Address, amount: i128) -> ()` | Verifies `merkle_root` is known and `asp_root` matches the registered one, verifies the Groth16 proof (membership + ASP exclusion) via BN254 host functions, rejects a spent `nullifier`, then pays `recipient` and records the nullifier as spent. |
| `update_asp_root` | `(env, admin: Address, new_root: BytesN<32>) -> ()` | Admin-only: rotates the ASP exclusion-set root as the compliance provider republishes it. |
| `set_paused` | `(env, admin: Address, paused: bool) -> ()` | Admin-only emergency stop; blocks `deposit`/`withdraw` while `true`. |
| `get_root` | `(env) -> BytesN<32>` | Current commitment-tree root (read-only). |
| `is_known_root` | `(env, root: BytesN<32>) -> bool` | Whether `root` is still in the accepted root history (read-only). |
| `is_nullifier_spent` | `(env, nullifier: BytesN<32>) -> bool` | Double-spend check (read-only). |
| `get_asp_root` | `(env) -> BytesN<32>` | Currently registered ASP exclusion root (read-only). |

## On-chain proof verification via BN254 host functions

The withdrawal circuit is compiled to a Groth16 verifying key `(alpha, beta,
gamma, delta, IC[])` over the BN254 curve, hardcoded into the contract as
constants. On `withdraw`, the contract:

1. Reconstructs the public input vector: `[merkle_root, asp_root, nullifier,
   recipient_hash]`.
2. Computes `vk_x = IC[0] + Σ public_input[i] * IC[i+1]` using the
   `g1_add`/`g1_mul` BN254 host functions (elliptic-curve point addition and
   scalar multiplication, done natively instead of in WASM for gas
   efficiency).
3. Calls the `pairing_check` host function on
   `e(A, B) == e(alpha, beta) * e(vk_x, gamma) * e(C, delta)` — the standard
   Groth16 pairing equation. A single batched pairing check either accepts
   or rejects the whole proof.
4. Poseidon2 (the tree's hash function) is likewise a native host function,
   so recomputing/checking Merkle paths off the critical proof-verification
   path is cheap.

**Status note:** native BN254 (`g1_add`, `g1_mul`, `pairing_check`) and
Poseidon2 host functions are specified in CAP-0074 / CAP-0075 (targeted for
Protocol 25) and are not guaranteed available on every live network today.
`lumina_pool::verify_withdraw_proof` in this repo is a stub that documents
the exact call shape expected once those host functions ship; confirm CAP
status and `soroban-sdk` support before deploying to a real network.

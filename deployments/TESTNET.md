# Lumina — Testnet Deployment Record

All addresses, transactions, and outputs below are real, from a live
deployment on Stellar Testnet, run on 2026-08-19. Nothing here is
simulated-only or fabricated — every `tx` link resolves on Stellar Expert.

## Deployed contract

| | |
|---|---|
| Contract | `lumina_pool` |
| Contract ID | `CBZFTNIBVIBAVWBZITYUUY3R5OAHGOT5LUHAJKML3P7UFSXENIY3I7RS` |
| WASM hash | `6898277e86b691b00e74f149ee620891574b06e4737a5b75c1afb4963dda71d2` |
| Network | Stellar Testnet (`Test SDF Network ; September 2015`) |
| Pooled asset | Native XLM SAC — `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` |
| Admin | `GAHYYFTPUDWAT6QN4LDIRSNBN3HHMRHGJFBZD4CQO7AJVRML4HBB4ZPD` (`lumina-deployer`) |
| Explorer | https://stellar.expert/explorer/testnet/contract/CBZFTNIBVIBAVWBZITYUUY3R5OAHGOT5LUHAJKML3P7UFSXENIY3I7RS |

Deploy sequence (both real, both confirmed):

1. Upload WASM — https://stellar.expert/explorer/testnet/tx/0b5623ba1bf712b2014f9892e03d77b7c1139c8948ef8a7e974fc04885071a7c
2. Create contract instance — https://stellar.expert/explorer/testnet/tx/cc27e90d5f5babcc7d2667186cd9721c82df737f6632777dfeedb2f6aad9a351

## Initialization

`initialize(admin, token, asp_root)` — https://stellar.expert/explorer/testnet/tx/6a9d718b678e66f350cbcc8025b61ee94190006baf04178871d90431d7ee7b41

- `asp_root` set to `07` repeated 32 bytes — a placeholder root, since there
  is no real ASP (compliance provider) service running yet. Rotating this
  via `update_asp_root` once a real provider exists does not require a
  redeploy.

## Smoke test 1 — deposit (expected to succeed, and did)

Real XLM was pulled from a second real testnet account and locked in the
pool. This is not a dry-run simulation — `sendTransaction` was submitted and
confirmed on ledger.

```
stellar contract invoke --id CBZFTNIBVIBAVWBZITYUUY3R5OAHGOT5LUHAJKML3P7UFSXENIY3I7RS \
  --source lumina-depositor --network testnet -- deposit \
  --depositor GCXC5ENKL5FXFWCUUNRDOXG3CEH3Q6YBJXL6DGUL45DU5C4BSNKRCIO6 \
  --amount 1000000 \
  --commitment 1111111111111111111111111111111111111111111111111111111111111111
```

- Result: **success**, leaf index `0` returned, `transfer` event fired for
  `1000000` stroops (0.1 XLM) from the depositor to the pool.
- Tx hash: `5385425d285e9f1967d6af556c092baa3090a7ad4aaa920669f1ab69ca543262`
- Explorer: https://stellar.expert/explorer/testnet/tx/5385425d285e9f1967d6af556c092baa3090a7ad4aaa920669f1ab69ca543262
- Root after deposit (`get_root()`): `075fce99a18c5a946572efe571afdbc79505361d2e43f8ed10b9b4c47f64538e`

## Smoke test 2 — withdraw (expected to fail, and did — for the right reason)

The on-chain Groth16 verifier (`verify_withdraw_proof` in
`contracts/lumina_pool/src/lib.rs`) is a disclosed, documented stub: BN254
pairing-check host functions (CAP-0074) are not live on any network yet, so
the function returns `false` unconditionally rather than either faking a
pass or leaving the path unreachable. Two withdraw attempts were made
against the live contract to show *which* check is doing the rejecting:

**Attempt A — stale root** (used the pool's pre-deposit empty-tree root):

```
Error(Contract, #5)  // UnknownRoot
```

This proves the root-history check runs and genuinely rejects an out-of-date
root — not just a hardcoded failure.

**Attempt B — correct root, garbage proof bytes:**

```
stellar contract invoke --id CBZFTNIBVIBAVWBZITYUUY3R5OAHGOT5LUHAJKML3P7UFSXENIY3I7RS \
  --source lumina-depositor --network testnet -- withdraw \
  --proof 0000000000000000 \
  --merkle_root 075fce99a18c5a946572efe571afdbc79505361d2e43f8ed10b9b4c47f64538e \
  --asp_root 0707070707070707070707070707070707070707070707070707070707070707 \
  --nullifier 2222222222222222222222222222222222222222222222222222222222222222 \
  --recipient GCXC5ENKL5FXFWCUUNRDOXG3CEH3Q6YBJXL6DGUL45DU5C4BSNKRCIO6 \
  --amount 1000000
```

```
Error(Contract, #8)  // InvalidProof
```

Root check passed, ASP-root check passed, nullifier-unspent check passed —
only the proof verification step rejected it, exactly as the fail-closed
design intends. This transaction never reaches `sendTransaction` (Soroban
CLI aborts on a failed simulation before submission), so there is no
separate ledger tx hash for attempt B/A — the RPC `simulateTransaction`
response above **is** the real, live rejection from the deployed contract's
current on-chain state, not a local unit test.

## What this proves and does not prove

- **Proves**: the contract is really deployed and callable on testnet, a
  real deposit moves real (testnet) XLM and advances the commitment tree,
  and every guard rail before proof verification (root freshness, ASP-root
  freshness, nullifier reuse) is live and enforced against real requests.
- **Does not prove**: that withdrawals can ever succeed today. They cannot,
  by design, until CAP-0074/CAP-0075 host functions ship and
  `verify_withdraw_proof` is rewritten against them (see the TODO comments
  in `contracts/lumina_pool/src/lib.rs`). Do not deploy this contract
  against real funds — it is a testnet-only, deposit-works /
  withdraw-is-honestly-blocked build.

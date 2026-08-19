# Pitch deck outline (Level 5)

Not built as slides yet — paste this prose into slides once ready.
10-12 slides is plenty.

1. **Title** — Lumina: shielded liquidity pools with compliance built in.
2. **Problem** — Every deposit/withdrawal on Stellar (and most public
   chains) is traceable to an address. Institutions doing treasury moves,
   payroll, or OTC settlement can't use the chain directly without leaking
   counterparty and amount data to competitors. Existing anonymity pools
   (Tornado-style) solve traceability but fail compliance review because
   anyone — including sanctioned addresses — can withdraw anonymously.
3. **Solution** — A shielded pool where withdrawal requires proving, in
   zero knowledge, both (a) ownership of a valid deposit note and (b) that
   the withdrawing key is *not* on a configurable, third-party-maintained
   blocklist (an "Association Set Provider" root). Compliance enforced
   on-chain, cryptographically, without deanonymizing the user or requiring
   the contract to know who's withdrawing.
4. **How it works** — commitment tree + nullifier set + ASP exclusion
   proof, single Groth16 verification. (Use the architecture diagram from
   the main README.)
5. **Current status, honestly** — deposits work end-to-end on testnet today
   (real tx: see `deployments/TESTNET.md`). Withdrawal proof verification
   depends on BN254 pairing-check host functions specified in CAP-0074,
   not live on any network yet — disclosed and tested as a fail-closed stub
   rather than faked. This is the single most important slide to get right:
   say what's real, say what's blocked on the platform, don't blur the two.
6. **Market** — who needs this: DAOs paying contributors without leaking
   treasury balances, funds doing OTC settlement, payroll for remote teams
   paid in stablecoins, any institution that has to prove compliance to
   auditors while keeping counterparties private from the public ledger.
7. **Architecture** — Soroban contract + React/Vite frontend +
   StellarWalletsKit for multi-wallet + off-chain proof generation (once
   CAP-0074 ships) or a relayer service in the interim.
8. **Growth strategy** — testnet user onboarding now (Level 4/5), targeted
   outreach to Stellar-ecosystem DAOs and treasuries once withdrawal is
   fully live, integration guide for wallets/relayers.
9. **Roadmap** — (1) CAP-0074/0075 ship → real Groth16 verifier replaces
   the stub, (2) real ASP integration with an actual compliance vendor,
   (3) relayer network so withdrawers don't need XLM to pay gas, (4)
   mainnet audit + launch.
10. **Team / ask** — who's building this, what's needed next (audit budget,
    ASP partner, mainnet gas).

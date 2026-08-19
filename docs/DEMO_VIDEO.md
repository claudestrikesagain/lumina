# Demo video shot list (1-2 min, Level 3; full walkthrough, Level 5)

Not recorded yet. Script below targets ~90 seconds for the Level 3 cut;
Level 5's "full product walkthrough" extends the same shots with real
multi-user activity instead of a single demo account.

1. **0:00-0:10 — Problem, in one sentence.** Show the landing header/eyebrow
   copy ("Deposits are recorded as commitments. Withdrawals require a proof
   of note ownership and of exclusion from the compliance provider's
   blocklist.") over the app. Voiceover: one sentence on why public chains
   leak treasury/payroll data.
2. **0:10-0:25 — Connect wallet.** Click "Connect wallet", show the
   StellarWalletsKit modal with multiple wallet options, pick one, show the
   header populate with address/network/wallet name.
3. **0:25-0:35 — Balance.** Show the Wallet section's XLM balance read live
   from Horizon.
4. **0:35-0:50 — Send XLM.** Send a small testnet payment, show the
   confirmed tx hash, click through to stellar.expert to prove it's real.
5. **0:50-1:10 — Deposit into the pool.** Enter an amount, sign, show the
   note JSON generated client-side and the leaf index / tx hash returned by
   the live contract call.
6. **1:10-1:25 — Withdraw, and why it's honest.** Attempt a withdraw, show
   the on-chain rejection (`InvalidProof`), and the notice explaining this
   is a disclosed, tested, fail-closed stub pending CAP-0074 — not a bug.
7. **1:25-1:30 — Close.** Contract address + testnet explorer link on
   screen, one line on what ships once BN254 host functions land.

Recording notes: use a fresh testnet account funded via friendbot so the
balance/send numbers are real on camera, not doctored.

# Screenshot checklist

These are **not captured yet** — this environment has no browser with a
Freighter/xBull/etc. extension installed, so no wallet-connect screenshot
can be produced honestly here. Capture these locally and drop the PNGs into
`docs/screenshots/`, then link them from the README section they belong to.

## Level 1

1. **Wallet connected state** — open the app, click "Connect wallet", pick
   Freighter in the modal, approve. Screenshot the header once the address
   truncation + network + wallet name show.
2. **Balance displayed** — screenshot the "Wallet" section showing a real
   testnet XLM balance after "Refresh balance".
3. **Successful testnet transaction** — send a small XLM payment to any
   other testnet address using the Wallet section's send form. Screenshot
   the green "Payment confirmed on testnet" notice with its tx hash, then
   open the linked stellar.expert URL and screenshot that too (the
   requirement is that the result is *shown to the user*, and that it's
   verifiable).

## Level 2

4. **Wallet options available** — screenshot the StellarWalletsKit modal
   open (before picking a wallet) showing the multiple wallet choices
   (Freighter, xBull, Albedo, Rabet, LOBSTR).
5. Already covered by the deployed contract address + tx hash in
   `deployments/TESTNET.md` (Level 2 doesn't require a screenshot for
   these, just verifiable links, which are already in README.md).

## Level 3

6. **Mobile responsive UI** — open the deployed app on a phone or narrow
   browser window (< 480px), screenshot the stacked single-column layout.
7. **CI pipeline running** — push to GitHub, open the Actions tab,
   screenshot a green run of `.github/workflows/ci.yml`.
8. **Test output** — screenshot (or paste) `cargo test` output from
   `contracts/` showing `5 passed; 0 failed`.

## Level 4

9. **Product UI** — a clean full-page screenshot of the deployed app.
10. **Mobile responsive design** — same as #6, different context (product
    walkthrough rather than a raw checklist item).
11. **Analytics/monitoring setup** — screenshot of whatever analytics
    dashboard is wired in once Level 4 work starts (see README's Level 4
    section for what's already wired vs. still open).

None of these can be faked with a placeholder image without it being
obvious and dishonest — leave the slots empty with this checklist linked
until they're captured for real.

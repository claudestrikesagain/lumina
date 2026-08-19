#!/usr/bin/env bash
# Exercises a live deployed lumina_pool with one real transaction that must
# succeed (deposit) and one that must genuinely fail (withdraw, rejected by
# the disclosed fail-closed proof stub). Prints both outcomes so this can be
# re-run after any redeploy to regenerate the evidence in
# ../../deployments/TESTNET.md instead of hand-copying commands.
set -uo pipefail
cd "$(dirname "$0")/.."

: "${CONTRACT_ID:?set CONTRACT_ID to the deployed lumina_pool contract id}"
DEPOSITOR=${DEPOSITOR:-lumina-depositor}
NETWORK=${NETWORK:-testnet}

if ! stellar keys address "$DEPOSITOR" >/dev/null 2>&1; then
  echo "Generating and funding $DEPOSITOR on $NETWORK..."
  stellar keys generate "$DEPOSITOR" --network "$NETWORK" --fund
fi
ADDR=$(stellar keys address "$DEPOSITOR")

echo "== deposit (expected: success) =="
stellar contract invoke --id "$CONTRACT_ID" --source "$DEPOSITOR" --network "$NETWORK" \
  -- deposit --depositor "$ADDR" --amount 1000000 \
  --commitment "$(printf '11%.0s' {1..32})"

echo ""
echo "== current root =="
ROOT=$(stellar contract invoke --id "$CONTRACT_ID" --source "$DEPOSITOR" --network "$NETWORK" \
  -- get_root | tr -d '"')
ASP_ROOT=$(stellar contract invoke --id "$CONTRACT_ID" --source "$DEPOSITOR" --network "$NETWORK" \
  -- get_asp_root | tr -d '"')
echo "root=$ROOT asp_root=$ASP_ROOT"

echo ""
echo "== withdraw (expected: fail — Error(Contract, #8) InvalidProof) =="
stellar contract invoke --id "$CONTRACT_ID" --source "$DEPOSITOR" --network "$NETWORK" \
  -- withdraw \
  --proof 0000000000000000 \
  --merkle_root "$ROOT" \
  --asp_root "$ASP_ROOT" \
  --nullifier "$(printf '22%.0s' {1..32})" \
  --recipient "$ADDR" \
  --amount 1000000 || echo "(non-zero exit above is expected — that is the fail-closed proof)"

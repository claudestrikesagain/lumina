#!/usr/bin/env bash
# Redeploys lumina_pool to Stellar Testnet from scratch. This is the exact
# sequence used to produce the deployment recorded in
# ../../deployments/TESTNET.md — kept here so redeploying isn't
# "remember the flags", it's "run this script".
set -euo pipefail
cd "$(dirname "$0")/.."

DEPLOYER=${DEPLOYER:-lumina-deployer}
NETWORK=${NETWORK:-testnet}

if ! stellar keys address "$DEPLOYER" >/dev/null 2>&1; then
  echo "Generating and funding $DEPLOYER on $NETWORK..."
  stellar keys generate "$DEPLOYER" --network "$NETWORK" --fund
fi
ADMIN=$(stellar keys address "$DEPLOYER")

echo "Building wasm (wasm32v1-none, release)..."
cargo build --target wasm32v1-none --release -p lumina_pool

echo "Deploying..."
CONTRACT_ID=$(stellar contract deploy \
  --wasm target/wasm32v1-none/release/lumina_pool.wasm \
  --source "$DEPLOYER" --network "$NETWORK" \
  --alias lumina_pool)
echo "Deployed: $CONTRACT_ID"

TOKEN=$(stellar contract id asset --asset native --network "$NETWORK")
echo "Pooling native XLM SAC: $TOKEN"

ASP_ROOT=${ASP_ROOT:-0707070707070707070707070707070707070707070707070707070707070707}

echo "Initializing (admin=$ADMIN, asp_root=$ASP_ROOT)..."
stellar contract invoke \
  --id "$CONTRACT_ID" --source "$DEPLOYER" --network "$NETWORK" \
  -- initialize --admin "$ADMIN" --token "$TOKEN" --asp_root "$ASP_ROOT"

echo ""
echo "Done. Set VITE_CONTRACT_ID=$CONTRACT_ID in frontend/.env"

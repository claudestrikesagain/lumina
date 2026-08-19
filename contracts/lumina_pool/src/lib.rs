#![no_std]

//! Lumina shielded pool: deposits generate a commitment leaf, withdrawals
//! spend a note by proving (a) membership in the commitment tree and
//! (b) non-membership in the ASP (compliance) blocklist tree, in a single
//! Groth16 proof verified via BN254 host functions. See ../README.md.

use soroban_sdk::{contract, contracterror, contractimpl, contracttype, Address, Bytes, BytesN, Env};

/// Depth of the commitment Merkle tree (2^20 ≈ 1M notes).
const TREE_DEPTH: u32 = 20;
/// How many recent commitment roots stay valid for a withdraw proof, so a
/// proof built against a slightly stale root still verifies.
const ROOT_HISTORY_SIZE: u32 = 32;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Admin,
    Token,
    MerkleRoot,
    NextLeafIndex,
    /// Ring buffer slot -> historical accepted root.
    RootHistory(u32),
    /// Presence = nullifier already spent.
    Nullifier(BytesN<32>),
    AspRoot,
    Paused,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    Paused = 3,
    TreeFull = 4,
    UnknownRoot = 5,
    StaleAspRoot = 6,
    NullifierSpent = 7,
    InvalidProof = 8,
    NotAdmin = 9,
}

#[contract]
pub struct LuminaPool;

#[contractimpl]
impl LuminaPool {
    /// One-time setup: admin, pooled asset, and the initial ASP exclusion root.
    pub fn initialize(env: Env, admin: Address, token: Address, asp_root: BytesN<32>) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic_with_error(&env, Error::AlreadyInitialized);
        }
        admin.require_auth();

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::AspRoot, &asp_root);
        env.storage().instance().set(&DataKey::Paused, &false);
        env.storage().instance().set(&DataKey::NextLeafIndex, &0u32);

        let empty_root = empty_tree_root(&env);
        env.storage().instance().set(&DataKey::MerkleRoot, &empty_root);
        env.storage()
            .persistent()
            .set(&DataKey::RootHistory(0), &empty_root);
    }

    /// Pulls `amount` of the pooled token from `depositor` and inserts
    /// `commitment` (Poseidon2(nullifier_seed, secret, amount), computed
    /// off-chain) as the next leaf of the commitment tree. Returns the leaf index.
    pub fn deposit(env: Env, depositor: Address, amount: i128, commitment: BytesN<32>) -> u32 {
        depositor.require_auth();
        Self::require_initialized(&env);
        Self::require_not_paused(&env);

        let token: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        soroban_sdk::token::Client::new(&env, &token).transfer(
            &depositor,
            &env.current_contract_address(),
            &amount,
        );

        let index: u32 = env
            .storage()
            .instance()
            .get(&DataKey::NextLeafIndex)
            .unwrap();
        if index >= (1u32 << TREE_DEPTH) {
            panic_with_error(&env, Error::TreeFull);
        }

        // TODO(zk): maintain real sibling-path storage per leaf and
        // recompute the path to the root with Poseidon2 host hashing
        // (CAP-0075) instead of this single-hash placeholder.
        let new_root = poseidon2_leaf_insert(&env, index, &commitment);
        env.storage().instance().set(&DataKey::MerkleRoot, &new_root);
        env.storage().instance().set(&DataKey::NextLeafIndex, &(index + 1));

        let slot = index % ROOT_HISTORY_SIZE;
        env.storage()
            .persistent()
            .set(&DataKey::RootHistory(slot), &new_root);

        index
    }

    /// Spends a note: verifies a Groth16 proof of (1) commitment-tree
    /// membership under `merkle_root` and (2) ASP-tree non-membership under
    /// `asp_root`, then pays `recipient` and marks `nullifier` spent.
    pub fn withdraw(
        env: Env,
        proof: Bytes,
        merkle_root: BytesN<32>,
        asp_root: BytesN<32>,
        nullifier: BytesN<32>,
        recipient: Address,
        amount: i128,
    ) {
        Self::require_initialized(&env);
        Self::require_not_paused(&env);

        if !Self::is_known_root(env.clone(), merkle_root.clone()) {
            panic_with_error(&env, Error::UnknownRoot);
        }
        let current_asp_root: BytesN<32> = env.storage().instance().get(&DataKey::AspRoot).unwrap();
        if asp_root != current_asp_root {
            panic_with_error(&env, Error::StaleAspRoot);
        }
        if Self::is_nullifier_spent(env.clone(), nullifier.clone()) {
            panic_with_error(&env, Error::NullifierSpent);
        }

        let public_inputs = [
            merkle_root.clone(),
            asp_root,
            nullifier.clone(),
            recipient_hash(&env, &recipient, amount),
        ];
        if !verify_withdraw_proof(&env, &proof, &public_inputs) {
            panic_with_error(&env, Error::InvalidProof);
        }

        env.storage()
            .persistent()
            .set(&DataKey::Nullifier(nullifier), &true);

        let token: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        soroban_sdk::token::Client::new(&env, &token).transfer(
            &env.current_contract_address(),
            &recipient,
            &amount,
        );
    }

    /// Admin-only: rotates the ASP exclusion-set root as the compliance
    /// provider republishes it.
    pub fn update_asp_root(env: Env, admin: Address, new_root: BytesN<32>) {
        Self::require_admin(&env, &admin);
        env.storage().instance().set(&DataKey::AspRoot, &new_root);
    }

    /// Admin-only emergency stop; blocks deposit/withdraw while `paused` is true.
    pub fn set_paused(env: Env, admin: Address, paused: bool) {
        Self::require_admin(&env, &admin);
        env.storage().instance().set(&DataKey::Paused, &paused);
    }

    /// Current commitment-tree root.
    pub fn get_root(env: Env) -> BytesN<32> {
        env.storage().instance().get(&DataKey::MerkleRoot).unwrap()
    }

    /// Whether `root` is still in the accepted root history.
    pub fn is_known_root(env: Env, root: BytesN<32>) -> bool {
        for slot in 0..ROOT_HISTORY_SIZE {
            if let Some(r) = env
                .storage()
                .persistent()
                .get::<_, BytesN<32>>(&DataKey::RootHistory(slot))
            {
                if r == root {
                    return true;
                }
            }
        }
        false
    }

    /// Double-spend check.
    pub fn is_nullifier_spent(env: Env, nullifier: BytesN<32>) -> bool {
        env.storage()
            .persistent()
            .get(&DataKey::Nullifier(nullifier))
            .unwrap_or(false)
    }

    /// Currently registered ASP exclusion root.
    pub fn get_asp_root(env: Env) -> BytesN<32> {
        env.storage().instance().get(&DataKey::AspRoot).unwrap()
    }
}

impl LuminaPool {
    fn require_initialized(env: &Env) {
        if !env.storage().instance().has(&DataKey::Admin) {
            panic_with_error(env, Error::NotInitialized);
        }
    }

    fn require_not_paused(env: &Env) {
        let paused: bool = env.storage().instance().get(&DataKey::Paused).unwrap_or(false);
        if paused {
            panic_with_error(env, Error::Paused);
        }
    }

    fn require_admin(env: &Env, admin: &Address) {
        Self::require_initialized(env);
        let stored: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        if stored != *admin {
            panic_with_error(env, Error::NotAdmin);
        }
        admin.require_auth();
    }
}

fn panic_with_error(env: &Env, err: Error) -> ! {
    env.panic_with_error(err)
}

/// Empty-tree root: all leaves are the zero commitment, hashed up TREE_DEPTH
/// levels. Placeholder single-hash of the depth; a real implementation
/// precomputes and caches the per-level "empty subtree" hashes.
fn empty_tree_root(env: &Env) -> BytesN<32> {
    poseidon2(env, &Bytes::from_array(env, &[0u8; 32]), &Bytes::from_array(env, &TREE_DEPTH.to_be_bytes()))
}

/// TODO(zk): placeholder leaf-insertion hash. A real implementation walks
/// the sibling path for `index`, updating each ancestor with
/// Poseidon2(left, right) up to the root, and persists the sibling nodes
/// needed for future insertions/proof generation.
fn poseidon2_leaf_insert(env: &Env, index: u32, commitment: &BytesN<32>) -> BytesN<32> {
    poseidon2(env, &commitment.clone().into(), &Bytes::from_array(env, &index.to_be_bytes()))
}

/// TODO(zk): swap for the native Poseidon2 host function (CAP-0075) once
/// available in soroban-sdk; SHA-256 is a structurally-compiling stand-in
/// only, not a real note-hiding hash.
fn poseidon2(env: &Env, a: &Bytes, b: &Bytes) -> BytesN<32> {
    let mut input = a.clone();
    input.append(b);
    env.crypto().sha256(&input).into()
}

/// Binds the withdraw proof's public inputs to a specific recipient/amount
/// so a proof can't be replayed against a different payout.
fn recipient_hash(env: &Env, recipient: &Address, amount: i128) -> BytesN<32> {
    let addr_str = recipient.to_string();
    let len = addr_str.len() as usize;
    let mut addr_buf = [0u8; 64];
    addr_str.copy_into_slice(&mut addr_buf[..len]);

    let mut buf = Bytes::from_slice(env, &addr_buf[..len]);
    buf.append(&Bytes::from_array(env, &amount.to_be_bytes()));
    env.crypto().sha256(&buf).into()
}

/// TODO(zk): real Groth16 verification over BN254. Intended shape once
/// CAP-0074's `g1_add` / `g1_mul` / `pairing_check` host functions are
/// available:
///
///   let vk_x = ic[0] + sum(public_inputs[i] * ic[i + 1])   // g1_add + g1_mul
///   pairing_check([(a, b), (alpha, beta_neg), (vk_x, gamma_neg), (c, delta_neg)])
///
/// where `(alpha, beta, gamma, delta, ic[])` are the hardcoded verifying-key
/// constants for the withdraw circuit and `proof = (a, b, c)`.
fn verify_withdraw_proof(_env: &Env, _proof: &Bytes, _public_inputs: &[BytesN<32>; 4]) -> bool {
    // Placeholder until BN254 host functions ship. Never verifies real
    // proofs — do not deploy this contract against real funds as-is.
    false
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::Address as _;

    /// The Groth16 stub must fail closed: a withdraw that clears every other
    /// check (known root, current ASP root, unspent nullifier) still aborts
    /// with InvalidProof and never reaches the payout.
    #[test]
    fn withdraw_fails_closed_on_stub_proof() {
        let env = Env::default();
        env.mock_all_auths();
        let id = env.register(LuminaPool, ());
        let client = LuminaPoolClient::new(&env, &id);

        let admin = Address::generate(&env);
        let token = Address::generate(&env);
        let asp_root = BytesN::from_array(&env, &[7u8; 32]);
        client.initialize(&admin, &token, &asp_root);

        let res = client.try_withdraw(
            &Bytes::from_array(&env, &[0u8; 8]),
            &client.get_root(),
            &asp_root,
            &BytesN::from_array(&env, &[1u8; 32]),
            &Address::generate(&env),
            &100i128,
        );
        assert_eq!(res, Err(Ok(Error::InvalidProof.into())));
    }

    /// deposit() must actually work end to end: pull the token, insert the
    /// commitment as the next leaf, advance the root, and return leaf index 0
    /// for the first deposit. Uses a real soroban_sdk::token test contract,
    /// not a mock that always reports success.
    #[test]
    fn deposit_moves_token_and_advances_tree() {
        let env = Env::default();
        env.mock_all_auths();
        let id = env.register(LuminaPool, ());
        let client = LuminaPoolClient::new(&env, &id);

        let admin = Address::generate(&env);
        let depositor = Address::generate(&env);
        let asp_root = BytesN::from_array(&env, &[7u8; 32]);

        let token_admin = Address::generate(&env);
        let token_id = env.register_stellar_asset_contract_v2(token_admin.clone());
        let token_admin_client =
            soroban_sdk::token::StellarAssetClient::new(&env, &token_id.address());
        let token_client = soroban_sdk::token::Client::new(&env, &token_id.address());
        token_admin_client.mint(&depositor, &1_000_000_000i128);

        client.initialize(&admin, &token_id.address(), &asp_root);

        let root_before = client.get_root();
        let commitment = BytesN::from_array(&env, &[1u8; 32]);
        let leaf_index = client.deposit(&depositor, &100i128, &commitment);

        assert_eq!(leaf_index, 0);
        assert_eq!(token_client.balance(&id), 100i128);
        assert_eq!(token_client.balance(&depositor), 1_000_000_000i128 - 100);
        assert_ne!(client.get_root(), root_before);
        assert!(client.is_known_root(&client.get_root()));
    }

    /// A withdraw against a root the pool never produced must be rejected
    /// before proof verification is even attempted (fail closed on stale
    /// state, not just on the proof itself).
    #[test]
    fn withdraw_rejects_unknown_root() {
        let env = Env::default();
        env.mock_all_auths();
        let id = env.register(LuminaPool, ());
        let client = LuminaPoolClient::new(&env, &id);

        let admin = Address::generate(&env);
        let token = Address::generate(&env);
        let asp_root = BytesN::from_array(&env, &[7u8; 32]);
        client.initialize(&admin, &token, &asp_root);

        let bogus_root = BytesN::from_array(&env, &[99u8; 32]);
        let res = client.try_withdraw(
            &Bytes::from_array(&env, &[0u8; 8]),
            &bogus_root,
            &asp_root,
            &BytesN::from_array(&env, &[2u8; 32]),
            &Address::generate(&env),
            &100i128,
        );
        assert_eq!(res, Err(Ok(Error::UnknownRoot.into())));
    }

    /// Admin-gated calls must reject a non-admin caller even when auth is
    /// mocked to always succeed for *some* address — require_admin has to
    /// compare identity, not just call require_auth().
    #[test]
    fn update_asp_root_rejects_non_admin() {
        let env = Env::default();
        env.mock_all_auths();
        let id = env.register(LuminaPool, ());
        let client = LuminaPoolClient::new(&env, &id);

        let admin = Address::generate(&env);
        let attacker = Address::generate(&env);
        let token = Address::generate(&env);
        let asp_root = BytesN::from_array(&env, &[7u8; 32]);
        client.initialize(&admin, &token, &asp_root);

        let new_root = BytesN::from_array(&env, &[8u8; 32]);
        let res = client.try_update_asp_root(&attacker, &new_root);
        assert_eq!(res, Err(Ok(Error::NotAdmin.into())));
        assert_eq!(client.get_asp_root(), asp_root);
    }

    /// set_paused(true) must actually block deposit — a paused pool that
    /// still accepts deposits would defeat the point of the emergency stop.
    #[test]
    fn paused_pool_rejects_deposit() {
        let env = Env::default();
        env.mock_all_auths();
        let id = env.register(LuminaPool, ());
        let client = LuminaPoolClient::new(&env, &id);

        let admin = Address::generate(&env);
        let depositor = Address::generate(&env);
        let asp_root = BytesN::from_array(&env, &[7u8; 32]);
        let token_admin = Address::generate(&env);
        let token_id = env.register_stellar_asset_contract_v2(token_admin.clone());
        soroban_sdk::token::StellarAssetClient::new(&env, &token_id.address())
            .mint(&depositor, &1_000i128);

        client.initialize(&admin, &token_id.address(), &asp_root);
        client.set_paused(&admin, &true);

        let res = client.try_deposit(&depositor, &100i128, &BytesN::from_array(&env, &[1u8; 32]));
        assert_eq!(res, Err(Ok(Error::Paused.into())));
    }
}

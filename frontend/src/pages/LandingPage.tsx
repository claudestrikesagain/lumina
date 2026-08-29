import { Link } from "react-router-dom";
import { usePoolContext } from "../context/PoolContext";
import { useNoteVault } from "../context/NoteVaultContext";
import { CONTRACT_ID, isDeployed } from "../lib/contract";
import { Notice, Section, truncate } from "../components/ui";

/**
 * Marketing-style overview. Honest framing: what works today, what is
 * blocked, and why. The aesthetic is intentionally dense — Bloomberg
 * Terminal rather than a glossy DeFi front page.
 */
export function LandingPage() {
  const { root, aspRoot, loading } = usePoolContext();
  const { notes } = useNoteVault();

  return (
    <>
      <section className="pt-8 pb-10 grid grid-cols-12 gap-x-6 gap-y-6">
        <div className="col-span-12 lg:col-span-8">
          <p className="eyebrow">Lumina · Institutional ZK privacy pool</p>
          <h1 className="font-display text-[56px] md:text-[72px] leading-[0.95] tracking-[-0.03em] mt-3">
            Cryptographic compliance for shielded liquidity.
          </h1>
          <p className="text-[15px] text-ink mt-6 max-w-[58ch] leading-relaxed">
            Lumina is a shielded pool on Stellar where deposits record only a
            cryptographic commitment, and withdrawals require a Groth16 proof
            of note ownership <em>and</em> exclusion from a third-party
            compliance blocklist — enforced on-chain, without deanonymizing
            honest users.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/deposit" className="btn btn-solid">
              Deposit
            </Link>
            <Link to="/proof-lab" className="btn">
              Open Proof Lab
            </Link>
            <Link to="/developers" className="btn">
              Developer reference
            </Link>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4">
          <div className="border border-rule bg-paperEdge p-5">
            <p className="eyebrow">Live · Testnet</p>
            {isDeployed() ? (
              <table className="ledger w-full mt-4">
                <tbody>
                  <tr>
                    <td className="text-inkSoft uppercase text-micro tracking-[0.12em]">
                      Pool root
                    </td>
                    <td className="num text-ink" title={root ?? undefined}>
                      {root ? truncate(root, 10, 10) : loading ? "reading…" : "—"}
                    </td>
                  </tr>
                  <tr>
                    <td className="text-inkSoft uppercase text-micro tracking-[0.12em]">
                      ASP root
                    </td>
                    <td className="num text-ink" title={aspRoot ?? undefined}>
                      {aspRoot ? truncate(aspRoot, 10, 10) : loading ? "reading…" : "—"}
                    </td>
                  </tr>
                  <tr>
                    <td className="text-inkSoft uppercase text-micro tracking-[0.12em]">
                      Saved notes
                    </td>
                    <td className="num text-ink">{notes.length}</td>
                  </tr>
                  <tr>
                    <td className="text-inkSoft uppercase text-micro tracking-[0.12em]">
                      Contract
                    </td>
                    <td className="num text-ink" title={CONTRACT_ID}>
                      <a
                        className="underline"
                        href={`https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {truncate(CONTRACT_ID, 8, 8)} ↗
                      </a>
                    </td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <Notice title="Contract not yet deployed">
                Set VITE_CONTRACT_ID in .env to enable live reads and deposits.
              </Notice>
            )}
          </div>
        </div>
      </section>

      <Section
        index="How it works"
        title="Pool + proof + provider"
        note="Three primitives, three failure modes, three honest answers."
      >
        <div className="grid grid-cols-12 gap-x-6 gap-y-6 text-[13px] text-inkSoft">
          <div className="col-span-12 md:col-span-4 border border-rule p-5 bg-paperEdge">
            <p className="eyebrow text-ink mb-2">Privacy pool</p>
            <p>
              Each deposit commits H(k, s, amount) on-chain. No amount, no
              owner, no link. Withdrawals can come from any prior deposit;
              the chain cannot tell which.
            </p>
          </div>
          <div className="col-span-12 md:col-span-4 border border-rule p-5 bg-paperEdge">
            <p className="eyebrow text-ink mb-2">ZK proof</p>
            <p>
              A Groth16 proof over BN254 attests to two facts: the spender
              knows the preimage of a real leaf, and the spender's key is not
              in the ASP blocklist.
            </p>
          </div>
          <div className="col-span-12 md:col-span-4 border border-rule p-5 bg-paperEdge">
            <p className="eyebrow text-ink mb-2">ASP</p>
            <p>
              An Association Set Provider publishes a Merkle root of sanctioned
              public keys. The contract enforces the registered root; admin
              can rotate.
            </p>
          </div>
        </div>
      </Section>

      <Section index="Status" title="Where things stand">
        <div className="grid grid-cols-12 gap-4">
          <StatusTile title="Deposits" tag="working" body="Live on Testnet. Tested, deployed, hash-bounded." />
          <StatusTile
            title="Withdrawals"
            tag="fail-closed"
            body="Verifier is a disclosed stub. BN254 host functions (CAP-0074) not yet on any Stellar network."
          />
          <StatusTile title="Compliance" tag="wired" body="ASP root registered, non-membership proven in-circuit. Pending verifier." />
          <StatusTile title="Poseidon2" tag="pending" body="Target hash. Today the contract uses SHA-256. Migration needs CAP-0075." />
        </div>
      </Section>

      <Section index="Call" title="A note on honesty">
        <p className="text-[14px] text-ink max-w-[68ch] leading-relaxed">
          This product deliberately fails closed today. Withdrawals are
          cryptographically prevented from succeeding until the platform
          capabilities they depend on exist. We document that everywhere it
          matters — code comments, the verifier, the UI — rather than
          simulate a happy path that doesn't exist. If a future build ever
          shows a successful withdrawal here, that is news worth checking.
        </p>
      </Section>
    </>
  );
}

function StatusTile({
  title,
  tag,
  body,
}: {
  title: string;
  tag: "working" | "fail-closed" | "wired" | "pending";
  body: string;
}) {
  const styles: Record<string, string> = {
    working: "border-ink text-ink",
    "fail-closed": "border-oxblood text-oxblood",
    wired: "border-ink text-ink",
    pending: "border-rule text-inkFaint",
  };
  return (
    <div className="col-span-12 md:col-span-6 lg:col-span-3 border border-rule p-4">
      <div className="flex items-baseline justify-between">
        <p className="eyebrow">{title}</p>
        <span className={`text-[10px] uppercase tracking-[0.14em] border px-1.5 py-0.5 ${styles[tag]}`}>
          {tag}
        </span>
      </div>
      <p className="text-[12px] text-inkSoft mt-3 leading-relaxed">{body}</p>
    </div>
  );
}
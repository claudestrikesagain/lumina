import { Link } from "react-router-dom";
import { CONTRACT_ID } from "../lib/contract";
import { Notice, Section } from "../components/ui";

/**
 * About / "what this is" page. Mirrors the README's tone: institutional,
 * honest, not promotional.
 */
export function AboutPage() {
  return (
    <>
      <header className="pb-8 border-b border-rule">
        <p className="eyebrow">Reference</p>
        <h1 className="font-display text-[44px] md:text-[56px] leading-[0.98] tracking-[-0.03em] mt-2">
          About Lumina
        </h1>
      </header>

      <Section
        index="What"
        title="What this is"
        note="Read the README for the full design."
      >
        <div className="space-y-4 text-[14px] text-ink max-w-[68ch] leading-relaxed">
          <p>
            Lumina is a shielded liquidity pool on Stellar where deposits
            record only a cryptographic commitment, and withdrawals require a
            zero-knowledge proof of note ownership <em>and</em> exclusion from
            a configurable third-party compliance blocklist.
          </p>
          <p>
            The compliance check is enforced on-chain and cryptographically:
            there is no intermediary who can choose to permit a withdrawal.
            The contract will reject any withdrawal whose proof does not
            demonstrate non-membership against the registered ASP root.
          </p>
          <p>
            The deposit flow is fully live on Testnet. The withdrawal flow is
            fail-closed today — the on-chain Groth16 verifier is a disclosed,
            tested, stub returning <code className="font-mono">false</code>{" "}
            unconditionally, pending BN254 host functions (CAP-0074). The
            Proof Lab exercises the rejection on-chain so you can see it
            verbatim rather than take it on faith.
          </p>
        </div>
      </Section>

      <Section index="Why" title="Why the honesty">
        <p className="text-[14px] text-ink max-w-[68ch] leading-relaxed">
          A privacy pool that quietly does not enforce its compliance model is
          not a privacy pool — it is a money-laundering primitive. A privacy
          pool that quietly does not let users withdraw is not a privacy pool
          either. Lumina is honest about which half is live and which half is
          pending. When the verifier ships, withdrawals begin working. The
          fail-closed behaviour is, by design, the loudest line in the
          product.
        </p>
      </Section>

      <Section index="Resources" title="Resources">
        <ul className="space-y-2 text-[14px]">
          <li>
            <Link to="/developers" className="underline">
              Developer reference
            </Link>{" "}
            — contract interface, note format, hash-function note, live derivation tool.
          </li>
          <li>
            <Link to="/compliance" className="underline">
              Compliance layer
            </Link>{" "}
            — what an ASP is and how exclusion is proven.
          </li>
          <li>
            <Link to="/proof-lab" className="underline">
              Proof Lab
            </Link>{" "}
            — interactive walkthrough with the live fail-closed rejection.
          </li>
          <li>
            <a
              className="underline"
              href={`https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID}`}
              target="_blank"
              rel="noreferrer"
            >
              Contract on Stellar Expert ↗
            </a>
          </li>
        </ul>
        <div className="mt-6">
          <Notice title="No custodial relationship">
            This interface does not custody funds. The pool is a Soroban
            contract; deposits and (eventually) withdrawals are direct
            contract calls signed by your connected wallet.
          </Notice>
        </div>
      </Section>
    </>
  );
}
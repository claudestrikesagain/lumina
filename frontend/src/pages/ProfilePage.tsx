import { useState } from 'react'

export function ProfilePage() {
  // Generic profile — pulls from common Stellar wallet context APIs.
  // Each project's wallet context may differ; this template renders the
  // saas-multi-page minimum (address, network, disconnect) and tolerates
  // missing fields by falling back to localStorage-injected envs.
  const [address] = useState<string | null>(
    typeof window !== 'undefined' ? (window as any).connectedWallet ?? null : null,
  )
  const network = (import.meta as any).env?.VITE_NETWORK_PASSPHRASE?.includes('Test') ? 'Testnet' : 'Public'

  if (!address) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-xl font-bold mb-2">Profile</h1>
        <p className="text-sm text-zinc-400">Connect a wallet to view your profile.</p>
      </div>
    )
  }

  const truncated = `${address.slice(0, 6)}…${address.slice(-6)}`

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold">Profile</h1>
        <p className="text-xs text-zinc-500">Your wallet identity and account activity.</p>
      </div>
      <div className="rounded-2xl border border-black/5 bg-white shadow-sm p-6 space-y-2">
        <div className="text-xs uppercase tracking-wide text-zinc-500">Address</div>
        <div className="font-mono text-sm">{truncated}</div>
        <div className="text-xs text-zinc-500 break-all">{address}</div>
      </div>
      <div className="rounded-2xl border border-black/5 bg-white shadow-sm p-4">
        <div className="text-xs uppercase tracking-wide text-zinc-500">Network</div>
        <div className="text-sm font-medium">{network}</div>
      </div>
      <p className="text-xs text-zinc-500">
        Recent activity is loaded on per-feature pages. Use the in-app Activity tab for full history.
      </p>
    </div>
  )
}

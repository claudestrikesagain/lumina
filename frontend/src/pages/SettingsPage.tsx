import { useState } from 'react'

export function SettingsPage() {
  const rpc = (import.meta as any).env?.VITE_RPC_URL ?? 'https://soroban-testnet.stellar.org'
  const [devMode, setDevMode] = useState(false)
  const [confirm, setConfirm] = useState(false)

  const clearLocal = () => {
    if (typeof window !== 'undefined') {
      localStorage.clear()
    }
    setConfirm(false)
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold">Settings</h1>
        <p className="text-xs text-zinc-500">Network, advanced toggles, and local data management.</p>
      </div>
      <section className="rounded-2xl border border-black/5 bg-white shadow-sm p-6 space-y-2">
        <div className="text-xs uppercase tracking-wide text-zinc-500">Network</div>
        <div className="font-mono text-xs text-zinc-700 break-all">{rpc}</div>
      </section>
      <section className="rounded-2xl border border-black/5 bg-white shadow-sm p-6 space-y-2">
        <div className="text-xs uppercase tracking-wide text-zinc-500">Advanced</div>
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input type="checkbox" checked={devMode} onChange={(e) => setDevMode(e.target.checked)} />
          Developer mode (verbose logs)
        </label>
      </section>
      <section className="rounded-2xl border border-rose-200 bg-rose-50/50 p-6 space-y-2">
        <div className="text-xs uppercase tracking-wide text-rose-700">Danger zone</div>
        <p className="text-xs text-zinc-600">
          Clear all locally stored preferences. On-chain state is unaffected.
        </p>
        {confirm ? (
          <div className="flex gap-2">
            <button onClick={clearLocal} className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-medium text-white">
              Confirm clear
            </button>
            <button onClick={() => setConfirm(false)} className="rounded-lg border border-black/10 bg-white px-4 py-2 text-xs">
              Cancel
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirm(true)} className="rounded-lg border border-rose-300 bg-white text-rose-700 px-4 py-2 text-xs">
            Clear local data
          </button>
        )}
      </section>
    </div>
  )
}

import { useState } from 'react'
import { Settings, ShieldCheck, Key, Server, Database, CheckCircle2 } from 'lucide-react'

export function AdminSettingsPage() {
  const [demoPayments, setDemoPayments] = useState(true)
  const [rateLimiting, setRateLimiting] = useState(true)
  const [holdMinutes, setHoldMinutes] = useState(10)
  const [saved, setSaved] = useState(false)

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <span className="text-[10px] font-mono font-bold tracking-widest text-[#E06D3B] uppercase">
          SYSTEM CONFIGURATION
        </span>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900 mt-0.5">
          Platform Settings & Security Knobs
        </h1>
        <p className="text-xs text-slate-500">
          Tune reservation hold windows, external provider API keys, and payment gateway modes.
        </p>
      </div>

      {saved && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-600" />
          <span>Platform configuration updated successfully.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Reservation Engine Knobs */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-4">
          <h3 className="font-serif font-bold text-base text-slate-900 flex items-center gap-2">
            <Server size={18} className="text-[#0B192C]" />
            <span>Reservation Engine & Inventory Holds</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <label className="space-y-1 block">
              <span className="font-semibold text-slate-700">Temporary Hold Window (Minutes)</span>
              <input
                type="number"
                min={2}
                max={30}
                value={holdMinutes}
                onChange={e => setHoldMinutes(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono text-xs"
              />
              <span className="text-[11px] text-slate-400 block">Default: 10 minutes before automated rollback</span>
            </label>

            <label className="space-y-1 block">
              <span className="font-semibold text-slate-700">Convenience & Statutory Fee (₹)</span>
              <input
                type="number"
                disabled
                value={59}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-100 font-mono text-xs text-slate-500"
              />
              <span className="text-[11px] text-slate-400 block">Fixed statutory handling fee</span>
            </label>
          </div>
        </div>

        {/* Security & Cryptography Status */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-4">
          <h3 className="font-serif font-bold text-base text-slate-900 flex items-center gap-2">
            <ShieldCheck size={18} className="text-emerald-600" />
            <span>Cryptographic & Gate Security</span>
          </h3>

          <div className="divide-y divide-slate-100 text-xs">
            <div className="py-2.5 flex items-center justify-between">
              <div>
                <strong className="block text-slate-800">HMAC-SHA256 Ticket Signing</strong>
                <span className="text-slate-400">Cryptographically binds booking reference and venue key</span>
              </div>
              <span className="font-mono text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                ACTIVE
              </span>
            </div>

            <div className="py-2.5 flex items-center justify-between">
              <div>
                <strong className="block text-slate-800">Single-Use Turnstile Check-In Lockout</strong>
                <span className="text-slate-400">Prevents pass sharing and duplicate gate entry</span>
              </div>
              <span className="font-mono text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                ENFORCED
              </span>
            </div>

            <div className="py-2.5 flex items-center justify-between">
              <div>
                <strong className="block text-slate-800">Idempotency Key Deduplication</strong>
                <span className="text-slate-400">Guarantees double-clicks never create duplicate reservations</span>
              </div>
              <span className="font-mono text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                ENFORCED
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-[#0B192C] text-white hover:bg-[#E06D3B] text-xs font-semibold shadow-md transition-colors"
          >
            Save Platform Settings
          </button>
        </div>
      </form>
    </div>
  )
}


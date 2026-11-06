import { useState, useEffect } from 'react'
import { History, ShieldCheck, RefreshCw, Filter } from 'lucide-react'
import { apiRequest } from '../../../shared/api'
import type { AuditLog } from '../../../shared/types'

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)

  const fetchLogs = () => {
    setLoading(true)
    apiRequest<AuditLog[]>('/admin/audit-logs')
      .then(res => setLogs(res))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono font-bold tracking-widest text-[#E06D3B] uppercase">
            COMPLIANCE & GOVERNANCE
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900 mt-0.5">
            Tamper-Evident Administrative Audit Trail
          </h1>
          <p className="text-xs text-slate-500">
            Immutable log of all administrative actions, inventory adjustments, and gate validations.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors self-start sm:self-auto"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-mono text-[10px]">
              <tr>
                <th className="px-6 py-3.5">Log ID</th>
                <th className="px-6 py-3.5">Actor & Role</th>
                <th className="px-6 py-3.5">Action</th>
                <th className="px-6 py-3.5">Entity Type & Ref</th>
                <th className="px-6 py-3.5">Details</th>
                <th className="px-6 py-3.5 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {logs.map(l => (
                <tr key={l.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-slate-400">#{l.id}</td>
                  <td className="px-6 py-4">
                    <strong className="block text-slate-900">{l.actor_email}</strong>
                    <span className="text-[10px] font-mono font-bold text-[#E06D3B] uppercase">{l.actor_role}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded">
                      {l.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-[11px] text-slate-600">
                    {l.entity_type} · {l.entity_id}
                  </td>
                  <td className="px-6 py-4 text-slate-600 max-w-sm truncate">{l.details}</td>
                  <td className="px-6 py-4 text-right font-mono text-slate-400">
                    {new Date(l.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}


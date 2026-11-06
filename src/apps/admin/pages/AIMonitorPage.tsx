import { useState, useEffect } from 'react'
import { Bot, Sparkles, CheckCircle2, Clock, MessageSquare, RefreshCw } from 'lucide-react'
import { apiRequest } from '../../../shared/api'

export function AIMonitorPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const fetchAIMonitor = () => {
    setLoading(true)
    apiRequest('/admin/ai-monitor')
      .then(res => setData(res))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchAIMonitor()
  }, [])

  if (loading || !data) {
    return <div className="py-20 text-center font-mono text-xs text-slate-500">Querying AI Concierge Telemetry...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono font-bold tracking-widest text-[#E06D3B] uppercase">
            CONVERSATIONAL TELEMETRY
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900 mt-0.5">
            AI Travel Concierge Monitoring
          </h1>
          <p className="text-xs text-slate-500">
            Monitor Gemini function-calling tool invocations, multilingual prompt flows, and latency.
          </p>
        </div>

        <button
          onClick={fetchAIMonitor}
          className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors self-start sm:self-auto"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-xs text-slate-500 uppercase font-semibold">Total Sessions</span>
          <strong className="font-mono text-2xl font-bold text-slate-900 block">{data.total_conversations}</strong>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-xs text-slate-500 uppercase font-semibold">Messages Processed</span>
          <strong className="font-mono text-2xl font-bold text-slate-900 block">{data.total_messages}</strong>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-xs text-slate-500 uppercase font-semibold">Tool Accuracy Rate</span>
          <strong className="font-mono text-2xl font-bold text-emerald-600 block">{data.tool_call_accuracy}</strong>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-xs text-slate-500 uppercase font-semibold">Avg Latency</span>
          <strong className="font-mono text-2xl font-bold text-blue-600 block">{data.average_latency_ms}ms</strong>
        </div>
      </div>

      {/* Session Ledger Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-serif font-bold text-base text-slate-900">
            Recent Conversational Interactions
          </h3>
          <span className="text-xs text-slate-400 font-mono">Live Session Buffer</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-mono text-[10px]">
              <tr>
                <th className="px-6 py-3.5">Session ID</th>
                <th className="px-6 py-3.5">Language</th>
                <th className="px-6 py-3.5">Message Depth</th>
                <th className="px-6 py-3.5">Last Inquired Prompt</th>
                <th className="px-6 py-3.5 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {data.recent_sessions.map((s: any) => (
                <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-slate-900">{s.id}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-mono uppercase text-[11px] font-bold">
                      {s.language}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono font-semibold">{s.message_count} msgs</td>
                  <td className="px-6 py-4 max-w-sm truncate text-slate-600 italic">
                    "{s.last_user_query || 'Session started'}"
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-slate-400">
                    {new Date(s.created_at).toLocaleTimeString()}
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


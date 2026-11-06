import { useState, useEffect } from 'react'
import { RotateCcw, Check, RefreshCw, AlertCircle } from 'lucide-react'
import { apiRequest } from '../../../shared/api'

export function RefundsManagement() {
  const [refunds, setRefunds] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  const fetchRefunds = () => {
    setLoading(true)
    apiRequest('/admin/refunds')
      .then(res => setRefunds(res))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchRefunds()
  }, [])

  const handleProcessRefund = async (refundId: string) => {
    setProcessingId(refundId)
    try {
      await apiRequest(`/admin/refunds/${refundId}/process`, { method: 'POST' })
      fetchRefunds()
    } catch (err: any) {
      alert(err.message || 'Refund processing failed')
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono font-bold tracking-widest text-[#E06D3B] uppercase">
            CANCELLATION & DISPUTES
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900 mt-0.5">
            Refunds & Return Ledger
          </h1>
          <p className="text-xs text-slate-500">
            Review traveller cancellation requests and approve automated payment returns.
          </p>
        </div>

        <button
          onClick={fetchRefunds}
          className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors self-start sm:self-auto"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
        {refunds.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 font-mono">
            No active refund requests in queue.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-mono text-[10px]">
                <tr>
                  <th className="px-6 py-3.5">Refund ID</th>
                  <th className="px-6 py-3.5">Booking Ref</th>
                  <th className="px-6 py-3.5">Customer & Event</th>
                  <th className="px-6 py-3.5">Refund Amount</th>
                  <th className="px-6 py-3.5">Reason</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {refunds.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-slate-900">{r.id}</td>
                    <td className="px-6 py-4 font-mono text-[#E06D3B]">{r.booking_id}</td>
                    <td className="px-6 py-4">
                      <strong className="block text-slate-900">{r.customer_name}</strong>
                      <span className="text-[11px] text-slate-400">{r.event_title}</span>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-slate-900">₹{r.amount}</td>
                    <td className="px-6 py-4 text-slate-600 max-w-xs">{r.reason}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          r.status === 'PROCESSED'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {r.status !== 'PROCESSED' && (
                        <button
                          onClick={() => handleProcessRefund(r.id)}
                          disabled={processingId === r.id}
                          className="px-3 py-1 rounded-lg bg-[#0B192C] text-white hover:bg-emerald-700 text-xs font-semibold transition-colors shadow-xs"
                        >
                          {processingId === r.id ? 'Processing...' : 'Approve Refund'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}


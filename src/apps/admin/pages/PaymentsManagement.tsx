import { useState, useEffect } from 'react'
import { CreditCard, Download, RefreshCw, CheckCircle2, RotateCcw } from 'lucide-react'
import { apiRequest } from '../../../shared/api'

export function PaymentsManagement() {
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPayments = () => {
    setLoading(true)
    apiRequest('/admin/payments')
      .then(res => setPayments(res))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchPayments()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono font-bold tracking-widest text-[#E06D3B] uppercase">
            SETTLEMENTS & GATEWAYS
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900 mt-0.5">
            Payment Transactions Ledger
          </h1>
          <p className="text-xs text-slate-500">
            Audit payment attempts, Razorpay test modes, simulated authorizations, and verified payouts.
          </p>
        </div>

        <button
          onClick={fetchPayments}
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
                <th className="px-6 py-3.5">Payment ID</th>
                <th className="px-6 py-3.5">Booking Ref</th>
                <th className="px-6 py-3.5">Customer</th>
                <th className="px-6 py-3.5">Gateway</th>
                <th className="px-6 py-3.5">Amount</th>
                <th className="px-6 py-3.5">Verification</th>
                <th className="px-6 py-3.5 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {payments.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-slate-900">{p.id}</td>
                  <td className="px-6 py-4 font-mono text-[#E06D3B] font-semibold">{p.booking_id}</td>
                  <td className="px-6 py-4">
                    <strong className="block text-slate-900">{p.customer_name}</strong>
                    <span className="text-[11px] text-slate-400 font-mono">{p.customer_email}</span>
                  </td>
                  <td className="px-6 py-4 font-mono font-medium">{p.gateway}</td>
                  <td className="px-6 py-4 font-mono font-bold text-slate-900">₹{p.amount}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        p.status === 'VERIFIED'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-purple-50 text-purple-800 border border-purple-200'
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-slate-400">
                    {new Date(p.created_at).toLocaleString()}
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


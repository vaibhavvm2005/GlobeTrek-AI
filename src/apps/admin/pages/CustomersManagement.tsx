import { useState, useEffect } from 'react'
import { Users, Search, RefreshCw, Mail, Phone, Calendar } from 'lucide-react'
import { apiRequest } from '../../../shared/api'

export function CustomersManagement() {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const fetchCustomers = () => {
    setLoading(true)
    apiRequest('/admin/customers')
      .then(res => setCustomers(res))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchCustomers()
  }, [])

  const filtered = customers.filter(c =>
    !search ||
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono font-bold tracking-widest text-[#E06D3B] uppercase">
            TRAVELLER DIRECTORY
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900 mt-0.5">
            Customer Profiles & Lifetime Value
          </h1>
          <p className="text-xs text-slate-500">
            Registered travellers, cumulative ticket purchases, and loyalty metrics.
          </p>
        </div>

        <button
          onClick={fetchCustomers}
          className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors self-start sm:self-auto"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      <div className="p-4 rounded-2xl bg-white border border-slate-200 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by customer name or email..."
            className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none"
          />
        </div>
        <span className="text-xs text-slate-500 font-mono">
          Total: <strong>{filtered.length}</strong> travellers
        </span>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-mono text-[10px]">
              <tr>
                <th className="px-6 py-3.5">Customer</th>
                <th className="px-6 py-3.5">Contact</th>
                <th className="px-6 py-3.5">Confirmed Bookings</th>
                <th className="px-6 py-3.5">Lifetime Spend</th>
                <th className="px-6 py-3.5 text-right">Member Since</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#0B192C] text-white flex items-center justify-center font-bold text-xs">
                        {c.full_name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <strong className="block text-slate-900 text-xs sm:text-sm font-semibold">{c.full_name}</strong>
                        <span className="text-[11px] text-slate-400 font-mono">ID: {c.id}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 space-y-0.5">
                    <div className="flex items-center gap-1.5 text-slate-600 font-mono text-[11px]">
                      <Mail size={12} className="text-slate-400" />
                      <span>{c.email}</span>
                    </div>
                    {c.phone && (
                      <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[11px]">
                        <Phone size={12} className="text-slate-400" />
                        <span>{c.phone}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-slate-900">
                    {c.total_bookings} passes
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-emerald-700 text-sm">
                    ₹{c.total_spent}
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-slate-400">
                    {new Date(c.created_at).toLocaleDateString()}
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


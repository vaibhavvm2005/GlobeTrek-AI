import { useState, useEffect } from 'react'
import { BookOpen, Search, Download, Filter, Eye, RefreshCw, X, ShieldCheck } from 'lucide-react'
import { apiRequest } from '../../../shared/api'
import type { Booking } from '../../../shared/types'

export function BookingsManagement() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)

  const fetchBookings = () => {
    setLoading(true)
    apiRequest(`/admin/bookings?status=${statusFilter}`)
      .then(res => setBookings(res))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchBookings()
  }, [statusFilter])

  const exportCSV = () => {
    const headers = ['Booking ID', 'Customer Name', 'Customer Email', 'Experience', 'Amount (INR)', 'Status', 'Date']
    const rows = bookings.map(b => [
      b.id,
      `"${b.customer_name}"`,
      `"${b.customer_email}"`,
      `"${b.event_title}"`,
      b.total_amount,
      b.status,
      `"${b.created_at}"`,
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `wayfarer-bookings-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const filtered = bookings.filter(b =>
    !search ||
    b.id.toLowerCase().includes(search.toLowerCase()) ||
    b.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    b.customer_email.toLowerCase().includes(search.toLowerCase()) ||
    b.event_title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono font-bold tracking-widest text-[#E06D3B] uppercase">
            RESERVATION LEDGER
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900 mt-0.5">
            Master Booking Management
          </h1>
          <p className="text-xs text-slate-500">
            Query booking state machines, review itemized visitor passes, and export accounting ledgers.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={exportCSV}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
          <button
            onClick={fetchBookings}
            className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors"
            title="Refresh bookings"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by reference, name, or experience..."
            className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none"
          />
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium w-full sm:w-auto">
          {['ALL', 'CONFIRMED', 'PENDING_PAYMENT', 'CANCELLED', 'COMPLETED'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg border transition-colors ${
                statusFilter === st
                  ? 'bg-[#0B192C] text-white border-[#0B192C] font-semibold'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-mono text-[10px]">
              <tr>
                <th className="px-6 py-3.5">Reference</th>
                <th className="px-6 py-3.5">Customer</th>
                <th className="px-6 py-3.5">Experience</th>
                <th className="px-6 py-3.5">Total Amount</th>
                <th className="px-6 py-3.5">Payment</th>
                <th className="px-6 py-3.5">State</th>
                <th className="px-6 py-3.5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.map(b => (
                <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-slate-900">{b.id}</td>
                  <td className="px-6 py-4">
                    <strong className="block text-slate-900 text-xs">{b.customer_name}</strong>
                    <span className="text-[11px] text-slate-400 font-mono">{b.customer_email}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-serif font-bold text-slate-800 block">{b.event_title}</span>
                    <span className="text-[11px] text-slate-400">{b.city}</span>
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-slate-900">₹{b.total_amount}</td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-[11px] font-semibold text-slate-700 block">
                      {b.gateway || 'SIMULATED'}
                    </span>
                    <span className="text-[10px] text-emerald-700 font-bold">VERIFIED</span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        b.status === 'CONFIRMED' || b.status === 'COMPLETED'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : b.status === 'PENDING_PAYMENT'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      {b.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setSelectedBooking(b)}
                      className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
                      title="Inspect record"
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] uppercase font-mono text-slate-400 font-bold">Booking Record</span>
                <h3 className="font-mono text-xl font-bold text-slate-900">
                  {selectedBooking.id}
                </h3>
              </div>
              <button onClick={() => setSelectedBooking(null)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block font-medium">Status</span>
                  <span className="font-bold text-slate-900 mt-0.5 block">{selectedBooking.status}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Recorded At</span>
                  <span className="font-mono text-slate-800 mt-0.5 block">
                    {new Date(selectedBooking.created_at).toLocaleString()}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block font-semibold mb-1">Customer Profile</span>
                <div className="p-3 rounded-2xl bg-white border border-slate-200 space-y-1">
                  <strong className="block text-slate-900">{selectedBooking.customer_name}</strong>
                  <span className="text-slate-500 font-mono block">{selectedBooking.customer_email}</span>
                  <span className="text-slate-500 font-mono block">{selectedBooking.customer_phone || 'No phone recorded'}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block font-semibold mb-1">Itemized Line Items</span>
                <div className="p-3 rounded-2xl bg-white border border-slate-200 space-y-2">
                  <h4 className="font-serif font-bold text-slate-900">{selectedBooking.event_title} ({selectedBooking.city})</h4>
                  <ul className="space-y-1 border-t border-slate-100 pt-2 font-mono">
                    {(selectedBooking.items || []).map((it, i) => (
                      <li key={i} className="flex justify-between text-slate-700">
                        <span>{it.ticket_name} × {it.quantity}</span>
                        <span>₹{it.unit_price * it.quantity}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex justify-between border-t border-slate-100 pt-2 font-bold text-slate-900">
                    <span>Total Amount:</span>
                    <span>₹{selectedBooking.total_amount}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedBooking(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


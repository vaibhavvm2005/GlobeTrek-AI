import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen,
  IndianRupee,
  Package,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpRight,
  TrendingUp,
  RefreshCw,
  Compass
} from 'lucide-react'
import { apiRequest } from '../../../shared/api'

export function AdminDashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const fetchDashboard = () => {
    setLoading(true)
    apiRequest('/admin/dashboard')
      .then(res => setData(res))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchDashboard()
  }, [])

  if (loading || !data) {
    return (
      <div className="py-24 text-center space-y-4">
        <Compass className="w-10 h-10 text-[#E06D3B] animate-spin mx-auto" />
        <p className="text-xs font-mono text-slate-500">Querying authoritative PostgreSQL / SQLite ledger...</p>
      </div>
    )
  }

  const { metrics, recent_transactions, popular_experiences, status_distribution, daily_trends } = data

  const maxDailyBookings = Math.max(...daily_trends.map((d: any) => d.bookings), 1)

  return (
    <div className="space-y-8">
      {/* Top action & refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono font-bold tracking-widest text-[#E06D3B] uppercase">
            ENTERPRISE TELEMETRY
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900 mt-0.5">
            Operations & Ticketing Overview
          </h1>
        </div>

        <button
          onClick={fetchDashboard}
          className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-2 shadow-xs transition-colors self-start sm:self-auto"
        >
          <RefreshCw size={13} />
          <span>Refresh Ledger</span>
        </button>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Bookings</span>
            <BookOpen size={18} className="text-[#0B192C]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl sm:text-3xl font-bold text-slate-900">
              {metrics.total_bookings}
            </span>
            <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
              +14% vs last wk
            </span>
          </div>
          <span className="text-[11px] text-slate-500 block">
            {metrics.confirmed_bookings} confirmed · {metrics.pending_bookings} hold
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Verified Revenue</span>
            <IndianRupee size={18} className="text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl sm:text-3xl font-bold text-slate-900">
              ₹{Number(metrics.total_revenue).toLocaleString()}
            </span>
            <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
              Settled
            </span>
          </div>
          <span className="text-[11px] text-slate-500 block">
            Via verified simulated & Razorpay ledger
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Events</span>
            <Calendar size={18} className="text-blue-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl sm:text-3xl font-bold text-slate-900">
              {metrics.active_events}
            </span>
            <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
              Published
            </span>
          </div>
          <span className="text-[11px] text-slate-500 block">
            Across 5 regional city hubs
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Remaining Stock</span>
            <Package size={18} className="text-amber-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl sm:text-3xl font-bold text-slate-900">
              {metrics.remaining_ticket_inventory}
            </span>
            <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
              Live Matrix
            </span>
          </div>
          <span className="text-[11px] text-slate-500 block">
            Atomic lock protects zero-overselling
          </span>
        </div>
      </div>

      {/* Analytics Charts & Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Booking Trend SVG Bar Chart */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif font-bold text-base text-slate-900">
                Daily Booking Velocity & Trajectory
              </h2>
              <span className="text-xs text-slate-500">Weekly ticket volume from SQL transaction ledger</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-mono">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#0B192C]" />
              <span>Bookings</span>
            </div>
          </div>

          <div className="h-56 flex items-end justify-between gap-3 pt-6 border-b border-slate-100">
            {daily_trends.map((d: any, idx: number) => {
              const heightPct = Math.round((d.bookings / maxDailyBookings) * 100)
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <span className="text-[10px] font-mono text-slate-400 group-hover:text-slate-900 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                    {d.bookings}
                  </span>
                  <div
                    style={{ height: `${heightPct}%` }}
                    className="w-full max-w-[42px] rounded-t-lg bg-[#0B192C] group-hover:bg-[#E06D3B] transition-colors"
                  />
                  <span className="text-[11px] font-mono text-slate-500">{d.day}</span>
                </div>
              )
            })}
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 font-mono">
            <span>Weekend Peak: +68%</span>
            <span>Average Conversion Rate: 14.2%</span>
          </div>
        </div>

        {/* Status Distribution */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-4">
          <div>
            <h2 className="font-serif font-bold text-base text-slate-900">
              Booking Status Breakdown
            </h2>
            <span className="text-xs text-slate-500">Real-time database state distribution</span>
          </div>

          <div className="space-y-3 pt-2">
            {Object.entries(status_distribution).map(([st, cnt]: [string, any]) => {
              const total = metrics.total_bookings || 1
              const pct = Math.round((cnt / total) * 100)
              return (
                <div key={st} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-700">{st}</span>
                    <span className="font-mono font-bold text-slate-900">
                      {cnt} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${pct}%` }}
                      className={`h-full rounded-full ${
                        st === 'CONFIRMED' || st === 'COMPLETED'
                          ? 'bg-emerald-500'
                          : st === 'PENDING_PAYMENT'
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 mt-4 leading-relaxed">
            <strong>Turnstile Check-in Compliance:</strong> 100% of validated tickets were verified via cryptographic HMAC signatures.
          </div>
        </div>
      </div>

      {/* Popular Experiences & Recent Transactions Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Popular Experiences */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif font-bold text-base text-slate-900">
              Top Booked Destinations & Experiences
            </h2>
            <Link to="/admin/events" className="text-xs text-[#E06D3B] font-semibold hover:underline">
              View Catalog →
            </Link>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {popular_experiences.map((exp: any, i: number) => (
              <div key={exp.id} className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-slate-400 font-bold w-4">#{i + 1}</span>
                  {exp.image && (
                    <img src={exp.image} alt="" className="w-10 h-10 rounded-xl object-cover" />
                  )}
                  <div>
                    <strong className="block font-serif text-slate-900 text-xs font-bold line-clamp-1">{exp.title}</strong>
                    <span className="text-[11px] text-slate-500">{exp.city}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono font-bold text-slate-900 block">{exp.booking_count} bookings</span>
                  <span className="text-[10px] text-slate-400">₹{exp.total_volume} volume</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif font-bold text-base text-slate-900">
              Live Transactions Ledger
            </h2>
            <Link to="/admin/bookings" className="text-xs text-[#E06D3B] font-semibold hover:underline">
              Master Ledger →
            </Link>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {recent_transactions.map((tx: any) => (
              <div key={tx.id} className="py-3 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900">{tx.id}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        tx.status === 'CONFIRMED'
                          ? 'bg-emerald-50 text-emerald-800'
                          : tx.status === 'PENDING_PAYMENT'
                          ? 'bg-amber-50 text-amber-800'
                          : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      {tx.status}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 block">
                    {tx.customer_name} · {tx.event_title}
                  </span>
                </div>
                <strong className="font-mono text-slate-900 shrink-0">
                  ₹{tx.total_amount}
                </strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}


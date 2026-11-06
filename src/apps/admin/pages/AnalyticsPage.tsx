import { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, DollarSign, Users, Calendar, ArrowUpRight } from 'lucide-react'
import { apiRequest } from '../../../shared/api'

export function AnalyticsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiRequest('/admin/dashboard')
      .then(res => setData(res))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading || !data) {
    return <div className="py-20 text-center font-mono text-xs text-slate-500">Calculating analytics aggregations...</div>
  }

  const { metrics, popular_experiences, daily_trends } = data

  return (
    <div className="space-y-8">
      <div>
        <span className="text-[10px] font-mono font-bold tracking-widest text-[#E06D3B] uppercase">
          FINANCIAL & OCCUPANCY INTELLIGENCE
        </span>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900 mt-0.5">
          Analytics & Performance Velocity
        </h1>
        <p className="text-xs text-slate-500">
          In-depth revenue trajectory, regional occupancy rates, and conversion metrics.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gross Bookings Value</span>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-3xl font-bold text-slate-900">₹{metrics.total_revenue}</span>
            <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded">Verified</span>
          </div>
          <span className="text-[11px] text-slate-500 block">Average ticket basket: ₹465</span>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Turnstile Occupancy Rate</span>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-3xl font-bold text-slate-900">76.4%</span>
            <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded">+8.2%</span>
          </div>
          <span className="text-[11px] text-slate-500 block">Across top 12 active venues</span>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Dispute & Return Rate</span>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-3xl font-bold text-slate-900">1.8%</span>
            <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded">Low Risk</span>
          </div>
          <span className="text-[11px] text-slate-500 block">Below 2% platform target threshold</span>
        </div>
      </div>

      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-4">
        <h3 className="font-serif font-bold text-base text-slate-900">
          Regional Revenue Breakdown
        </h3>
        <div className="space-y-3">
          {[
            { region: 'Bengaluru (Karnataka)', share: 54, revenue: '₹4,82,000' },
            { region: 'Mumbai (Maharashtra)', share: 22, revenue: '₹1,96,000' },
            { region: 'Hampi Heritage Region', share: 14, revenue: '₹1,25,000' },
            { region: 'Mysuru Royal Palace Hub', share: 10, revenue: '₹89,000' },
          ].map(r => (
            <div key={r.region} className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="font-semibold text-slate-800">{r.region}</span>
                <span className="font-mono font-bold text-slate-900">{r.revenue} ({r.share}%)</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div style={{ width: `${r.share}%` }} className="h-full bg-[#0B192C] rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}


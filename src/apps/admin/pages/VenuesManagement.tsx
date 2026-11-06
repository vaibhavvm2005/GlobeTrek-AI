import { useState, useEffect } from 'react'
import { MapPin, Users, Mail, RefreshCw, ExternalLink } from 'lucide-react'
import { apiRequest } from '../../../shared/api'
import type { Venue } from '../../../shared/types'

export function VenuesManagement() {
  const [venues, setVenues] = useState<Venue[]>([])
  const [loading, setLoading] = useState(true)

  const fetchVenues = () => {
    setLoading(true)
    apiRequest<Venue[]>('/venues')
      .then(res => setVenues(res))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchVenues()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono font-bold tracking-widest text-[#E06D3B] uppercase">
            PHYSICAL INFRASTRUCTURE
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900 mt-0.5">
            Venues & Physical Capacities
          </h1>
          <p className="text-xs text-slate-500">
            Heritage halls, amphitheaters, sanctuaries, and auditoriums with authorized turnstile coordinates.
          </p>
        </div>

        <button
          onClick={fetchVenues}
          className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors self-start sm:self-auto"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {venues.map(v => (
          <div key={v.id} className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-[#E06D3B]">{v.id}</span>
              <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
                Capacity: {v.capacity.toLocaleString()} visitors
              </span>
            </div>
            <h3 className="font-serif font-bold text-lg text-slate-900">{v.name}</h3>
            <p className="text-xs text-slate-600 flex items-start gap-1.5">
              <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" />
              <span>{v.address}, {v.city}</span>
            </p>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono">
              <span>{v.latitude?.toFixed(4)}, {v.longitude?.toFixed(4)}</span>
              <span>{v.contact_email}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}


import { useState, useEffect } from 'react'
import { Landmark, MapPin, Search, Star, ExternalLink, RefreshCw } from 'lucide-react'
import { apiRequest } from '../../../shared/api'
import type { Experience } from '../../../shared/types'

export function AttractionsManagement() {
  const [attractions, setAttractions] = useState<Experience[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAttractions = () => {
    setLoading(true)
    apiRequest<Experience[]>('/events')
      .then(all => {
        const filtered = all.filter(e =>
          ['cat-museum', 'cat-attraction', 'cat-adventure'].includes(e.category_id) ||
          ['Museums', 'Tourist Attractions', 'Adventures'].includes(e.category_name || '')
        )
        setAttractions(filtered)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchAttractions()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono font-bold tracking-widest text-[#E06D3B] uppercase">
            HERITAGE & MONUMENTS
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900 mt-0.5">
            Museums & Tourist Attractions
          </h1>
          <p className="text-xs text-slate-500">
            Heritage monuments, historical galleries, archaeological sanctuaries, and turnstile opening hours.
          </p>
        </div>

        <button
          onClick={fetchAttractions}
          className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors self-start sm:self-auto"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {attractions.map(item => (
          <div key={item.id} className="p-5 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <img src={item.image} alt={item.title} className="w-full h-36 rounded-2xl object-cover" />
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span className="font-semibold text-slate-600">{item.city}</span>
                  <span className="font-mono text-amber-600 font-bold">★ {item.rating}</span>
                </div>
                <h3 className="font-serif font-bold text-base text-slate-900">{item.title}</h3>
                <p className="text-xs text-slate-500 line-clamp-2 mt-1">{item.description}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-slate-900">₹{item.price} base</span>
              <span className="text-slate-500">{item.inventory || 100} in stock</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}


import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Heart, Bell, Trash2, ArrowRight, ShieldCheck, Ticket } from 'lucide-react'
import { apiRequest } from '../../../shared/api'
import type { Experience } from '../../../shared/types'
import { ExperienceCard } from '../components/ExperienceCard'

export function WishlistPage() {
  const [items, setItems] = useState<Experience[]>([])
  const [loading, setLoading] = useState(true)
  const [priceWatchActive, setPriceWatchActive] = useState<Record<number, boolean>>({})

  useEffect(() => {
    let active = true
    apiRequest<Experience[]>('/wishlist')
      .then(res => {
        if (active) setItems(res)
      })
      .catch(() => {
        // Fallback demo saved items
        apiRequest<Experience[]>('/events').then(all => {
          if (active) setItems(all.slice(0, 3))
        })
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const togglePriceWatch = (id: number) => {
    setPriceWatchActive(prev => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  const removeItem = async (id: number) => {
    try {
      await apiRequest(`/wishlist/toggle?event_id=${id}`, { method: 'POST' })
      setItems(prev => prev.filter(it => it.id !== id))
    } catch {
      setItems(prev => prev.filter(it => it.id !== id))
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="border-b border-stone-200 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-bold tracking-widest text-[#D95D39] uppercase font-sans">
            SAVED EXPERIENCES & PRICE WATCH
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#0B192C] mt-1">
            Wishlist & Collections
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            Keep track of places you love, and monitor verified provider price drops.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-72 rounded-2xl bg-stone-200/60 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="p-16 text-center rounded-3xl bg-white border border-stone-200 space-y-4 max-w-md mx-auto">
          <Heart className="w-12 h-12 text-stone-300 mx-auto" />
          <h3 className="font-serif font-bold text-lg text-stone-800">Your wishlist is empty</h3>
          <p className="text-xs text-stone-500 leading-relaxed">
            Click the heart icon on any experience to save it here for price watching or future booking.
          </p>
          <Link
            to="/discover"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0B192C] text-white text-xs font-semibold"
          >
            <span>Explore Experiences</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map(item => (
            <div key={item.id} className="relative group">
              <ExperienceCard item={item} favorite={true} onToggleFavorite={() => removeItem(item.id)} />
              {/* Price Watch Bar */}
              <div className="mt-2.5 p-3 rounded-xl bg-white border border-stone-200/80 shadow-xs flex items-center justify-between text-xs">
                <span className="text-stone-600 flex items-center gap-1.5 font-medium">
                  <Bell size={13} className={priceWatchActive[item.id] ? 'text-[#E06D3B]' : 'text-stone-400'} />
                  <span>Price Watch</span>
                </span>
                <button
                  onClick={() => togglePriceWatch(item.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                    priceWatchActive[item.id]
                      ? 'bg-amber-50 text-amber-800 border-amber-300 font-bold'
                      : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  {priceWatchActive[item.id] ? 'Active Alert' : 'Enable Alert'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


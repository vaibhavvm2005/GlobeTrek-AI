import { Heart, MapPin, Star, Calendar, ArrowRight, ShieldCheck } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import type { Experience } from '../../../shared/types'
import { useState } from 'react'
import { apiRequest } from '../../../shared/api'

interface ExperienceCardProps {
  item: Experience
  favorite?: boolean
  onToggleFavorite?: () => void
  featured?: boolean
}

export function ExperienceCard({ item, favorite = false, onToggleFavorite, featured = false }: ExperienceCardProps) {
  const [isFav, setIsFav] = useState(favorite)
  const navigate = useNavigate()

  const handleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsFav(!isFav)
    if (onToggleFavorite) {
      onToggleFavorite()
    } else {
      try {
        await apiRequest(`/wishlist/toggle?event_id=${item.id}`, { method: 'POST' })
      } catch {
        // Optimistic toggle
      }
    }
  }

  return (
    <article
      className={`group relative flex flex-col rounded-2xl bg-white border border-stone-200/80 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 ${
        featured ? 'md:col-span-2 md:flex-row' : ''
      }`}
    >
      {/* Thumbnail */}
      <div className={`relative overflow-hidden bg-stone-100 ${featured ? 'md:w-1/2 aspect-[4/3] md:aspect-auto' : 'aspect-[16/10]'}`}>
        <img
          src={item.image}
          alt={item.title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60" />

        {/* Category Pill */}
        <span className="absolute top-3.5 left-3.5 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-md text-[11px] font-semibold text-[#0B192C] tracking-wide shadow-sm">
          {item.category_name || 'Experience'}
        </span>

        {/* Favorite Heart Button */}
        <button
          onClick={handleFavorite}
          className={`absolute top-3.5 right-3.5 p-2 rounded-full backdrop-blur-md transition-colors ${
            isFav
              ? 'bg-rose-50 text-rose-600 shadow-sm'
              : 'bg-black/30 hover:bg-black/50 text-white'
          }`}
          aria-label="Save to wishlist"
        >
          <Heart size={15} fill={isFav ? 'currentColor' : 'none'} />
        </button>

        {/* Date / Time overlay on bottom of image */}
        <div className="absolute bottom-3 left-3.5 flex items-center gap-1.5 text-xs text-white/95 font-medium drop-shadow">
          <Calendar size={13} className="text-[#E06D3B]" />
          <span>{item.date_str}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-xs text-stone-500 mb-2">
            <span className="flex items-center gap-1 font-medium text-stone-600">
              <MapPin size={13} className="text-stone-400" />
              {item.city}
            </span>
            <span className="flex items-center gap-1 font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/50">
              <Star size={12} fill="currentColor" />
              {item.rating}
            </span>
          </div>

          <h3 className="font-serif font-bold text-lg text-[#0B192C] group-hover:text-[#D95D39] transition-colors line-clamp-2 leading-snug">
            <Link to={`/experiences/${item.id}`}>{item.title}</Link>
          </h3>

          <p className="mt-2 text-xs text-stone-600 line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        </div>

        <div className="pt-4 mt-4 border-t border-stone-100 flex items-center justify-between">
          <div>
            <span className="block text-[10px] uppercase tracking-wider font-semibold text-stone-400">
              Tickets from
            </span>
            <div className="flex items-baseline gap-1">
              <span className="font-bold text-base text-[#0B192C]">₹{item.price}</span>
              <span className="text-[11px] text-stone-500">/ person</span>
            </div>
          </div>

          <button
            onClick={() => navigate(`/checkout?eventId=${item.id}`)}
            className="px-3.5 py-2 rounded-xl bg-[#0B192C] text-[#FAF8F5] text-xs font-semibold hover:bg-[#D95D39] transition-colors flex items-center gap-1.5 shadow-sm group-hover:scale-105"
          >
            <span>Book</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </article>
  )
}


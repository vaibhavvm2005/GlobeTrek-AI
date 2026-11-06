import { useState, useEffect } from 'react'
import { Landmark, Compass, Sparkles } from 'lucide-react'
import { apiRequest } from '../../../shared/api'
import type { Experience } from '../../../shared/types'
import { ExperienceCard } from '../components/ExperienceCard'

export function ExperiencesPage() {
  const [experiences, setExperiences] = useState<Experience[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    apiRequest<Experience[]>('/events')
      .then(all => {
        if (active) {
          // Filter to museums, adventures, attractions
          const filtered = all.filter(e =>
            ['cat-museum', 'cat-adventure', 'cat-attraction'].includes(e.category_id) ||
            ['Museums', 'Adventures', 'Tourist Attractions'].includes(e.category_name || '')
          )
          setExperiences(filtered)
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="border-b border-stone-200 pb-6">
        <span className="text-xs font-bold tracking-widest text-[#D95D39] uppercase font-sans">
          PLACES WORTH FINDING
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#0B192C] mt-1">
          Museums, Heritage Walks & Treks
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 mt-1">
          Discover curated art galleries, mountain sunrises, ancient temple ruins, and artisanal coffee roasteries.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-80 rounded-2xl bg-stone-200/60 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {experiences.map(item => (
            <ExperienceCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}


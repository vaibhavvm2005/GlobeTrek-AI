import { useState, useEffect } from 'react'
import { Calendar, Music2, GraduationCap, Building2, Palette } from 'lucide-react'
import { apiRequest } from '../../../shared/api'
import type { Experience } from '../../../shared/types'
import { ExperienceCard } from '../components/ExperienceCard'

export function EventsPage() {
  const [events, setEvents] = useState<Experience[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    apiRequest<Experience[]>('/events')
      .then(all => {
        if (active) {
          // Filter to concerts, exhibitions, college programs, culture
          const evList = all.filter(e =>
            ['cat-concert', 'cat-culture', 'cat-college', 'cat-exhibition'].includes(e.category_id) ||
            ['Concerts', 'Cultural Programs', 'College Programs', 'Exhibitions'].includes(e.category_name || '')
          )
          setEvents(evList)
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
          LIVE PERFORMANCES & PROGRAMS
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#0B192C] mt-1">
          Events, Concerts & College Summits
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 mt-1">
          Reserve verified seats for live classical fusions, campus hackathons, youth fests, and cultural drama.
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
          {events.map(ev => (
            <ExperienceCard key={ev.id} item={ev} />
          ))}
        </div>
      )}
    </div>
  )
}


import { useState, useEffect } from 'react'
import {
  Calendar,
  Compass,
  MapPin,
  Sparkles,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Save,
  Share2,
  ArrowRight
} from 'lucide-react'
import { apiRequest } from '../../../shared/api'
import type { Itinerary, ItineraryDay, Experience } from '../../../shared/types'
import { Link } from 'react-router-dom'

export function TripPlannerPage() {
  const [destination, setDestination] = useState('Bengaluru')
  const [daysCount, setDaysCount] = useState(2)
  const [title, setTitle] = useState('Bengaluru Cultural & Tech Immersion')
  const [itineraryDays, setItineraryDays] = useState<ItineraryDay[]>([
    {
      day: 1,
      theme: 'Day 1: Modern Art, Sculptures & Roastery Trail',
      morning: { time: '10:00 AM', activity: 'Bengaluru Museum of Modern Art', price: 150, category: 'Museum' },
      afternoon: { time: '02:00 PM', activity: 'Artisan Coffee Roastery Tasting', price: 450, category: 'Attraction' },
      evening: { time: '06:30 PM', activity: 'Echoes of India Live Concert', price: 499, category: 'Concert' },
    },
    {
      day: 2,
      theme: 'Day 2: Fortress Sunrise & Innovation Labs',
      morning: { time: '05:00 AM', activity: 'Nandi Hills Sunrise & Cloudwalk Trek', price: 699, category: 'Adventure' },
      afternoon: { time: '01:00 PM', activity: 'IISc Pravega Science & Tech Summit', price: 199, category: 'College Programs' },
      evening: { time: '06:00 PM', activity: 'Visvesvaraya Science & Innovation Museum', price: 120, category: 'Museum' },
    },
  ])
  const [savedStatus, setSavedStatus] = useState('')
  const [generatingAI, setGeneratingAI] = useState(false)

  const handleGenerateAI = async () => {
    setGeneratingAI(true)
    try {
      const res = await apiRequest('/chat', {
        method: 'POST',
        body: {
          message: `Plan a ${daysCount}-day itinerary for ${destination} with curated museums and activities`,
          language: 'en',
        },
      })
      if (res.interactive_card?.data?.days) {
        setItineraryDays(res.interactive_card.data.days)
        setTitle(`${destination} Curated Exploration`)
      }
    } catch {
      // Fallback
    } finally {
      setGeneratingAI(false)
    }
  }

  const handleSaveItinerary = async () => {
    try {
      await apiRequest('/itineraries', {
        method: 'POST',
        body: {
          destination,
          title,
          days: itineraryDays,
        },
      })
      setSavedStatus('Itinerary saved to your personal account!')
      setTimeout(() => setSavedStatus(''), 4000)
    } catch (err: any) {
      alert(err.message || 'Could not save itinerary')
    }
  }

  const totalBudget = itineraryDays.reduce(
    (acc, d) => acc + d.morning.price + d.afternoon.price + d.evening.price,
    0
  )

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="border-b border-stone-200 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-bold tracking-widest text-[#D95D39] uppercase font-sans">
            SMART TRIP PLANNER
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#0B192C] mt-1">
            Build Your Multi-Day Journey
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            Organize heritage spots, outdoor treks, and evening events day-by-day with real database pricing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleGenerateAI}
            disabled={generatingAI}
            className="px-4 py-2.5 rounded-xl bg-[#E06D3B] text-white text-xs font-semibold hover:bg-[#D95D39] transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Sparkles size={14} />
            <span>{generatingAI ? 'Curating Plan...' : 'Suggest with AI'}</span>
          </button>
          <button
            onClick={handleSaveItinerary}
            className="px-4 py-2.5 rounded-xl bg-[#0B192C] text-white text-xs font-semibold hover:bg-stone-800 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Save size={14} />
            <span>Save Plan</span>
          </button>
        </div>
      </div>

      {savedStatus && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-600" />
          <span>{savedStatus}</span>
        </div>
      )}

      {/* Destination & Length Configuration Bar */}
      <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <label className="space-y-1">
            <span className="font-semibold text-stone-700 block">Destination</span>
            <select
              value={destination}
              onChange={e => setDestination(e.target.value)}
              className="p-2 rounded-xl border border-stone-200 bg-stone-50 font-semibold text-stone-900 cursor-pointer"
            >
              <option value="Bengaluru">Bengaluru</option>
              <option value="Hampi">Hampi</option>
              <option value="Mumbai">Mumbai</option>
              <option value="Mysuru">Mysuru</option>
              <option value="Coorg">Coorg</option>
            </select>
          </label>

          <label className="space-y-1">
            <span className="font-semibold text-stone-700 block">Duration</span>
            <select
              value={daysCount}
              onChange={e => setDaysCount(Number(e.target.value))}
              className="p-2 rounded-xl border border-stone-200 bg-stone-50 font-semibold text-stone-900 cursor-pointer"
            >
              <option value={1}>1 Day Expedition</option>
              <option value={2}>2 Days Weekend</option>
              <option value={3}>3 Days Comprehensive</option>
            </select>
          </label>
        </div>

        <div className="flex items-center gap-4 bg-stone-50 px-4 py-2 rounded-xl border border-stone-200">
          <span className="text-stone-500 font-medium">Estimated Ticket Total:</span>
          <span className="font-serif text-lg font-bold text-[#0B192C]">₹{totalBudget}</span>
        </div>
      </div>

      {/* Day by Day Plan Cards */}
      <div className="space-y-6">
        {itineraryDays.map((d, dayIndex) => (
          <div
            key={dayIndex}
            className="p-6 rounded-3xl bg-white border border-stone-200/90 shadow-sm space-y-4"
          >
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-serif font-bold text-lg text-[#0B192C]">
                {d.theme}
              </h3>
              <span className="text-xs font-mono font-bold text-[#D95D39]">
                Day {d.day}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* Morning slot */}
              <div className="p-4 rounded-2xl bg-amber-50/40 border border-amber-200/50 space-y-2">
                <span className="text-[10px] uppercase font-bold text-amber-700 tracking-wider">
                  Morning · {d.morning.time}
                </span>
                <h4 className="font-serif font-bold text-sm text-stone-900">{d.morning.activity}</h4>
                <div className="flex items-center justify-between text-stone-500 pt-2 border-t border-amber-200/30">
                  <span>{d.morning.category}</span>
                  <strong className="text-stone-900 font-mono">₹{d.morning.price}</strong>
                </div>
              </div>

              {/* Afternoon slot */}
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/70 space-y-2">
                <span className="text-[10px] uppercase font-bold text-stone-600 tracking-wider">
                  Afternoon · {d.afternoon.time}
                </span>
                <h4 className="font-serif font-bold text-sm text-stone-900">{d.afternoon.activity}</h4>
                <div className="flex items-center justify-between text-stone-500 pt-2 border-t border-stone-200/40">
                  <span>{d.afternoon.category}</span>
                  <strong className="text-stone-900 font-mono">₹{d.afternoon.price}</strong>
                </div>
              </div>

              {/* Evening slot */}
              <div className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-200/50 space-y-2">
                <span className="text-[10px] uppercase font-bold text-indigo-700 tracking-wider">
                  Evening · {d.evening.time}
                </span>
                <h4 className="font-serif font-bold text-sm text-stone-900">{d.evening.activity}</h4>
                <div className="flex items-center justify-between text-stone-500 pt-2 border-t border-indigo-200/30">
                  <span>{d.evening.category}</span>
                  <strong className="text-stone-900 font-mono">₹{d.evening.price}</strong>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-6 rounded-2xl bg-[#0B192C] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="font-serif font-bold text-base">Ready to book this curated itinerary?</h4>
          <p className="text-xs text-stone-300">
            Consult the AI Concierge to reserve tickets across all selected activities in a single conversation.
          </p>
        </div>
        <Link
          to="/concierge"
          className="px-5 py-2.5 rounded-xl bg-[#E06D3B] text-white text-xs font-semibold hover:bg-[#D95D39] transition-colors shrink-0 flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Sparkles size={14} />
          <span>Consult AI Concierge</span>
        </Link>
      </div>
    </div>
  )
}


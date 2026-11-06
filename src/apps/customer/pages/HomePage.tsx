import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  MapPin,
  Calendar,
  Sparkles,
  ArrowRight,
  Landmark,
  Music2,
  Compass,
  Palette,
  Building2,
  GraduationCap,
  ShieldCheck,
  Ticket,
  Languages,
  CheckCircle2,
  Clock
} from 'lucide-react'
import { apiRequest } from '../../../shared/api'
import type { Experience, Category } from '../../../shared/types'
import { ExperienceCard } from '../components/ExperienceCard'
import { WeatherWidget } from '../../../shared/components/WeatherWidget'
import { useLanguage } from '../../../shared/LanguageContext'

export function HomePage() {
  const [query, setQuery] = useState('')
  const [city, setCity] = useState('Bengaluru')
  const [experiences, setExperiences] = useState<Experience[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { t } = useLanguage()

  useEffect(() => {
    let active = true
    Promise.all([
      apiRequest<Experience[]>('/events'),
      apiRequest<Category[]>('/categories'),
    ])
      .then(([evs, cats]) => {
        if (active) {
          setExperiences(evs)
          setCategories(cats)
        }
      })
      .catch(console.error)
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    navigate(`/discover?q=${encodeURIComponent(query)}&city=${encodeURIComponent(city)}`)
  }

  const categoryIcons: Record<string, any> = {
    Landmark,
    Music2,
    Compass,
    Palette,
    Building2,
    GraduationCap,
    Sparkles,
  }

  const destinations = [
    {
      name: 'Bengaluru',
      state: 'Karnataka',
      experiencesCount: '6 Experiences',
      image: 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=800&q=80',
      description: 'Contemporary art galleries, craft coffee roasteries, and historic botany',
    },
    {
      name: 'Hampi',
      state: 'Karnataka',
      experiencesCount: '2 Experiences',
      image: 'https://images.unsplash.com/photo-1590059390041-2f6b1f1c95a2?auto=format&fit=crop&w=800&q=80',
      description: 'Monolithic granite temples and living myths along the Tungabhadra River',
    },
    {
      name: 'Mumbai',
      state: 'Maharashtra',
      experiencesCount: '3 Experiences',
      image: 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=800&q=80',
      description: 'Art Deco architecture, national performing arts, and contemporary biennales',
    },
    {
      name: 'Mysuru',
      state: 'Karnataka',
      experiencesCount: '2 Experiences',
      image: 'https://images.unsplash.com/photo-1600100397608-f010e422a59a?auto=format&fit=crop&w=800&q=80',
      description: 'Royal palace twilight illuminations, sandalwood markets, and heritage bazaars',
    },
    {
      name: 'Coorg',
      state: 'Karnataka',
      experiencesCount: '2 Experiences',
      image: 'https://images.unsplash.com/photo-1511497584788-87676104235f?auto=format&fit=crop&w=800&q=80',
      description: 'Mist-clad Western Ghats canopy trails, waterfalls, and coffee estates',
    },
  ]

  return (
    <div className="space-y-20 pb-20">
      {/* 1. HERO SECTION */}
      <section className="relative pt-12 pb-24 md:pt-20 md:pb-32 px-4 sm:px-6 lg:px-8 overflow-hidden bg-gradient-to-b from-[#FAF8F5] via-[#F4EFE6] to-[#FAF8F5] border-b border-stone-200/60">
        <div className="max-w-6xl mx-auto text-center space-y-6">
          {/* Eyebrow badge with Live Weather */}
          <div className="inline-flex flex-wrap items-center justify-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#E06D3B]/10 text-[#D95D39] text-xs font-semibold tracking-wide border border-[#E06D3B]/20">
              <Sparkles size={14} />
              <span>AI-Powered Authentic Ticketing</span>
            </span>
            <WeatherWidget city={city} />
          </div>

          {/* Headline & Subtitle */}
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-[#0B192C] max-w-4xl mx-auto leading-[1.12]">
            {t.heroHeadline}
          </h1>
          <p className="font-sans text-base sm:text-lg md:text-xl text-stone-600 max-w-2xl mx-auto leading-relaxed">
            {t.heroSubtitle}
          </p>

          {/* Search Bar Panel */}
          <form
            onSubmit={handleSearch}
            className="mt-8 max-w-3xl mx-auto p-2.5 sm:p-3 bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-stone-200/80 flex flex-col sm:flex-row gap-2.5 items-center"
          >
            <div className="flex-1 flex items-center gap-2.5 px-3.5 py-2 w-full border-b sm:border-b-0 sm:border-r border-stone-200">
              <Search className="text-stone-400 shrink-0" size={18} />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none bg-transparent"
              />
            </div>

            <div className="flex items-center gap-2 px-3 py-2 shrink-0 w-full sm:w-auto">
              <MapPin className="text-[#E06D3B] shrink-0" size={18} />
              <select
                value={city}
                onChange={e => setCity(e.target.value)}
                className="text-xs sm:text-sm font-medium text-stone-800 bg-transparent focus:outline-none cursor-pointer"
                aria-label="Filter city"
              >
                <option value="Bengaluru">Bengaluru</option>
                <option value="Hampi">Hampi</option>
                <option value="Mumbai">Mumbai</option>
                <option value="Mysuru">Mysuru</option>
                <option value="Coorg">Coorg</option>
                <option value="All locations">All locations</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-3 rounded-xl sm:rounded-2xl bg-[#0B192C] text-[#FAF8F5] font-semibold text-xs sm:text-sm hover:bg-[#D95D39] transition-all flex items-center justify-center gap-2 shrink-0 shadow-md"
            >
              <Search size={16} />
              <span>{t.exploreButton}</span>
            </button>
          </form>

          {/* Quick AI Starters */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs text-stone-500">
            <span className="font-medium text-stone-400">{t.popularSuggestions}</span>
            {[
              'Museums under ₹200',
              'Classical concerts in Bengaluru',
              'Nandi Hills sunrise trek',
              'Weekend 2-day itinerary',
            ].map(prompt => (
              <button
                key={prompt}
                type="button"
                onClick={() => navigate('/concierge', { state: { initialPrompt: prompt } })}
                className="px-3 py-1 rounded-full bg-white hover:bg-stone-100 text-stone-700 border border-stone-200/80 shadow-xs transition-colors flex items-center gap-1 font-medium"
              >
                <Sparkles size={11} className="text-[#E06D3B]" />
                <span>{prompt}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 2. CATEGORIES SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <span className="text-xs font-bold tracking-widest text-[#D95D39] uppercase font-sans">
              {t.categoriesKicker}
            </span>
            <h2 className="font-serif text-3xl font-bold text-[#0B192C] mt-1">
              {t.categoriesHeading}
            </h2>
          </div>
          <button
            onClick={() => navigate('/discover')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-700 hover:text-[#D95D39] transition-colors"
          >
            <span>View all categories</span>
            <ArrowRight size={14} />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {categories.map(cat => {
            const Icon = categoryIcons[cat.icon] || Landmark
            return (
              <button
                key={cat.id}
                onClick={() => navigate(`/discover?category=${encodeURIComponent(cat.name)}`)}
                className="p-4 rounded-2xl bg-white border border-stone-200/80 hover:border-[#E06D3B] hover:shadow-md transition-all text-left flex flex-col justify-between h-36 group"
              >
                <div className="w-10 h-10 rounded-xl bg-stone-100 group-hover:bg-[#E06D3B]/10 text-stone-800 group-hover:text-[#D95D39] flex items-center justify-center transition-colors">
                  <Icon size={20} />
                </div>
                <div>
                  <strong className="block text-xs font-serif font-bold text-stone-900 group-hover:text-[#D95D39] transition-colors">
                    {cat.name}
                  </strong>
                  <span className="text-[10px] text-stone-500 line-clamp-1 mt-0.5">
                    {cat.description}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </section>

      {/* 3. TRENDING EXPERIENCES (REAL DATABASE RECORDS) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <span className="text-xs font-bold tracking-widest text-[#D95D39] uppercase font-sans">
              CURATED EXPERIENCES
            </span>
            <h2 className="font-serif text-3xl font-bold text-[#0B192C] mt-1">
              {t.trendingHeading}
            </h2>
          </div>
          <button
            onClick={() => navigate('/discover')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-700 hover:text-[#D95D39] transition-colors"
          >
            <span>Explore all experiences</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-80 rounded-2xl bg-stone-200/70 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {experiences.slice(0, 6).map(item => (
              <ExperienceCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>

      {/* 4. CURATED DESTINATIONS GATEWAYS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <span className="text-xs font-bold tracking-widest text-[#D95D39] uppercase font-sans">
            DESTINATION DIRECTORY
          </span>
          <h2 className="font-serif text-3xl font-bold text-[#0B192C] mt-1">
            {t.curatedDestinations}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {destinations.map(d => (
            <button
              key={d.name}
              onClick={() => navigate(`/destinations?city=${encodeURIComponent(d.name)}`)}
              className="group relative rounded-2xl overflow-hidden aspect-[3/4] text-left border border-stone-200/80 shadow-xs hover:shadow-xl transition-all"
            >
              <img
                src={d.image}
                alt={d.name}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 text-white">
                <span className="text-[10px] font-semibold tracking-wider uppercase text-[#E06D3B] block">
                  {d.state}
                </span>
                <h3 className="font-serif font-bold text-xl leading-tight mt-0.5">
                  {d.name}
                </h3>
                <p className="text-[11px] text-stone-300 line-clamp-2 mt-1 leading-snug">
                  {d.description}
                </p>
                <div className="mt-2.5 flex items-center justify-between text-[11px] font-semibold text-white/90 border-t border-white/20 pt-2">
                  <span>{d.experiencesCount}</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* 5. AI CONCIERGE HIGHLIGHT BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-[#0B192C] text-[#FAF8F5] p-8 sm:p-12 md:p-16 relative overflow-hidden shadow-2xl">
          <div className="relative z-10 max-w-2xl space-y-5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E06D3B]/20 text-[#E06D3B] text-xs font-semibold tracking-wide border border-[#E06D3B]/30">
              <Sparkles size={13} />
              <span>{t.aiBannerKicker}</span>
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight">
              {t.aiBannerTitle}
            </h2>
            <p className="text-stone-300 text-sm sm:text-base leading-relaxed">
              {t.aiBannerDesc}
            </p>
            <div className="pt-2 flex flex-wrap gap-4">
              <button
                onClick={() => navigate('/concierge')}
                className="px-6 py-3.5 rounded-xl bg-[#E06D3B] text-white font-semibold text-sm hover:bg-[#D95D39] transition-all flex items-center gap-2 shadow-lg hover:scale-105"
              >
                <span>{t.askWayfarer}</span>
                <ArrowRight size={16} />
              </button>
              <button
                onClick={() => navigate('/trip-planner')}
                className="px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm transition-all border border-white/10"
              >
                <span>{t.navTripPlanner}</span>
              </button>
            </div>
          </div>

          {/* Decorative conversational illustration card */}
          <div className="hidden lg:block absolute right-12 top-1/2 -translate-y-1/2 w-80 space-y-3 pointer-events-none">
            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-xs text-stone-200 shadow-lg">
              <span className="font-bold text-[#E06D3B]">User:</span> "Find two museum tickets in Bengaluru under ₹200."
            </div>
            <div className="p-4 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 text-xs text-white shadow-xl ml-6">
              <span className="font-bold text-emerald-400">GlobeTrek AI:</span> "Found Bengaluru Museum of Modern Art at ₹150. 120 verified spots open. Would you like to reserve?"
            </div>
          </div>
        </div>
      </section>

      {/* 6. TRUST & OPERATIONAL INTEGRITY PILLARS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="p-6 rounded-2xl bg-white border border-stone-200/80 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-[#0B192C]/5 text-[#0B192C] flex items-center justify-center mb-4">
              <CheckCircle2 size={20} className="text-emerald-600" />
            </div>
            <h3 className="font-serif font-bold text-base text-stone-900">Zero Overselling</h3>
            <p className="text-xs text-stone-600 mt-1.5 leading-relaxed">
              Atomic database reservation holds ensure tickets are locked for 10 minutes before permanent confirmation.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-stone-200/80 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-[#0B192C]/5 text-[#0B192C] flex items-center justify-center mb-4">
              <Ticket size={20} className="text-[#E06D3B]" />
            </div>
            <h3 className="font-serif font-bold text-base text-stone-900">HMAC-Signed Passes</h3>
            <p className="text-xs text-stone-600 mt-1.5 leading-relaxed">
              Cryptographically signed QR codes prevent forged passes and reject duplicate gate entries.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-stone-200/80 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-[#0B192C]/5 text-[#0B192C] flex items-center justify-center mb-4">
              <Languages size={20} className="text-blue-600" />
            </div>
            <h3 className="font-serif font-bold text-base text-stone-900">Trilingual Platform</h3>
            <p className="text-xs text-stone-600 mt-1.5 leading-relaxed">
              Native translations in English, Hindi, and Kannada make ticketing accessible to first-time digital travellers.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-stone-200/80 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-[#0B192C]/5 text-[#0B192C] flex items-center justify-center mb-4">
              <Clock size={20} className="text-purple-600" />
            </div>
            <h3 className="font-serif font-bold text-base text-stone-900">Offline Ticket Vault</h3>
            <p className="text-xs text-stone-600 mt-1.5 leading-relaxed">
              All confirmed tickets are cached locally so you can present your scannable gate pass even with zero cell connectivity.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

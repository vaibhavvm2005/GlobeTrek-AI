import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Search,
  MapPin,
  Filter,
  SlidersHorizontal,
  LayoutGrid,
  List,
  Map as MapIcon,
  Sparkles,
  ArrowUpDown,
  RotateCcw
} from 'lucide-react'
import { apiRequest } from '../../../shared/api'
import type { Experience, Category } from '../../../shared/types'
import { ExperienceCard } from '../components/ExperienceCard'
import { useLanguage } from '../../../shared/LanguageContext'

export function DiscoverPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialQuery = searchParams.get('q') || ''
  const initialCity = searchParams.get('city') || 'All locations'
  const initialCategory = searchParams.get('category') || 'All'

  const [query, setQuery] = useState(initialQuery)
  const [city, setCity] = useState(initialCity)
  const [category, setCategory] = useState(initialCategory)
  const [maxPrice, setMaxPrice] = useState<number>(1000)
  const [sortBy, setSortBy] = useState<'rating' | 'price_asc' | 'price_desc'>('rating')
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('grid')

  const [experiences, setExperiences] = useState<Experience[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
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
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  // Sync state with URL params
  useEffect(() => {
    const q = searchParams.get('q') || ''
    const c = searchParams.get('city') || 'All locations'
    const cat = searchParams.get('category') || 'All'
    setQuery(q)
    setCity(c)
    setCategory(cat)
  }, [searchParams])

  const filtered = useMemo(() => {
    return experiences
      .filter(item => {
        const matchesQuery =
          !query ||
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          item.description.toLowerCase().includes(query.toLowerCase()) ||
          item.city.toLowerCase().includes(query.toLowerCase())
        const matchesCity = city === 'All locations' || item.city.toLowerCase() === city.toLowerCase()
        const matchesCategory =
          category === 'All' ||
          item.category_name?.toLowerCase() === category.toLowerCase() ||
          item.category_id?.toLowerCase() === category.toLowerCase()
        const matchesPrice = item.price <= maxPrice
        return matchesQuery && matchesCity && matchesCategory && matchesPrice
      })
      .sort((a, b) => {
        if (sortBy === 'price_asc') return a.price - b.price
        if (sortBy === 'price_desc') return b.price - a.price
        return b.rating - a.rating
      })
  }, [experiences, query, city, category, maxPrice, sortBy])

  const resetFilters = () => {
    setQuery('')
    setCity('All locations')
    setCategory('All')
    setMaxPrice(1000)
    setSortBy('rating')
    setSearchParams({})
  }

  const cities = ['All locations', 'Bengaluru', 'Hampi', 'Mumbai', 'Mysuru', 'Coorg']

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Header */}
      <div className="border-b border-stone-200/80 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-bold tracking-widest text-[#D95D39] uppercase font-sans">
            AUTHENTIC CATALOG
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#0B192C] mt-1">
            Discover Experiences in India
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            Browse verified ticket inventory across heritage sites, concerts, treks, and college symposiums.
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-xl border border-stone-200">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              viewMode === 'grid' ? 'bg-white text-[#0B192C] shadow-xs' : 'text-stone-600 hover:text-stone-900'
            }`}
            title="Grid View"
          >
            <LayoutGrid size={15} />
            <span className="hidden sm:inline">Grid</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              viewMode === 'list' ? 'bg-white text-[#0B192C] shadow-xs' : 'text-stone-600 hover:text-stone-900'
            }`}
            title="List View"
          >
            <List size={15} />
            <span className="hidden sm:inline">List</span>
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              viewMode === 'map' ? 'bg-white text-[#0B192C] shadow-xs' : 'text-stone-600 hover:text-stone-900'
            }`}
            title="Map View"
          >
            <MapIcon size={15} />
            <span className="hidden sm:inline">Map</span>
          </button>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200/80 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Keyword Search */}
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 text-stone-400" size={16} />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search experiences..."
              className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0B192C]"
            />
          </div>

          {/* City Selector */}
          <div className="relative flex items-center">
            <MapPin className="absolute left-3.5 text-[#E06D3B]" size={16} />
            <select
              value={city}
              onChange={e => setCity(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none cursor-pointer"
            >
              {cities.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Category Selector */}
          <div className="relative flex items-center">
            <Filter className="absolute left-3.5 text-stone-400" size={16} />
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none cursor-pointer"
            >
              <option value="All">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div className="relative flex items-center">
            <ArrowUpDown className="absolute left-3.5 text-stone-400" size={16} />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none cursor-pointer"
            >
              <option value="rating">Sort: Highest Rated</option>
              <option value="price_asc">Sort: Price (Low to High)</option>
              <option value="price_desc">Sort: Price (High to Low)</option>
            </select>
          </div>
        </div>

        {/* Budget Slider and Reset */}
        <div className="pt-3 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="text-stone-500 font-medium whitespace-nowrap">Budget ceiling:</span>
            <input
              type="range"
              min={100}
              max={1200}
              step={50}
              value={maxPrice}
              onChange={e => setMaxPrice(Number(e.target.value))}
              className="w-32 accent-[#0B192C]"
            />
            <span className="font-bold text-[#0B192C] font-mono">₹{maxPrice}</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <span className="text-stone-500">
              Showing <strong>{filtered.length}</strong> verified experiences
            </span>
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 text-stone-500 hover:text-stone-900 transition-colors font-medium"
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* Results View */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-80 rounded-2xl bg-stone-200/70 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white border border-stone-200/80 space-y-3">
          <Sparkles className="w-10 h-10 text-stone-400 mx-auto" />
          <h3 className="font-serif font-bold text-lg text-stone-800">No matching experiences found</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Try expanding your budget ceiling or selecting another city or category.
          </p>
          <button
            onClick={resetFilters}
            className="mt-2 px-4 py-2 rounded-xl bg-[#0B192C] text-white text-xs font-semibold"
          >
            Reset all filters
          </button>
        </div>
      ) : viewMode === 'map' ? (
        /* Interactive Map Simulation View */
        <div className="rounded-2xl border border-stone-200/80 bg-white overflow-hidden shadow-sm">
          <div className="p-4 bg-stone-100/70 border-b border-stone-200 flex items-center justify-between text-xs">
            <span className="font-semibold text-stone-700 flex items-center gap-1.5">
              <MapIcon size={15} className="text-[#E06D3B]" />
              Geographic Experience Pinboard
            </span>
            <span className="text-stone-500 font-mono text-[11px]">Karnataka & Maharashtra Coordinates</span>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-stone-50/50">
            {filtered.map(item => (
              <div key={item.id} className="p-4 rounded-xl bg-white border border-stone-200 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-[#E06D3B] uppercase tracking-wider">{item.city}</span>
                  <h4 className="font-serif font-bold text-sm text-stone-900">{item.title}</h4>
                  <span className="text-xs font-semibold text-stone-700">₹{item.price}</span>
                </div>
                <button
                  onClick={() => window.open(`https://www.openstreetmap.org/search?query=${encodeURIComponent(item.title + ' ' + item.city)}`, '_blank')}
                  className="px-2.5 py-1.5 text-xs font-semibold text-stone-700 hover:text-white hover:bg-[#0B192C] border border-stone-200 rounded-lg transition-colors"
                >
                  Map Pin ↗
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : viewMode === 'list' ? (
        <div className="space-y-4">
          {filtered.map(item => (
            <ExperienceCard key={item.id} item={item} featured={true} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(item => (
            <ExperienceCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}


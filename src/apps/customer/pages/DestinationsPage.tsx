import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MapPin, ArrowRight, Compass, Sun, CloudRain } from 'lucide-react'
import { WeatherWidget } from '../../../shared/components/WeatherWidget'

export function DestinationsPage() {
  const navigate = useNavigate()
  const destinations = [
    {
      name: 'Bengaluru',
      state: 'Karnataka',
      lat: 12.9716,
      lon: 77.5946,
      tagline: 'Garden City & Contemporary Innovation',
      image: 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=1200&q=80',
      description: 'Home to the National Gallery of Modern Art, lush Lalbagh botanical gardens, single-origin coffee roasteries, and live acoustic concerts.',
      popularAttractions: ['Modern Art Gallery', 'Pravega Tech Summit', 'Coffee Trail', 'Visvesvaraya Museum'],
    },
    {
      name: 'Hampi',
      state: 'Karnataka',
      lat: 15.3350,
      lon: 76.4600,
      tagline: 'Monolithic Empire of Stone & Myth',
      image: 'https://images.unsplash.com/photo-1590059390041-2f6b1f1c95a2?auto=format&fit=crop&w=1200&q=80',
      description: 'A UNESCO World Heritage marvel featuring boulder-strewn temples, the monolithic bull, musical pillars of Vittala, and serene coracle rides.',
      popularAttractions: ['Virupaksha Temple', 'Musical Pillars Walk', 'Sunset at Hemakuta Hill', 'Tungabhadra Coracle Ride'],
    },
    {
      name: 'Mumbai',
      state: 'Maharashtra',
      lat: 18.9272,
      lon: 72.8205,
      tagline: 'Colonial Architecture & Performing Arts',
      image: 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=1200&q=80',
      description: 'The creative capital of modern South Asia. Experience the Architecture Biennale at NCPA, classical Kathakali dance nights, and seafront promenades.',
      popularAttractions: ['National Centre for Performing Arts', 'Architecture Biennale', 'Kala Ghoda Art District', 'Marine Drive Walk'],
    },
    {
      name: 'Mysuru',
      state: 'Karnataka',
      lat: 12.3051,
      lon: 76.6551,
      tagline: 'Royal Palaces, Silk & Sandalwood',
      image: 'https://images.unsplash.com/photo-1600100397608-f010e422a59a?auto=format&fit=crop&w=1200&q=80',
      description: 'Famous for the Indo-Saracenic Mysore Palace illuminated by 100,000 bulbs, traditional Devaraja spice markets, and master sandalwood carvers.',
      popularAttractions: ['Palace Twilight Illumination', 'Devaraja Market Heritage Tour', 'Chamundi Hill Stairs', 'Silk Weaving Workshops'],
    },
    {
      name: 'Coorg',
      state: 'Karnataka',
      lat: 12.0125,
      lon: 75.9872,
      tagline: 'Misty Western Ghats & Coffee Canopies',
      image: 'https://images.unsplash.com/photo-1511497584788-87676104235f?auto=format&fit=crop&w=1200&q=80',
      description: 'Known as the Scotland of India. Trek through Brahmagiri rainforest trails, discover fresh coffee blossoms, and swim in Iruppu river pools.',
      popularAttractions: ['Brahmagiri Canopy Trek', 'Coffee Blossom Estate Walk', 'Iruppu Waterfalls', 'Dubare Riverfront'],
    },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      <div className="border-b border-stone-200 pb-6">
        <span className="text-xs font-bold tracking-widest text-[#D95D39] uppercase font-sans">
          REGIONAL DESTINATION GUIDES
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#0B192C] mt-1">
          Explore India by Destination
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 mt-1">
          Deep-dive into regional culture, live weather conditions, and book verified experiences.
        </p>
      </div>

      <div className="space-y-10">
        {destinations.map(d => (
          <article
            key={d.name}
            className="rounded-3xl bg-white border border-stone-200/90 shadow-md overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-0"
          >
            {/* Image Col */}
            <div className="lg:col-span-5 relative aspect-[16/10] lg:aspect-auto">
              <img
                src={d.image}
                alt={d.name}
                loading="lazy"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4">
                <WeatherWidget lat={d.lat} lon={d.lon} city={d.name} />
              </div>
            </div>

            {/* Content Col */}
            <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-6">
              <div>
                <span className="text-xs font-bold text-[#E06D3B] uppercase tracking-wider block">
                  {d.state} · Gateway
                </span>
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#0B192C] mt-1">
                  {d.name}
                </h2>
                <span className="text-xs text-stone-500 font-serif italic block mt-0.5">
                  {d.tagline}
                </span>

                <p className="text-xs sm:text-sm text-stone-600 leading-relaxed mt-4">
                  {d.description}
                </p>

                {/* Popular spots */}
                <div className="mt-4 pt-4 border-t border-stone-100">
                  <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block mb-2">
                    Key Bookable Experiences
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {d.popularAttractions.map((spot, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg bg-stone-100 text-stone-700 text-xs font-medium"
                      >
                        {spot}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-stone-100">
                <button
                  onClick={() => navigate(`/discover?city=${encodeURIComponent(d.name)}`)}
                  className="px-5 py-2.5 rounded-xl bg-[#0B192C] text-white hover:bg-[#D95D39] text-xs font-semibold flex items-center gap-2 transition-all shadow-sm"
                >
                  <span>Explore {d.name} Tickets</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}


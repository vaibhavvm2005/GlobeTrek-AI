import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  MapPin,
  Calendar,
  Clock,
  Star,
  ShieldCheck,
  CheckCircle2,
  Users,
  Compass,
  ArrowRight,
  Heart,
  Share2,
  Ticket
} from 'lucide-react'
import { apiRequest } from '../../../shared/api'
import type { Experience, TicketType } from '../../../shared/types'
import { WeatherWidget } from '../../../shared/components/WeatherWidget'
import { ExperienceCard } from '../components/ExperienceCard'

export function ExperienceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [experience, setExperience] = useState<Experience | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTier, setSelectedTier] = useState<string>('')
  const [quantity, setQuantity] = useState(2)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    apiRequest<Experience>(`/events/${id}`)
      .then(ev => {
        if (active) {
          setExperience(ev)
          if (ev.ticket_types && ev.ticket_types.length > 0) {
            setSelectedTier(ev.ticket_types[0].id)
          }
        }
      })
      .catch(console.error)
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [id])

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center space-y-4">
        <Compass className="w-10 h-10 text-[#D95D39] animate-spin mx-auto" />
        <p className="text-sm font-medium text-stone-500">Loading verified experience details...</p>
      </div>
    )
  }

  if (!experience) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="font-serif text-2xl font-bold">Experience not found</h2>
        <p className="text-xs text-stone-500">The destination or event you are looking for is no longer active.</p>
        <Link to="/discover" className="inline-block px-4 py-2 bg-[#0B192C] text-white text-xs font-semibold rounded-xl">
          Return to Discover
        </Link>
      </div>
    )
  }

  const activeTier = experience.ticket_types?.find(t => t.id === selectedTier) || {
    id: `tt-${experience.id}-gen`,
    name: 'General Admission',
    price: experience.price,
    description: 'Standard admission pass',
    available_quantity: experience.inventory || 50,
  }

  const subtotal = activeTier.price * quantity
  const fees = 59
  const total = subtotal + fees

  const handleCheckout = () => {
    navigate(`/checkout?eventId=${experience.id}&tierId=${activeTier.id}&qty=${quantity}`)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Hero Gallery & Breadcrumb */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between text-xs text-stone-500 gap-2">
          <div className="flex items-center gap-2">
            <Link to="/discover" className="hover:text-stone-900 transition-colors">Discover</Link>
            <span>/</span>
            <Link to={`/discover?city=${experience.city}`} className="hover:text-stone-900 transition-colors">{experience.city}</Link>
            <span>/</span>
            <span className="text-stone-900 font-semibold">{experience.title}</span>
          </div>

          <div className="flex items-center gap-2">
            <WeatherWidget city={experience.city} />
            <button
              onClick={() => setSaved(!saved)}
              className="p-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 transition-colors"
              title="Save to wishlist"
            >
              <Heart size={16} fill={saved ? '#E11D48' : 'none'} className={saved ? 'text-rose-600' : ''} />
            </button>
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: experience.title, url: window.location.href })
                }
              }}
              className="p-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 transition-colors"
              title="Share experience"
            >
              <Share2 size={16} />
            </button>
          </div>
        </div>

        {/* Large Curated Photograph */}
        <div className="relative aspect-[21/9] sm:aspect-[21/8] rounded-3xl overflow-hidden shadow-lg border border-stone-200 bg-stone-900">
          <img
            src={experience.image}
            alt={experience.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          
          <div className="absolute bottom-6 left-6 right-6 text-white flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold text-white tracking-wide uppercase">
                {experience.category_name}
              </span>
              <h1 className="font-serif text-2xl sm:text-4xl lg:text-5xl font-bold mt-2 leading-tight">
                {experience.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-stone-200 mt-2 font-medium">
                <span className="flex items-center gap-1.5"><MapPin size={15} className="text-[#E06D3B]"/> {experience.city}</span>
                <span>·</span>
                <span className="flex items-center gap-1.5"><Calendar size={15} className="text-[#E06D3B]"/> {experience.date_str}</span>
                <span>·</span>
                <span className="flex items-center gap-1.5"><Clock size={15} className="text-[#E06D3B]"/> {experience.start_time} – {experience.end_time}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/20 self-start sm:self-end">
              <Star size={16} fill="#F59E0B" className="text-amber-400" />
              <span className="font-bold text-base">{experience.rating}</span>
              <span className="text-xs text-stone-300 font-sans">/ 5.0 rating</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Layout (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left Column: Description, Highlights, Venue & Policies */}
        <div className="lg:col-span-2 space-y-10">
          {/* About this experience */}
          <section className="space-y-4">
            <h2 className="font-serif text-2xl font-bold text-[#0B192C]">
              About This Experience
            </h2>
            <p className="text-sm sm:text-base text-stone-700 leading-relaxed font-sans">
              {experience.description}
            </p>
          </section>

          {/* Highlights checklist */}
          {experience.highlights && experience.highlights.length > 0 && (
            <section className="p-6 rounded-2xl bg-white border border-stone-200/80 shadow-xs space-y-4">
              <h3 className="font-serif font-bold text-lg text-[#0B192C]">
                Experience Highlights
              </h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm text-stone-700">
                {experience.highlights.map((hl, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                    <span>{hl}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Venue & Location details */}
          <section className="p-6 rounded-2xl bg-white border border-stone-200/80 shadow-xs space-y-3">
            <h3 className="font-serif font-bold text-lg text-[#0B192C]">
              Venue & Access Information
            </h3>
            <div className="space-y-1.5 text-xs sm:text-sm text-stone-600">
              <p className="font-semibold text-stone-900">{experience.venue_name || 'Designated Heritage Ground'}</p>
              <p>{experience.venue_address || `${experience.city}, Karnataka, India`}</p>
            </div>
            <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
              <span>Standard gate opens 30 minutes prior</span>
              <a
                href={`https://www.openstreetmap.org/search?query=${encodeURIComponent((experience.venue_name || experience.title) + ' ' + experience.city)}`}
                target="_blank"
                rel="noreferrer"
                className="text-[#D95D39] font-semibold hover:underline"
              >
                View on OpenStreetMap ↗
              </a>
            </div>
          </section>

          {/* Cancellation & Integrity Safeguards */}
          <section className="p-6 rounded-2xl bg-[#0B192C]/5 border border-stone-200 space-y-3">
            <div className="flex items-center gap-2 text-stone-900 font-bold text-sm">
              <ShieldCheck className="text-emerald-600" size={18} />
              <span>WAYFARER Trust & Guarantee</span>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              {experience.cancellation_policy || 'Free cancellation available up to 24 hours prior to scheduled start time.'}
              Refunds are automatically processed through the original payment method upon cancellation approval.
            </p>
          </section>
        </div>

        {/* Right Column: Interactive Booking Widget */}
        <aside className="lg:col-span-1">
          <div className="sticky top-28 p-6 rounded-3xl bg-white border border-stone-200/90 shadow-xl space-y-6">
            <div className="border-b border-stone-200 pb-4">
              <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                Select Ticket Tier
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="font-serif text-3xl font-bold text-[#0B192C]">₹{activeTier.price}</span>
                <span className="text-xs text-stone-500 font-sans">/ visitor</span>
              </div>
            </div>

            {/* Ticket Tier Picker */}
            <div className="space-y-2.5">
              <label className="block text-xs font-bold text-stone-800">
                Ticket Category
              </label>
              <div className="space-y-2">
                {(experience.ticket_types || [activeTier]).map(tier => (
                  <button
                    key={tier.id}
                    onClick={() => setSelectedTier(tier.id)}
                    className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                      selectedTier === tier.id
                        ? 'border-[#0B192C] bg-stone-50 ring-1 ring-[#0B192C]'
                        : 'border-stone-200 hover:border-stone-400'
                    }`}
                  >
                    <div>
                      <strong className="block text-xs font-bold text-stone-900">{tier.name}</strong>
                      <span className="text-[11px] text-stone-500 line-clamp-1">{tier.description}</span>
                    </div>
                    <span className="font-bold text-xs text-[#0B192C] font-mono">₹{tier.price}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-stone-800">Number of Visitors</label>
                <span className="text-stone-500">Max 10 per booking</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-stone-50 border border-stone-200">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-8 h-8 rounded-lg bg-white border border-stone-200 text-stone-800 font-bold hover:bg-stone-100 flex items-center justify-center transition-colors"
                >
                  -
                </button>
                <span className="font-serif font-bold text-base text-[#0B192C]">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(10, quantity + 1))}
                  className="w-8 h-8 rounded-lg bg-white border border-stone-200 text-stone-800 font-bold hover:bg-stone-100 flex items-center justify-center transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            {/* Price breakdown */}
            <div className="pt-4 border-t border-stone-100 space-y-2 text-xs text-stone-600">
              <div className="flex justify-between">
                <span>{activeTier.name} × {quantity}</span>
                <span className="font-medium text-stone-900">₹{subtotal}</span>
              </div>
              <div className="flex justify-between">
                <span>Platform fees & taxes</span>
                <span className="font-medium text-stone-900">₹{fees}</span>
              </div>
              <div className="pt-2 border-t border-stone-200 flex justify-between text-sm font-bold text-[#0B192C]">
                <span>Total Amount</span>
                <span className="text-lg">₹{total}</span>
              </div>
            </div>

            {/* Checkout Button */}
            <button
              onClick={handleCheckout}
              className="w-full py-3.5 rounded-xl bg-[#0B192C] text-[#FAF8F5] font-semibold text-sm hover:bg-[#D95D39] transition-all flex items-center justify-center gap-2 shadow-lg"
            >
              <span>Continue to Checkout</span>
              <ArrowRight size={16} />
            </button>

            <div className="flex items-center justify-center gap-2 text-[11px] text-stone-500">
              <ShieldCheck size={14} className="text-emerald-600" />
              <span>10-Minute Reservation Hold & Instant QR Pass</span>
            </div>
          </div>
        </aside>
      </div>

      {/* Related Experiences */}
      {experience.related_experiences && experience.related_experiences.length > 0 && (
        <section className="pt-10 border-t border-stone-200 space-y-6">
          <h2 className="font-serif text-2xl font-bold text-[#0B192C]">
            Related Experiences in {experience.city}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {experience.related_experiences.map(rel => (
              <ExperienceCard key={rel.id} item={rel as Experience} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}


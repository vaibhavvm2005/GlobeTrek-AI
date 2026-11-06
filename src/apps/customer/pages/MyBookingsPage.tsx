import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Calendar,
  Clock,
  Ticket,
  MapPin,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Compass
} from 'lucide-react'
import { apiRequest } from '../../../shared/api'
import type { Booking } from '../../../shared/types'
import { useAuth } from '../../../shared/AuthContext'

export function MyBookingsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'ALL' | 'UPCOMING' | 'COMPLETED' | 'CANCELLED'>('ALL')
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [cancelReason, setCancelReason] = useState('Change of travel schedule')
  const [processingCancel, setProcessingCancel] = useState(false)

  const fetchBookings = () => {
    setLoading(true)
    apiRequest<Booking[]>('/bookings/my')
      .then(res => setBookings(res))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchBookings()
  }, [])

  const filtered = bookings.filter(b => {
    if (activeTab === 'ALL') return true
    if (activeTab === 'UPCOMING') return b.status === 'CONFIRMED' || b.status === 'PENDING_PAYMENT'
    if (activeTab === 'COMPLETED') return b.status === 'COMPLETED'
    if (activeTab === 'CANCELLED') return b.status === 'CANCELLED' || b.status === 'REFUNDED' || b.status === 'REFUND_PENDING'
    return true
  })

  const handleCancelBooking = async () => {
    if (!cancellingId) return
    setProcessingCancel(true)
    try {
      await apiRequest(`/bookings/${cancellingId}/cancel`, {
        method: 'POST',
        body: { reason: cancelReason },
      })
      setCancellingId(null)
      fetchBookings()
    } catch (err: any) {
      alert(err.message || 'Could not cancel booking')
    } finally {
      setProcessingCancel(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">Confirmed</span>
      case 'COMPLETED':
        return <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-xs font-bold">Completed / Used</span>
      case 'PENDING_PAYMENT':
        return <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">Hold Pending</span>
      case 'CANCELLED':
        return <span className="px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-300 text-xs font-bold">Cancelled</span>
      case 'REFUND_PENDING':
        return <span className="px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200 text-xs font-bold">Refund Initiated</span>
      case 'REFUNDED':
        return <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-300 text-xs font-bold">Refunded</span>
      default:
        return <span className="px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 text-xs font-bold">{status}</span>
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="border-b border-stone-200 pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-bold tracking-widest text-[#D95D39] uppercase font-sans">
            BOOKING HISTORY
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#0B192C] mt-1">
            My Bookings & Reservations
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            Track confirmed passes, review transaction ledgers, or process eligible ticket cancellations.
          </p>
        </div>

        <Link
          to="/discover"
          className="px-4 py-2.5 rounded-xl bg-[#0B192C] text-white text-xs font-semibold hover:bg-[#D95D39] transition-colors self-start sm:self-auto shadow-sm"
        >
          Book Another Experience →
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-stone-200 text-xs font-semibold gap-6">
        {[
          { key: 'ALL', label: 'All Bookings' },
          { key: 'UPCOMING', label: 'Upcoming' },
          { key: 'COMPLETED', label: 'Completed' },
          { key: 'CANCELLED', label: 'Cancelled & Refunds' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`pb-3 border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-[#0B192C] text-[#0B192C] font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Booking List */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <Compass className="w-8 h-8 text-[#D95D39] animate-spin mx-auto" />
          <p className="text-xs text-stone-500">Loading your journey records...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-16 text-center rounded-3xl bg-white border border-stone-200 space-y-4">
          <Ticket className="w-12 h-12 text-stone-300 mx-auto" />
          <h3 className="font-serif font-bold text-lg text-stone-800">No {activeTab.toLowerCase()} bookings</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Your reservations and verified experiences will appear here.
          </p>
          <Link
            to="/discover"
            className="inline-block px-4 py-2 rounded-xl bg-[#0B192C] text-white text-xs font-semibold"
          >
            Explore Experiences
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(b => (
            <article
              key={b.id}
              className="p-5 sm:p-6 rounded-3xl bg-white border border-stone-200/90 shadow-xs hover:shadow-md transition-shadow flex flex-col md:flex-row gap-5 items-start md:items-center justify-between"
            >
              <div className="flex items-start gap-4">
                {b.image && (
                  <img
                    src={b.image}
                    alt={b.event_title}
                    className="w-20 h-20 rounded-2xl object-cover shrink-0 hidden sm:block"
                  />
                )}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#E06D3B]">
                      #{b.id}
                    </span>
                    {getStatusBadge(b.status)}
                  </div>
                  <h3 className="font-serif font-bold text-base sm:text-lg text-[#0B192C]">
                    {b.event_title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500">
                    <span className="flex items-center gap-1"><MapPin size={13} className="text-stone-400"/> {b.city}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1"><Calendar size={13} className="text-stone-400"/> {b.date_str || 'Date on pass'}</span>
                    <span>·</span>
                    <span className="font-mono font-semibold text-stone-900">₹{b.total_amount}</span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2.5 w-full md:w-auto justify-end border-t md:border-t-0 pt-3 md:pt-0 border-stone-100">
                {(b.status === 'CONFIRMED' || b.status === 'COMPLETED') && (
                  <Link
                    to="/my-tickets"
                    className="px-4 py-2 rounded-xl bg-[#0B192C] text-white text-xs font-semibold hover:bg-[#D95D39] transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <Ticket size={14} />
                    <span>View Pass</span>
                  </Link>
                )}

                {b.status === 'CONFIRMED' && (
                  <button
                    onClick={() => setCancellingId(b.id)}
                    className="px-3.5 py-2 rounded-xl border border-stone-200 text-stone-600 hover:text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors"
                  >
                    Cancel Booking
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Cancellation Modal */}
      {cancellingId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertCircle size={20} />
              <h3 className="font-serif font-bold text-lg text-stone-900">
                Cancel Booking #{cancellingId}
              </h3>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Are you sure you wish to cancel this reservation? The held inventory will be returned to the venue, and a full refund will be recorded.
            </p>

            <div className="space-y-1 text-xs">
              <label className="font-semibold text-stone-800">Reason for cancellation</label>
              <select
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 font-medium"
              >
                <option value="Change of travel schedule">Change of travel schedule</option>
                <option value="Weather / Personal circumstances">Weather / Personal circumstances</option>
                <option value="Accidental booking">Accidental duplicate booking</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="pt-2 flex justify-end gap-2 text-xs font-semibold">
              <button
                onClick={() => setCancellingId(null)}
                disabled={processingCancel}
                className="px-4 py-2 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50"
              >
                Keep Booking
              </button>
              <button
                onClick={handleCancelBooking}
                disabled={processingCancel}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white hover:bg-rose-700"
              >
                {processingCancel ? 'Processing...' : 'Confirm Cancellation & Refund'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


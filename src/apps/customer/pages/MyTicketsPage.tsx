import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Ticket,
  Printer,
  Calendar,
  Clock,
  MapPin,
  ShieldCheck,
  WifiOff,
  CheckCircle2,
  Sparkles,
  ArrowRight
} from 'lucide-react'
import { apiRequest } from '../../../shared/api'
import type { DigitalTicket, Booking } from '../../../shared/types'
import { QRPass } from '../../../shared/components/QRPass'
import { useOffline } from '../../../shared/OfflineContext'
import { useAuth } from '../../../shared/AuthContext'

export function MyTicketsPage() {
  const { isOnline, offlineTickets, cacheTicketLocally } = useOffline()
  const { user } = useAuth()
  const [tickets, setTickets] = useState<DigitalTicket[]>(offlineTickets)
  const [selectedTicketId, setSelectedTicketId] = useState<string>(
    offlineTickets[0]?.booking_id || ''
  )
  const [loading, setLoading] = useState(false)

  // Fetch from server if online and update offline vault
  useEffect(() => {
    if (!isOnline) {
      setTickets(offlineTickets)
      if (!selectedTicketId && offlineTickets.length > 0) {
        setSelectedTicketId(offlineTickets[0].booking_id)
      }
      return
    }

    let active = true
    setLoading(true)
    apiRequest<Booking[]>('/bookings/my')
      .then(async bookings => {
        if (!active) return
        const confirmedBookings = bookings.filter(b => b.status === 'CONFIRMED' || b.status === 'COMPLETED')
        const ticketPromises = confirmedBookings.map(b =>
          apiRequest<DigitalTicket>(`/tickets/${b.id}`).catch(() => null)
        )
        const fetched = (await Promise.all(ticketPromises)).filter(Boolean) as DigitalTicket[]
        
        if (fetched.length > 0) {
          fetched.forEach(t => cacheTicketLocally(t))
          setTickets(fetched)
          if (!selectedTicketId) setSelectedTicketId(fetched[0].booking_id)
        } else {
          setTickets(offlineTickets)
        }
      })
      .catch(() => {
        setTickets(offlineTickets)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [isOnline])

  const activeTicket = tickets.find(t => t.booking_id === selectedTicketId) || tickets[0]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Wallet Header */}
      <div className="border-b border-stone-200/80 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-bold tracking-widest text-[#D95D39] uppercase font-sans">
            PERSONAL TICKET VAULT
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#0B192C] mt-1 flex items-center gap-3">
            <span>Digital Ticket Wallet</span>
            {!isOnline && (
              <span className="text-xs font-sans font-bold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full border border-amber-300 flex items-center gap-1">
                <WifiOff size={13} />
                <span>Offline Vault Ready</span>
              </span>
            )}
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            HMAC-SHA256 verified passes stored safely on your device. Present these at turnstiles and security gates.
          </p>
        </div>

        <button
          onClick={() => window.print()}
          disabled={!activeTicket}
          className="px-4 py-2.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-xs font-semibold text-stone-800 flex items-center gap-2 shadow-xs transition-colors self-start md:self-auto"
        >
          <Printer size={15} />
          <span>Print Pass</span>
        </button>
      </div>

      {tickets.length === 0 ? (
        <div className="p-16 text-center rounded-3xl bg-white border border-stone-200 shadow-sm space-y-4 max-w-md mx-auto">
          <Ticket className="w-12 h-12 text-stone-300 mx-auto" />
          <h3 className="font-serif font-bold text-xl text-stone-800">Your Ticket Wallet is empty</h3>
          <p className="text-xs text-stone-500 leading-relaxed">
            When you complete a booking for a museum, concert, or heritage walk, your verified pass with an offline-scannable QR code will be vaulted here automatically.
          </p>
          <Link
            to="/discover"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0B192C] text-white text-xs font-semibold hover:bg-[#D95D39] transition-colors"
          >
            <span>Explore Experiences</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Left Column: Pass Selector List */}
          <div className="space-y-3">
            <h3 className="font-serif text-sm font-bold uppercase tracking-wider text-stone-500 px-1">
              Your Issued Passes ({tickets.length})
            </h3>
            <div className="space-y-2.5">
              {tickets.map(t => (
                <button
                  key={t.booking_id}
                  onClick={() => setSelectedTicketId(t.booking_id)}
                  className={`w-full p-4 rounded-2xl border text-left transition-all ${
                    t.booking_id === activeTicket?.booking_id
                      ? 'border-[#0B192C] bg-white ring-2 ring-[#0B192C] shadow-md'
                      : 'border-stone-200 bg-white/70 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-[#E06D3B]">{t.booking_id}</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                      {t.status}
                    </span>
                  </div>
                  <h4 className="font-serif font-bold text-sm text-[#0B192C] mt-1 line-clamp-1">
                    {t.event_title}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-stone-500 mt-1 font-medium">
                    <span>{t.city}</span>
                    <span>·</span>
                    <span>{t.date}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right 2 Columns: Full Scaled Pass View */}
          {activeTicket && (
            <div className="lg:col-span-2 rounded-3xl bg-white border border-stone-200 shadow-2xl overflow-hidden">
              {/* Card Top */}
              <div className="bg-[#0B192C] text-white p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] tracking-widest uppercase font-semibold text-[#E06D3B] block">
                    WAYFARER OFFICIAL PASS
                  </span>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold mt-1">
                    {activeTicket.event_title}
                  </h2>
                  <p className="text-xs text-stone-300 mt-1 flex items-center gap-1.5">
                    <MapPin size={13} className="text-[#E06D3B]" />
                    <span>{activeTicket.venue_name}, {activeTicket.city}</span>
                  </p>
                </div>

                <div className="text-left sm:text-right shrink-0">
                  <span className="text-[10px] uppercase font-bold text-stone-400 block">Pass Code</span>
                  <strong className="font-mono text-2xl text-emerald-400 block tracking-wider">
                    {activeTicket.booking_id}
                  </strong>
                  <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-emerald-900/60 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                    VALID GATE TICKET
                  </span>
                </div>
              </div>

              {/* Pass Details & QR Matrix */}
              <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                <div className="md:col-span-2 space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-stone-400 font-semibold block">Date</span>
                      <strong className="font-serif text-sm text-[#0B192C] block mt-0.5">{activeTicket.date}</strong>
                    </div>
                    <div>
                      <span className="text-stone-400 font-semibold block">Gate Window</span>
                      <strong className="font-serif text-sm text-[#0B192C] block mt-0.5">{activeTicket.time}</strong>
                    </div>
                  </div>

                  <div className="border-t border-stone-100 pt-3 text-xs">
                    <span className="text-stone-400 font-semibold block">Ticket Bearer</span>
                    <span className="font-bold text-stone-900 block mt-0.5">{activeTicket.customer_name}</span>
                    <span className="text-stone-500">{activeTicket.customer_email}</span>
                  </div>

                  <div className="border-t border-stone-100 pt-3 text-xs">
                    <span className="text-stone-400 font-semibold block mb-1">Tier Breakdown</span>
                    <ul className="space-y-1 font-mono text-stone-700">
                      {activeTicket.items.map((it, i) => (
                        <li key={i} className="flex justify-between">
                          <span>{it.ticket_name} × {it.quantity}</span>
                          <span>₹{it.subtotal}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="border-t border-stone-100 pt-3 flex justify-between text-xs font-bold text-stone-900">
                    <span>Total Amount Verified:</span>
                    <span className="font-mono text-sm">₹{activeTicket.total_amount}</span>
                  </div>
                </div>

                {/* QR Matrix */}
                <div className="flex flex-col items-center justify-center p-5 bg-stone-50 rounded-2xl border border-stone-200">
                  <QRPass value={activeTicket.qr_token} size={150} />
                  <span className="text-[10px] font-mono font-semibold text-stone-500 mt-2 text-center">
                    Present to Gate Attendant
                  </span>
                </div>
              </div>

              {/* Pass Security Strip */}
              <div className="bg-stone-50 border-t border-stone-200 px-6 py-3.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-500">
                <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                  <ShieldCheck size={14} />
                  <span>One-time Turnstile Check-in · Tamper Proof</span>
                </div>
                <span className="font-mono text-[10px] text-stone-400">
                  Issued: {new Date(activeTicket.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}


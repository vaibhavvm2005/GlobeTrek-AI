import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import {
  CheckCircle2,
  Calendar,
  Ticket,
  Printer,
  ArrowRight,
  Download,
  Share2,
  ShieldCheck,
  Compass,
  MapPin,
  Clock
} from 'lucide-react'
import { apiRequest } from '../../../shared/api'
import type { DigitalTicket } from '../../../shared/types'
import { QRPass } from '../../../shared/components/QRPass'
import { useOffline } from '../../../shared/OfflineContext'

export function BookingSuccessPage() {
  const [searchParams] = useSearchParams()
  const bookingId = searchParams.get('bookingId') || ''
  const navigate = useNavigate()
  const { getOfflineTicket, cacheTicketLocally } = useOffline()

  const [ticket, setTicket] = useState<DigitalTicket | null>(() => getOfflineTicket(bookingId) || null)
  const [loading, setLoading] = useState(!ticket)

  useEffect(() => {
    if (!bookingId) return
    let active = true
    apiRequest<DigitalTicket>(`/tickets/${bookingId}`)
      .then(t => {
        if (active) {
          setTicket(t)
          cacheTicketLocally(t)
        }
      })
      .catch(() => {
        // Fallback to offline cached pass
        const cached = getOfflineTicket(bookingId)
        if (cached && active) setTicket(cached)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [bookingId])

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center space-y-4">
        <Compass className="w-10 h-10 text-[#D95D39] animate-spin mx-auto" />
        <p className="text-sm font-semibold text-stone-600">Generating cryptographic digital pass...</p>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center space-y-4">
        <h2 className="font-serif text-2xl font-bold">Booking Pending or Not Found</h2>
        <p className="text-xs text-stone-500">We could not retrieve the digital pass for reference: {bookingId}</p>
        <Link to="/my-bookings" className="inline-block px-4 py-2 bg-[#0B192C] text-white text-xs font-semibold rounded-xl">
          Check My Bookings
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      {/* Celebration Header */}
      <div className="text-center space-y-3">
        <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-md animate-in zoom-in-75">
          <CheckCircle2 size={30} />
        </div>
        <span className="text-xs font-bold tracking-widest text-emerald-800 uppercase font-sans">
          BOOKING OFFICIALLY CONFIRMED
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#0B192C]">
          You are all set for {ticket.city}!
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 max-w-lg mx-auto">
          Your payment has been successfully verified and your reservation is committed to the authoritative ledger.
        </p>
      </div>

      {/* Printable Digital Gate Pass Card */}
      <div className="relative rounded-3xl bg-white border border-stone-200/90 shadow-2xl overflow-hidden print:shadow-none print:border-none">
        {/* Top Header of Pass */}
        <div className="bg-[#0B192C] text-white p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] tracking-widest uppercase font-semibold text-[#E06D3B] block">
              WAYFARER OFFICIAL PASS
            </span>
            <h2 className="font-serif text-xl sm:text-2xl font-bold mt-1">
              {ticket.event_title}
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-stone-300 mt-2 font-medium">
              <span className="flex items-center gap-1"><MapPin size={13} className="text-[#E06D3B]"/> {ticket.venue_name}</span>
              <span>·</span>
              <span>{ticket.city}</span>
            </div>
          </div>

          <div className="text-left sm:text-right shrink-0">
            <span className="text-[10px] uppercase font-bold text-stone-400 block">Booking Reference</span>
            <strong className="font-mono text-xl sm:text-2xl text-emerald-400 tracking-wider block">
              {ticket.booking_id}
            </strong>
            <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-emerald-900/60 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
              CONFIRMED · OFFLINE CACHED
            </span>
          </div>
        </div>

        {/* Mid Section: Date, Time & QR Code */}
        <div className="p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
          <div className="sm:col-span-2 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-stone-400 font-semibold block">Date</span>
                <span className="font-serif font-bold text-sm text-[#0B192C] mt-0.5 block">
                  {ticket.date}
                </span>
              </div>
              <div>
                <span className="text-stone-400 font-semibold block">Time Window</span>
                <span className="font-serif font-bold text-sm text-[#0B192C] mt-0.5 block">
                  {ticket.time}
                </span>
              </div>
            </div>

            <div className="border-t border-stone-100 pt-3 text-xs">
              <span className="text-stone-400 font-semibold block">Primary Visitor</span>
              <span className="font-bold text-stone-900 block mt-0.5">{ticket.customer_name}</span>
              <span className="text-stone-500">{ticket.customer_email}</span>
            </div>

            <div className="border-t border-stone-100 pt-3 text-xs">
              <span className="text-stone-400 font-semibold block mb-1">Ticket Tiers</span>
              <ul className="space-y-1">
                {ticket.items.map((it, i) => (
                  <li key={i} className="flex justify-between font-mono font-medium text-stone-700">
                    <span>{it.ticket_name} × {it.quantity}</span>
                    <span>₹{it.subtotal}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Genuine Scannable QR Matrix */}
          <div className="flex flex-col items-center justify-center p-4 bg-stone-50 rounded-2xl border border-stone-200/80">
            <QRPass value={ticket.qr_token} size={150} />
            <span className="text-[10px] font-mono font-semibold text-stone-500 mt-2 text-center">
              Scan at Venue Turnstile
            </span>
          </div>
        </div>

        {/* Footer Note */}
        <div className="bg-stone-50/80 border-t border-stone-200/70 px-6 py-3.5 flex items-center justify-between text-[11px] text-stone-500">
          <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
            <ShieldCheck size={14} />
            <span>Cryptographically signed with HMAC-SHA256</span>
          </div>
          <span className="font-mono">Vault Token: {ticket.qr_token.slice(0, 16)}...</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-3 print:hidden">
        <button
          onClick={() => window.print()}
          className="px-5 py-2.5 rounded-xl bg-white border border-stone-200 text-stone-800 hover:bg-stone-50 text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors"
        >
          <Printer size={15} />
          <span>Print Pass</span>
        </button>

        <Link
          to="/my-tickets"
          className="px-6 py-2.5 rounded-xl bg-[#0B192C] text-white hover:bg-[#D95D39] text-xs font-semibold flex items-center gap-2 shadow-md transition-all"
        >
          <Ticket size={15} />
          <span>Go to Ticket Wallet</span>
        </Link>

        <Link
          to="/discover"
          className="px-5 py-2.5 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 text-xs font-semibold transition-colors"
        >
          Explore More Experiences →
        </Link>
      </div>
    </div>
  )
}


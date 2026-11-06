import { ShieldCheck, HelpCircle, PhoneCall, Mail, AlertCircle, RefreshCw } from 'lucide-react'

export function SupportPage() {
  const faqs = [
    {
      q: 'How does the 10-minute inventory hold work?',
      a: 'When you choose your tickets and click proceed, our database immediately reserves those seats exclusively for you for 10 minutes. This prevents anyone else from purchasing the last available ticket while you complete payment.',
    },
    {
      q: 'Can I access my digital ticket without internet?',
      a: 'Yes! All confirmed bookings are automatically cached into your device’s local Ticket Wallet. You can open your scannable HMAC-SHA256 QR code pass at venue turnstiles even in remote forest sanctuaries with zero cell reception.',
    },
    {
      q: 'What is the ticket cancellation and refund policy?',
      a: 'Most museums and experiences offer free cancellation up to 24 hours prior to scheduled start time. Once you submit a cancellation through My Bookings, a refund record is immediately created in the ledger.',
    },
    {
      q: 'How does the gate attendant verify my pass?',
      a: 'Staff scan your ticket’s cryptographic QR token using the WAYFARER CONTROL scanner. The token verifies your booking reference and turns red if already scanned, completely stopping duplicate pass forgery.',
    },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <div className="border-b border-stone-200 pb-6">
        <span className="text-xs font-bold tracking-widest text-[#D95D39] uppercase font-sans">
          CUSTOMER CARE & PROTOCOLS
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#0B192C] mt-1">
          Support & Verification Guidelines
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 mt-1">
          Everything you need to know about gate turnstiles, offline passes, and refund policies.
        </p>
      </div>

      {/* FAQs */}
      <section className="space-y-4">
        <h2 className="font-serif text-2xl font-bold text-[#0B192C]">
          Frequently Asked Questions
        </h2>
        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div key={idx} className="p-5 rounded-2xl bg-white border border-stone-200/90 shadow-xs space-y-2">
              <h3 className="font-serif font-bold text-sm sm:text-base text-stone-900 flex items-start gap-2">
                <HelpCircle size={16} className="text-[#E06D3B] shrink-0 mt-0.5" />
                <span>{faq.q}</span>
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 pl-6 leading-relaxed">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Contact & Desk Info */}
      <section className="p-6 rounded-3xl bg-white border border-stone-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <span className="text-xs font-bold text-stone-400 uppercase tracking-wider block">Customer Support Desk</span>
          <h3 className="font-serif font-bold text-lg text-stone-900">Direct Travel Assistance</h3>
          <p className="text-xs text-stone-600">Available 7 days a week from 07:00 AM to 10:00 PM IST.</p>
          <div className="pt-2 text-xs space-y-1 font-mono text-stone-700">
            <p>Email: concierge@wayfarer.ai</p>
            <p>Hotline: +91 (080) 4567-8900</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0B192C]/5 border border-stone-200 text-xs text-stone-700 space-y-2 flex flex-col justify-center">
          <div className="flex items-center gap-1.5 font-bold text-[#0B192C]">
            <ShieldCheck size={16} className="text-emerald-600" />
            <span>Turnstile Security Standards</span>
          </div>
          <p className="text-[11px] leading-relaxed text-stone-600">
            Tickets carry an HMAC-SHA256 signature linked to our authoritative database. Counterfeiting or re-using a scanned code is prevented at all partner turnstiles.
          </p>
        </div>
      </section>
    </div>
  )
}


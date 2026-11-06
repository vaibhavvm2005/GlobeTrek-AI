import { Bell, Sparkles, CloudRain, Ticket, CheckCircle2 } from 'lucide-react'

export function NotificationsPage() {
  const notifications = [
    {
      id: 1,
      title: 'Price Watch: Bengaluru Museum of Art',
      type: 'price',
      desc: 'Verified general admission passes are available at ₹150 with morning slots open.',
      time: '2 hours ago',
      icon: Bell,
    },
    {
      id: 2,
      title: 'Weather Advisory: Coorg Canopy Trail',
      type: 'weather',
      desc: 'Light afternoon showers forecasted. Outdoor treks are pleasant; carry rain jackets.',
      time: '5 hours ago',
      icon: CloudRain,
    },
    {
      id: 3,
      title: 'Booking Confirmed: Pravega Tech Summit',
      type: 'ticket',
      desc: 'Your gate pass has been stored in your offline Ticket Wallet.',
      time: '1 day ago',
      icon: Ticket,
    },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <div className="border-b border-stone-200 pb-4">
        <span className="text-xs font-bold tracking-widest text-[#D95D39] uppercase font-sans">
          ALERTS & UPDATES
        </span>
        <h1 className="font-serif text-3xl font-bold text-[#0B192C] mt-1">
          Notifications & Price Alerts
        </h1>
      </div>

      <div className="space-y-3">
        {notifications.map(n => {
          const Icon = n.icon
          return (
            <div
              key={n.id}
              className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200/90 shadow-xs flex items-start gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-stone-100 text-[#0B192C] flex items-center justify-center shrink-0">
                <Icon size={18} className="text-[#E06D3B]" />
              </div>
              <div className="flex-1 space-y-0.5">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif font-bold text-sm text-stone-900">{n.title}</h3>
                  <span className="text-[11px] text-stone-400">{n.time}</span>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">{n.desc}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}


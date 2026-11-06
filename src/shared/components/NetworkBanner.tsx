import { WifiOff, Wifi } from 'lucide-react'
import { useOffline } from '../OfflineContext'

export function NetworkBanner() {
  const { isOnline } = useOffline()

  if (isOnline) return null

  return (
    <div
      role="status"
      className="sticky top-0 z-50 bg-amber-700 text-amber-50 px-4 py-2.5 text-xs sm:text-sm font-medium flex items-center justify-between shadow-md transition-all duration-300"
    >
      <div className="flex items-center gap-2.5 max-w-5xl mx-auto w-full">
        <WifiOff size={18} className="shrink-0 animate-pulse text-amber-200" />
        <div>
          <strong>You are currently browsing offline.</strong>
          <span className="ml-1 opacity-90 hidden sm:inline">
            You can still view all your issued tickets, QR codes, and saved itineraries. New bookings will sync upon reconnection.
          </span>
        </div>
      </div>
    </div>
  )
}


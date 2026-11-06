import React, { createContext, useContext, useEffect, useState } from 'react'
import type { DigitalTicket } from './types'

interface OfflineContextType {
  isOnline: boolean
  offlineTickets: DigitalTicket[]
  cacheTicketLocally: (ticket: DigitalTicket) => void
  getOfflineTicket: (bookingId: string) => DigitalTicket | undefined
  saveDraftBooking: (draft: any) => void
  getDraftBooking: () => any
  clearDraftBooking: () => void
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined)

const TICKETS_KEY = 'wayfarer_offline_tickets_vault'
const DRAFT_KEY = 'wayfarer_offline_draft_booking'

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine)
  const [offlineTickets, setOfflineTickets] = useState<DigitalTicket[]>(() => {
    try {
      const stored = localStorage.getItem(TICKETS_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const cacheTicketLocally = (ticket: DigitalTicket) => {
    setOfflineTickets(prev => {
      const filtered = prev.filter(t => t.booking_id !== ticket.booking_id)
      const updated = [ticket, ...filtered]
      localStorage.setItem(TICKETS_KEY, JSON.stringify(updated))
      return updated
    })
  }

  const getOfflineTicket = (bookingId: string): DigitalTicket | undefined => {
    return offlineTickets.find(t => t.booking_id.toUpperCase() === bookingId.toUpperCase())
  }

  const saveDraftBooking = (draft: any) => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  }

  const getDraftBooking = () => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }

  const clearDraftBooking = () => {
    localStorage.removeItem(DRAFT_KEY)
  }

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        offlineTickets,
        cacheTicketLocally,
        getOfflineTicket,
        saveDraftBooking,
        getDraftBooking,
        clearDraftBooking,
      }}
    >
      {children}
    </OfflineContext.Provider>
  )
}

export function useOffline() {
  const ctx = useContext(OfflineContext)
  if (!ctx) throw new Error('useOffline must be used within OfflineProvider')
  return ctx
}


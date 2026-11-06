export type Role =
  | 'CUSTOMER'
  | 'SUPER_ADMIN'
  | 'EVENT_MANAGER'
  | 'BOOKING_MANAGER'
  | 'FINANCE_MANAGER'
  | 'SUPPORT_AGENT'
  | 'TICKET_STAFF'

export type User = {
  id: string
  email: string
  full_name: string
  role: Role
  phone?: string
  created_at?: string
}

export type Category = {
  id: string
  name: string
  slug: string
  icon: string
  description?: string
}

export type Venue = {
  id: string
  name: string
  city: string
  address: string
  capacity: number
  latitude?: number
  longitude?: number
  contact_email?: string
}

export type TicketType = {
  id: string
  event_id: number
  name: string
  price: number
  capacity: number
  booking_limit: number
  description?: string
  available_quantity?: number
  reserved_quantity?: number
}

export type Experience = {
  id: number
  title: string
  slug?: string
  category_id: string
  category_name?: string
  category_icon?: string
  venue_id?: string
  venue_name?: string
  venue_address?: string
  city: string
  price: number
  rating: number
  image: string
  date_str: string
  start_time: string
  end_time: string
  description: string
  highlights?: string[]
  is_published: number
  featured?: number
  cancellation_policy?: string
  inventory?: number
  ticket_types?: TicketType[]
  related_experiences?: Partial<Experience>[]
}

export type BookingStatus =
  | 'PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'REFUND_PENDING'
  | 'REFUNDED'

export type BookingItem = {
  id?: string
  ticket_type_id: string
  ticket_name: string
  quantity: number
  unit_price: number
  subtotal: number
}

export type Booking = {
  id: string
  user_id?: string
  customer_name: string
  customer_email: string
  customer_phone?: string
  event_id: number
  event_title: string
  city: string
  image?: string
  date_str?: string
  start_time?: string
  total_amount: number
  taxes_fees: number
  currency: string
  status: BookingStatus
  created_at: string
  items?: BookingItem[]
  qr_token?: string
  payment_status?: string
  gateway?: string
}

export type DigitalTicket = {
  booking_id: string
  status: BookingStatus
  event_id: number
  event_title: string
  city: string
  venue_name: string
  venue_address: string
  date: string
  time: string
  customer_name: string
  customer_email: string
  total_amount: number
  items: BookingItem[]
  payment_id?: string
  qr_token: string
  created_at: string
}

export type AuditLog = {
  id: number
  actor_email: string
  actor_role: string
  action: string
  entity_type: string
  entity_id: string
  details?: string
  created_at: string
}

export type WeatherInfo = {
  source: string
  temperature_c: number
  condition: string
  recommendation: string
  is_outdoor_friendly: boolean
  last_updated: string
}

export type ItineraryDay = {
  day: number
  theme: string
  morning: { time: string; activity: string; price: number; category: string }
  afternoon: { time: string; activity: string; price: number; category: string }
  evening: { time: string; activity: string; price: number; category: string }
}

export type Itinerary = {
  id: string
  title: string
  destination: string
  start_date?: string
  end_date?: string
  days: ItineraryDay[]
  created_at: string
}


import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './shared/AuthContext'
import { LanguageProvider } from './shared/LanguageContext'
import { OfflineProvider } from './shared/OfflineContext'

// Customer Application
import { CustomerLayout } from './apps/customer/CustomerLayout'
import { HomePage } from './apps/customer/pages/HomePage'
import { DiscoverPage } from './apps/customer/pages/DiscoverPage'
import { DestinationsPage } from './apps/customer/pages/DestinationsPage'
import { EventsPage } from './apps/customer/pages/EventsPage'
import { ExperiencesPage } from './apps/customer/pages/ExperiencesPage'
import { ExperienceDetailPage } from './apps/customer/pages/ExperienceDetailPage'
import { ConciergePage } from './apps/customer/pages/ConciergePage'
import { CheckoutPage } from './apps/customer/pages/CheckoutPage'
import { BookingSuccessPage } from './apps/customer/pages/BookingSuccessPage'
import { MyBookingsPage } from './apps/customer/pages/MyBookingsPage'
import { MyTicketsPage } from './apps/customer/pages/MyTicketsPage'
import { TripPlannerPage } from './apps/customer/pages/TripPlannerPage'
import { WishlistPage } from './apps/customer/pages/WishlistPage'
import { ProfilePage } from './apps/customer/pages/ProfilePage'
import { NotificationsPage } from './apps/customer/pages/NotificationsPage'
import { SupportPage } from './apps/customer/pages/SupportPage'
import { CustomerAuthPage } from './apps/customer/pages/CustomerAuthPage'

// Admin Application (WAYFARER CONTROL)
import { AdminLayout } from './apps/admin/AdminLayout'
import { AdminLoginPage } from './apps/admin/pages/AdminLoginPage'
import { AdminDashboard } from './apps/admin/pages/AdminDashboard'
import { EventsManagement } from './apps/admin/pages/EventsManagement'
import { AttractionsManagement } from './apps/admin/pages/AttractionsManagement'
import { CategoriesManagement } from './apps/admin/pages/CategoriesManagement'
import { VenuesManagement } from './apps/admin/pages/VenuesManagement'
import { InventoryManagement } from './apps/admin/pages/InventoryManagement'
import { BookingsManagement } from './apps/admin/pages/BookingsManagement'
import { PaymentsManagement } from './apps/admin/pages/PaymentsManagement'
import { RefundsManagement } from './apps/admin/pages/RefundsManagement'
import { CustomersManagement } from './apps/admin/pages/CustomersManagement'
import { QRVerificationPage } from './apps/admin/pages/QRVerificationPage'
import { AnalyticsPage } from './apps/admin/pages/AnalyticsPage'
import { AIMonitorPage } from './apps/admin/pages/AIMonitorPage'
import { ReportsPage } from './apps/admin/pages/ReportsPage'
import { AdminSettingsPage } from './apps/admin/pages/AdminSettingsPage'
import { AuditLogsPage } from './apps/admin/pages/AuditLogsPage'

import './index.css'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LanguageProvider>
          <OfflineProvider>
            <Routes>
              {/* ======================================================== */}
              {/* 1. CUSTOMER PORTAL (WAYFARER)                            */}
              {/* ======================================================== */}
              <Route element={<CustomerLayout />}>
                <Route index element={<HomePage />} />
                <Route path="discover" element={<DiscoverPage />} />
                <Route path="destinations" element={<DestinationsPage />} />
                <Route path="events" element={<EventsPage />} />
                <Route path="experiences" element={<ExperiencesPage />} />
                <Route path="events/:id" element={<ExperienceDetailPage />} />
                <Route path="experiences/:id" element={<ExperienceDetailPage />} />
                <Route path="concierge" element={<ConciergePage />} />
                <Route path="checkout" element={<CheckoutPage />} />
                <Route path="booking-success" element={<BookingSuccessPage />} />
                <Route path="my-bookings" element={<MyBookingsPage />} />
                <Route path="my-tickets" element={<MyTicketsPage />} />
                <Route path="trip-planner" element={<TripPlannerPage />} />
                <Route path="wishlist" element={<WishlistPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="support" element={<SupportPage />} />
                <Route path="login" element={<CustomerAuthPage />} />
                <Route path="register" element={<CustomerAuthPage />} />
              </Route>

              {/* ======================================================== */}
              {/* 2. ADMIN PORTAL (WAYFARER CONTROL)                       */}
              {/* ======================================================== */}
              <Route path="admin/login" element={<AdminLoginPage />} />
              <Route path="admin" element={<AdminLayout />}>
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="events" element={<EventsManagement />} />
                <Route path="attractions" element={<AttractionsManagement />} />
                <Route path="categories" element={<CategoriesManagement />} />
                <Route path="venues" element={<VenuesManagement />} />
                <Route path="inventory" element={<InventoryManagement />} />
                <Route path="bookings" element={<BookingsManagement />} />
                <Route path="payments" element={<PaymentsManagement />} />
                <Route path="refunds" element={<RefundsManagement />} />
                <Route path="customers" element={<CustomersManagement />} />
                <Route path="ticket-verification" element={<QRVerificationPage />} />
                <Route path="analytics" element={<AnalyticsPage />} />
                <Route path="ai-monitor" element={<AIMonitorPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="settings" element={<AdminSettingsPage />} />
                <Route path="audit-logs" element={<AuditLogsPage />} />
                <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
              </Route>

              {/* Catch-all fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </OfflineProvider>
        </LanguageProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

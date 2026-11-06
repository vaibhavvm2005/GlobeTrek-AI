import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Compass,
  Menu,
  MessageSquare,
  Sparkles,
  Ticket,
  User,
  X,
  Languages,
  Calendar,
  Heart,
  MapPin,
  ShieldCheck,
  LogOut,
  ChevronDown
} from 'lucide-react'
import { useAuth } from '../../shared/AuthContext'
import { useLanguage, type Language } from '../../shared/LanguageContext'
import { NetworkBanner } from '../../shared/components/NetworkBanner'

export function CustomerLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [langDropdownOpen, setLangDropdownOpen] = useState(false)
  const { user, isAuthenticated, logout, isAdmin } = useAuth()
  const { language, setLanguage, t } = useLanguage()
  const navigate = useNavigate()

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 text-sm font-medium transition-colors ${
      isActive ? 'text-[#D95D39] font-semibold' : 'text-stone-700 hover:text-stone-950'
    }`

  const changeLanguage = (l: Language) => {
    setLanguage(l)
    setLangDropdownOpen(false)
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#0B192C] font-sans flex flex-col selection:bg-[#E06D3B]/20 selection:text-[#0B192C]">
      <NetworkBanner />

      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#FAF8F5]/90 backdrop-blur-md border-b border-stone-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo & Tagline */}
          <NavLink to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-[#0B192C] text-[#FAF8F5] flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <Compass className="w-5 h-5 text-[#E06D3B]" />
            </div>
            <div>
              <span className="font-serif tracking-wider font-bold text-xl block leading-none text-[#0B192C]">
                GlobeTrek AI
              </span>
              <span className="text-[10px] tracking-widest uppercase font-semibold text-stone-500 block mt-1">
                JOURNEYS OF INDIA
              </span>
            </div>
          </NavLink>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-1 font-sans">
            <NavLink to="/discover" className={navClass}>
              {t.navDiscover}
            </NavLink>
            <NavLink to="/destinations" className={navClass}>
              {t.navDestinations}
            </NavLink>
            <NavLink to="/events" className={navClass}>
              {t.navEvents}
            </NavLink>
            <NavLink to="/experiences" className={navClass}>
              {t.navExperiences}
            </NavLink>
            <NavLink to="/concierge" className={({ isActive }) =>
              `px-3 py-2 text-sm font-medium transition-colors flex items-center gap-1.5 ${
                isActive ? 'text-[#D95D39] font-semibold' : 'text-stone-700 hover:text-stone-950'
              }`
            }>
              <Sparkles size={15} className="text-[#D95D39]" />
              {t.navConcierge}
            </NavLink>
            <NavLink to="/trip-planner" className={navClass}>
              {t.navTripPlanner}
            </NavLink>
            <NavLink to="/my-tickets" className={({ isActive }) =>
              `px-3 py-2 text-sm font-medium transition-colors flex items-center gap-1.5 ${
                isActive ? 'text-[#D95D39] font-semibold' : 'text-stone-700 hover:text-stone-950'
              }`
            }>
              <Ticket size={15} className="text-[#0B192C]" />
              {t.navMyTickets}
            </NavLink>
          </nav>

          {/* Action buttons (Language, Auth, Wishlist, Admin) */}
          <div className="flex items-center space-x-3">
            {/* Language Selector */}
            <div className="relative">
              <button
                onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-stone-100/80 hover:bg-stone-200/80 text-stone-700 border border-stone-200/60 transition-colors"
                aria-label="Change language"
              >
                <Languages size={14} className="text-[#D95D39]" />
                <span className="uppercase">{language}</span>
                <ChevronDown size={12} />
              </button>
              {langDropdownOpen && (
                <div className="absolute right-0 mt-2 w-36 bg-white rounded-xl shadow-xl border border-stone-200/80 py-1.5 z-50 animate-in fade-in zoom-in-95">
                  <button
                    onClick={() => changeLanguage('en')}
                    className={`w-full text-left px-3.5 py-2 text-xs font-medium flex items-center justify-between ${
                      language === 'en' ? 'bg-stone-100 font-bold text-[#D95D39]' : 'text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    <span>English</span>
                    <span className="text-[10px] text-stone-400">EN</span>
                  </button>
                  <button
                    onClick={() => changeLanguage('hi')}
                    className={`w-full text-left px-3.5 py-2 text-xs font-medium flex items-center justify-between ${
                      language === 'hi' ? 'bg-stone-100 font-bold text-[#D95D39]' : 'text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    <span>हिंदी</span>
                    <span className="text-[10px] text-stone-400">HI</span>
                  </button>
                  <button
                    onClick={() => changeLanguage('kn')}
                    className={`w-full text-left px-3.5 py-2 text-xs font-medium flex items-center justify-between ${
                      language === 'kn' ? 'bg-stone-100 font-bold text-[#D95D39]' : 'text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    <span>ಕನ್ನಡ</span>
                    <span className="text-[10px] text-stone-400">KN</span>
                  </button>
                </div>
              )}
            </div>

            {/* Wishlist Icon */}
            <NavLink
              to="/wishlist"
              className="p-2 text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-100/80 transition-colors hidden sm:flex"
              title="Saved Experiences"
            >
              <Heart size={18} />
            </NavLink>

            {/* User Profile or Login */}
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <NavLink
                  to="/profile"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-stone-200/80 bg-white hover:bg-stone-50 transition-colors text-xs font-medium"
                >
                  <div className="w-6 h-6 rounded-full bg-[#0B192C] text-white flex items-center justify-center text-[11px] font-bold">
                    {user?.full_name?.charAt(0) || 'U'}
                  </div>
                  <span className="hidden md:inline font-semibold text-stone-800">{user?.full_name?.split(' ')[0]}</span>
                </NavLink>
                <button
                  onClick={logout}
                  className="p-2 text-stone-400 hover:text-red-600 rounded-lg transition-colors"
                  title="Sign out"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <NavLink
                to="/login"
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#0B192C] text-[#FAF8F5] hover:bg-stone-800 transition-colors shadow-sm"
              >
                {t.navLogin}
              </NavLink>
            )}

            {/* Admin Switcher (If user is Admin or for Hackathon demonstration) */}
            {isAdmin && (
              <NavLink
                to="/admin/dashboard"
                className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 transition-colors"
              >
                <ShieldCheck size={14} className="text-emerald-700" />
                <span>Admin Suite</span>
              </NavLink>
            )}

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-stone-700 lg:hidden rounded-lg hover:bg-stone-100"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-stone-200/80 bg-[#FAF8F5] px-4 pt-3 pb-6 space-y-2 animate-in slide-in-from-top-4">
            <NavLink
              to="/discover"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-medium hover:bg-stone-100"
            >
              {t.navDiscover}
            </NavLink>
            <NavLink
              to="/destinations"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-medium hover:bg-stone-100"
            >
              {t.navDestinations}
            </NavLink>
            <NavLink
              to="/events"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-medium hover:bg-stone-100"
            >
              {t.navEvents}
            </NavLink>
            <NavLink
              to="/experiences"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-medium hover:bg-stone-100"
            >
              {t.navExperiences}
            </NavLink>
            <NavLink
              to="/concierge"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-[#D95D39] hover:bg-stone-100"
            >
              <Sparkles size={16} />
              {t.navConcierge}
            </NavLink>
            <NavLink
              to="/trip-planner"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-medium hover:bg-stone-100"
            >
              {t.navTripPlanner}
            </NavLink>
            <NavLink
              to="/my-tickets"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-medium hover:bg-stone-100 font-semibold"
            >
              {t.navMyTickets}
            </NavLink>
            <NavLink
              to="/my-bookings"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-medium hover:bg-stone-100"
            >
              {t.navMyBookings}
            </NavLink>
            <NavLink
              to="/wishlist"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-medium hover:bg-stone-100"
            >
              {t.navWishlist}
            </NavLink>
            {isAdmin && (
              <NavLink
                to="/admin/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 mt-2"
              >
                Switch to Admin Control Center →
              </NavLink>
            )}
          </div>
        )}
      </header>

      {/* Main Page Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Floating Concierge Action Button */}
      <button
        onClick={() => navigate('/concierge')}
        className="fixed bottom-6 right-6 z-30 flex items-center gap-2.5 px-4 py-3 rounded-full bg-[#0B192C] text-[#FAF8F5] shadow-2xl hover:bg-[#D95D39] transition-all hover:scale-105 active:scale-95 group font-medium text-sm border border-stone-700/30"
        aria-label="Open AI Travel Concierge"
      >
        <div className="w-6 h-6 rounded-full bg-[#D95D39] group-hover:bg-[#0B192C] flex items-center justify-center transition-colors">
          <Sparkles size={14} className="text-white" />
        </div>
        <span>{t.askWayfarer}</span>
      </button>

      {/* Editorial Footer */}
      <footer className="bg-[#121A26] text-stone-300 border-t border-stone-800 pt-16 pb-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-stone-800">
            {/* Col 1: Brand & Philosophy */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#E06D3B] text-white flex items-center justify-center">
                  <Compass className="w-5 h-5" />
                </div>
                <span className="font-serif tracking-wider font-bold text-xl text-white">
                  GlobeTrek AI
                </span>
              </div>
              <p className="text-xs text-stone-400 leading-relaxed">
                An authoritative digital ticketing and conversational exploration platform celebrating the architecture, art, monuments, and living culture of South Asia.
              </p>
              <div className="flex items-center gap-2 text-[11px] text-stone-500">
                <ShieldCheck size={14} className="text-emerald-500" />
                <span>HMAC-Signed Verifiable Passes · ISO-standard Ticket Ledger</span>
              </div>
            </div>

            {/* Col 2: Top Destinations */}
            <div>
              <h4 className="font-serif text-sm font-semibold text-white tracking-wide uppercase mb-4">
                Destinations
              </h4>
              <ul className="space-y-2.5 text-xs text-stone-400">
                <li><NavLink to="/discover?city=Bengaluru" className="hover:text-white transition-colors">Bengaluru Heritage & Modern Art</NavLink></li>
                <li><NavLink to="/discover?city=Hampi" className="hover:text-white transition-colors">Hampi Vijayanagara Ruins</NavLink></li>
                <li><NavLink to="/discover?city=Mysuru" className="hover:text-white transition-colors">Mysore Royal Palace Illumination</NavLink></li>
                <li><NavLink to="/discover?city=Coorg" className="hover:text-white transition-colors">Coorg Western Ghats Canopy</NavLink></li>
                <li><NavLink to="/discover?city=Mumbai" className="hover:text-white transition-colors">Mumbai Performing Arts & Biennales</NavLink></li>
              </ul>
            </div>

            {/* Col 3: Experiences & Concierge */}
            <div>
              <h4 className="font-serif text-sm font-semibold text-white tracking-wide uppercase mb-4">
                Experiences
              </h4>
              <ul className="space-y-2.5 text-xs text-stone-400">
                <li><NavLink to="/concierge" className="hover:text-[#E06D3B] transition-colors flex items-center gap-1.5"><Sparkles size={12}/> AI Conversational Booking</NavLink></li>
                <li><NavLink to="/trip-planner" className="hover:text-white transition-colors">Smart Multi-Day Itinerary Planner</NavLink></li>
                <li><NavLink to="/my-tickets" className="hover:text-white transition-colors">Offline Digital Ticket Wallet</NavLink></li>
                <li><NavLink to="/events" className="hover:text-white transition-colors">Campus Fests & Innovation Summits</NavLink></li>
                <li><NavLink to="/support" className="hover:text-white transition-colors">Cancellation & Refund Guidelines</NavLink></li>
              </ul>
            </div>

            {/* Col 4: Multilingual & Operations */}
            <div>
              <h4 className="font-serif text-sm font-semibold text-white tracking-wide uppercase mb-4">
                Multilingual & Access
              </h4>
              <p className="text-xs text-stone-400 leading-relaxed mb-4">
                Accessible travel for everyone. Book seamlessly in English, Hindi (हिंदी), and Kannada (ಕನ್ನಡ) with real-time inventory locking.
              </p>
              <div className="pt-2 border-t border-stone-800 flex items-center justify-between">
                <span className="text-[11px] text-stone-500">Staff Portal:</span>
                <NavLink
                  to="/admin/login"
                  className="text-xs text-stone-400 hover:text-white underline underline-offset-4 font-mono"
                >
                  ADMIN CONTROL →
                </NavLink>
              </div>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-4">
            <p>© 2026 GlobeTrek AI. Discover the world. Experience more.</p>
            <div className="flex space-x-6 text-stone-400">
              <NavLink to="/support" className="hover:text-stone-300">Terms of Booking</NavLink>
              <NavLink to="/support" className="hover:text-stone-300">Privacy & Data Security</NavLink>
              <NavLink to="/support" className="hover:text-stone-300">Gate Verification Protocols</NavLink>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  User,
  Mail,
  Phone,
  Languages,
  ShieldCheck,
  Ticket,
  Heart,
  Calendar,
  LogOut,
  Compass
} from 'lucide-react'
import { useAuth } from '../../../shared/AuthContext'
import { useLanguage, type Language } from '../../../shared/LanguageContext'

export function ProfilePage() {
  const { user, logout, isAuthenticated } = useAuth()
  const { language, setLanguage } = useLanguage()
  const navigate = useNavigate()

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <User className="w-12 h-12 text-stone-300 mx-auto" />
        <h2 className="font-serif text-2xl font-bold">Please Sign In</h2>
        <p className="text-xs text-stone-500">You must be logged in to access your personal traveller profile.</p>
        <Link to="/login" className="inline-block px-5 py-2.5 rounded-xl bg-[#0B192C] text-white text-xs font-semibold">
          Sign In to WAYFARER
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="border-b border-stone-200 pb-6">
        <span className="text-xs font-bold tracking-widest text-[#D95D39] uppercase font-sans">
          TRAVELLER ACCOUNT
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#0B192C] mt-1">
          Profile & Preferences
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Details Card */}
        <div className="p-6 rounded-3xl bg-white border border-stone-200 shadow-sm space-y-5 md:col-span-2">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#0B192C] text-white flex items-center justify-center font-bold text-2xl">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div>
              <h2 className="font-serif font-bold text-xl text-stone-900">{user?.full_name}</h2>
              <span className="text-xs text-stone-500 flex items-center gap-1 font-mono">
                <Mail size={12} /> {user?.email}
              </span>
            </div>
          </div>

          <div className="border-t border-stone-100 pt-4 space-y-3 text-xs">
            <div className="flex justify-between py-1">
              <span className="text-stone-500 font-medium">Account Role:</span>
              <span className="font-bold text-[#0B192C]">{user?.role}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-stone-500 font-medium">Contact Phone:</span>
              <span className="font-mono text-stone-800">{user?.phone || '+91 98450 44556'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-stone-500 font-medium">Platform Security:</span>
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <ShieldCheck size={14} /> PBKDF2 Encrypted
              </span>
            </div>
          </div>

          {/* Preferred Language Switcher */}
          <div className="border-t border-stone-100 pt-4 space-y-2">
            <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
              <Languages size={15} className="text-[#D95D39]" />
              <span>Preferred Interface & Concierge Language</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { code: 'en', name: 'English' },
                { code: 'hi', name: 'हिंदी' },
                { code: 'kn', name: 'ಕನ್ನಡ' },
              ].map(lang => (
                <button
                  key={lang.code}
                  onClick={() => setLanguage(lang.code as Language)}
                  className={`py-2 rounded-xl text-xs font-semibold border transition-colors ${
                    language === lang.code
                      ? 'bg-[#0B192C] text-white border-[#0B192C]'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  {lang.name}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-stone-100 flex justify-end">
            <button
              onClick={() => {
                logout()
                navigate('/')
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 flex items-center gap-1.5 transition-colors"
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Quick Links Column */}
        <div className="space-y-3">
          <Link
            to="/my-tickets"
            className="p-5 rounded-2xl bg-white border border-stone-200 shadow-xs hover:border-[#0B192C] transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-stone-100 group-hover:bg-[#E06D3B]/10 text-stone-800 group-hover:text-[#D95D39] flex items-center justify-center transition-colors">
                <Ticket size={18} />
              </div>
              <div>
                <strong className="block text-xs font-bold text-stone-900">Ticket Wallet</strong>
                <span className="text-[11px] text-stone-500">Offline QR passes</span>
              </div>
            </div>
            <span className="text-stone-400 group-hover:translate-x-1 transition-transform">→</span>
          </Link>

          <Link
            to="/my-bookings"
            className="p-5 rounded-2xl bg-white border border-stone-200 shadow-xs hover:border-[#0B192C] transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-stone-100 group-hover:bg-[#E06D3B]/10 text-stone-800 group-hover:text-[#D95D39] flex items-center justify-center transition-colors">
                <Calendar size={18} />
              </div>
              <div>
                <strong className="block text-xs font-bold text-stone-900">Booking History</strong>
                <span className="text-[11px] text-stone-500">Past & upcoming</span>
              </div>
            </div>
            <span className="text-stone-400 group-hover:translate-x-1 transition-transform">→</span>
          </Link>

          <Link
            to="/wishlist"
            className="p-5 rounded-2xl bg-white border border-stone-200 shadow-xs hover:border-[#0B192C] transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-stone-100 group-hover:bg-[#E06D3B]/10 text-stone-800 group-hover:text-[#D95D39] flex items-center justify-center transition-colors">
                <Heart size={18} />
              </div>
              <div>
                <strong className="block text-xs font-bold text-stone-900">Wishlist & Price Watch</strong>
                <span className="text-[11px] text-stone-500">Saved destinations</span>
              </div>
            </div>
            <span className="text-stone-400 group-hover:translate-x-1 transition-transform">→</span>
          </Link>
        </div>
      </div>
    </div>
  )
}


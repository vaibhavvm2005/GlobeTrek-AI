import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Compass, Mail, Lock, User, ArrowRight, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react'
import { useAuth } from '../../../shared/AuthContext'
import { apiRequest } from '../../../shared/api'

export function CustomerAuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('customer@wayfarer.com')
  const [password, setPassword] = useState('pass123')
  const [fullName, setFullName] = useState('Aarav Sharma')
  const [errorMsg, setErrorMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const { login, loginAsDemoRole } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setLoading(true)

    try {
      if (mode === 'login') {
        const res = await apiRequest('/auth/login', {
          method: 'POST',
          body: { email, password },
        })
        login(res.token, res.user)
        navigate('/my-tickets')
      } else {
        const res = await apiRequest('/auth/register', {
          method: 'POST',
          body: { email, password, full_name: fullName },
        })
        login(res.token, res.user)
        navigate('/discover')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please verify credentials.')
    } finally {
      setLoading(false)
    }
  }

  const handleDemoTravelerLogin = async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      await loginAsDemoRole('CUSTOMER')
      navigate('/my-tickets')
    } catch (err: any) {
      setErrorMsg(err.message || 'Demo login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16 space-y-8">
      {/* Brand header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-[#0B192C] text-white flex items-center justify-center mx-auto shadow-md">
          <Compass className="w-6 h-6 text-[#E06D3B]" />
        </div>
        <h1 className="font-serif text-3xl font-bold text-[#0B192C]">
          {mode === 'login' ? 'Welcome Back to WAYFARER' : 'Begin Your Journey'}
        </h1>
        <p className="text-xs text-stone-500">
          Save your favourite itineraries, view offline passes, and manage tickets.
        </p>
      </div>

      {/* Auth Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-stone-200/90 shadow-xl space-y-6">
        {/* Mode Switcher Tabs */}
        <div className="grid grid-cols-2 p-1 bg-stone-100 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`py-2 rounded-lg transition-colors ${
              mode === 'login' ? 'bg-white text-[#0B192C] shadow-xs' : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`py-2 rounded-lg transition-colors ${
              mode === 'register' ? 'bg-white text-[#0B192C] shadow-xs' : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            Create Account
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {mode === 'register' && (
            <label className="space-y-1 block">
              <span className="font-semibold text-stone-700">Full Name</span>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" size={15} />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="e.g. Aarav Sharma"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0B192C]"
                />
              </div>
            </label>
          )}

          <label className="space-y-1 block">
            <span className="font-semibold text-stone-700">Email Address</span>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" size={15} />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0B192C]"
              />
            </div>
          </label>

          <label className="space-y-1 block">
            <span className="font-semibold text-stone-700">Password</span>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" size={15} />
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0B192C]"
              />
            </div>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[#0B192C] text-white font-semibold text-xs hover:bg-[#D95D39] transition-all flex items-center justify-center gap-1.5 shadow-md"
          >
            <span>{loading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Create Account'}</span>
            <ArrowRight size={14} />
          </button>
        </form>

        {/* Quick Demo Traveler Auto-fill */}
        <div className="pt-4 border-t border-stone-100 text-center space-y-2">
          <span className="text-[11px] text-stone-400 block font-medium">Quick Evaluator Access</span>
          <button
            type="button"
            onClick={handleDemoTravelerLogin}
            disabled={loading}
            className="w-full py-2.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100/70 border border-amber-200/80 text-amber-900 text-xs font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={14} className="text-amber-700" />
            <span>1-Click Sign In as Traveler (Aarav Sharma)</span>
          </button>
        </div>
      </div>
    </div>
  )
}


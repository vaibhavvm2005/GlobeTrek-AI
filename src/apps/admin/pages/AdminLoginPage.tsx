import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ShieldCheck, Lock, Mail, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../../../shared/AuthContext'
import { apiRequest } from '../../../shared/api'
import type { Role } from '../../../shared/types'

export function AdminLoginPage() {
  const [email, setEmail] = useState('admin@wayfarer.com')
  const [password, setPassword] = useState('admin123')
  const [errorMsg, setErrorMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const { login, loginAsDemoRole } = useAuth()
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setLoading(true)
    try {
      const res = await apiRequest('/auth/login', {
        method: 'POST',
        body: { email, password },
      })
      if (res.user.role === 'CUSTOMER') {
        throw new Error('Access denied. Customer accounts cannot access the Operations Control Center.')
      }
      login(res.token, res.user)
      navigate('/admin/dashboard')
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const quickLogin = async (roleName: Role) => {
    setLoading(true)
    setErrorMsg('')
    try {
      await loginAsDemoRole(roleName)
      navigate('/admin/dashboard')
    } catch (err: any) {
      setErrorMsg(err.message || 'Quick login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0B192C] flex items-center justify-center p-4 selection:bg-[#E06D3B] selection:text-white">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#E06D3B] text-white flex items-center justify-center mx-auto shadow-lg">
            <ShieldCheck size={26} />
          </div>
          <h1 className="font-serif text-3xl font-bold text-white tracking-wide">
            WAYFARER CONTROL
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            Enterprise Operations, Gate Verification & Inventory Suite
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="font-serif font-bold text-lg text-slate-900">
              Staff Portal Access
            </h2>
            <span className="text-xs text-slate-500">Sign in with provisioned administrative credentials</span>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <label className="space-y-1 block">
              <span className="font-semibold text-slate-700">Official Email</span>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0B192C] font-mono text-xs"
                />
              </div>
            </label>

            <label className="space-y-1 block">
              <span className="font-semibold text-slate-700">Password</span>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0B192C] font-mono text-xs"
                />
              </div>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#0B192C] text-white font-semibold text-xs hover:bg-[#E06D3B] transition-colors flex items-center justify-center gap-2 shadow-md"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Control Center'}</span>
              <ArrowRight size={14} />
            </button>
          </form>

          {/* Quick Evaluator Access Demo Roles */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <span className="text-[11px] font-mono text-slate-400 block text-center uppercase tracking-wider">
              Evaluator Quick Access
            </span>
            <div className="space-y-1.5 font-mono text-xs">
              <button
                type="button"
                onClick={() => quickLogin('SUPER_ADMIN')}
                className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-left flex items-center justify-between transition-colors"
              >
                <span>Maya Shenoy · Super Admin</span>
                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded">All Access</span>
              </button>
              <button
                type="button"
                onClick={() => quickLogin('EVENT_MANAGER')}
                className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-left flex items-center justify-between transition-colors"
              >
                <span>Rajesh Rao · Event Manager</span>
                <span className="text-[10px] text-blue-700 font-bold bg-blue-100 px-2 py-0.5 rounded">Catalog & Inventory</span>
              </button>
              <button
                type="button"
                onClick={() => quickLogin('TICKET_STAFF')}
                className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-left flex items-center justify-between transition-colors"
              >
                <span>Deepa Nair · Turnstile Staff</span>
                <span className="text-[10px] text-amber-700 font-bold bg-amber-100 px-2 py-0.5 rounded">QR Gate Scanning</span>
              </button>
            </div>
          </div>
        </div>

        <div className="text-center">
          <Link to="/" className="text-xs text-slate-400 hover:text-white transition-colors">
            ← Return to WAYFARER Customer Portal
          </Link>
        </div>
      </div>
    </div>
  )
}


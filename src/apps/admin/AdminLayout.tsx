import { useState } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Calendar,
  Landmark,
  Layers,
  MapPin,
  Package,
  BookOpen,
  CreditCard,
  RotateCcw,
  Users,
  QrCode,
  BarChart3,
  Bot,
  Bell,
  FileSpreadsheet,
  Settings,
  History,
  LogOut,
  ShieldCheck,
  ChevronDown,
  Menu,
  X,
  Search,
  ExternalLink
} from 'lucide-react'
import { useAuth } from '../../shared/AuthContext'
import type { Role } from '../../shared/types'

export function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user, logout, isAdmin, role, loginAsDemoRole } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Navigation Items
  const navSections = [
    {
      title: 'OPERATIONS',
      items: [
        { path: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard },
        { path: '/admin/bookings', label: 'Bookings', icon: BookOpen },
        { path: '/admin/ticket-verification', label: 'QR Turnstile Check-in', icon: QrCode },
        { path: '/admin/inventory', label: 'Ticket Inventory', icon: Package },
      ],
    },
    {
      title: 'CATALOG & VENUES',
      items: [
        { path: '/admin/events', label: 'Events Management', icon: Calendar },
        { path: '/admin/attractions', label: 'Attractions & Museums', icon: Landmark },
        { path: '/admin/categories', label: 'Categories Taxonomy', icon: Layers },
        { path: '/admin/venues', label: 'Venues & Capacities', icon: MapPin },
      ],
    },
    {
      title: 'FINANCE & CUSTOMERS',
      items: [
        { path: '/admin/payments', label: 'Payment Ledger', icon: CreditCard },
        { path: '/admin/refunds', label: 'Refunds Queue', icon: RotateCcw },
        { path: '/admin/customers', label: 'Customer Directory', icon: Users },
      ],
    },
    {
      title: 'INTELLIGENCE & AUDIT',
      items: [
        { path: '/admin/analytics', label: 'Analytics & Trends', icon: BarChart3 },
        { path: '/admin/ai-monitor', label: 'AI Concierge Monitor', icon: Bot },
        { path: '/admin/reports', label: 'Exportable Reports', icon: FileSpreadsheet },
        { path: '/admin/audit-logs', label: 'Audit Trail', icon: History },
        { path: '/admin/settings', label: 'System Settings', icon: Settings },
      ],
    },
  ]

  const handleRoleSwitch = async (targetRole: Role) => {
    await loginAsDemoRole(targetRole)
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans flex flex-col md:flex-row antialiased">
      {/* Admin Sidebar */}
      <aside
        className={`${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 fixed md:static inset-y-0 left-0 z-50 w-64 bg-[#0B192C] text-slate-300 flex flex-col justify-between border-r border-slate-800 transition-transform duration-300 ease-in-out shrink-0`}
      >
        <div className="flex flex-col h-full">
          {/* Brand header */}
          <div className="h-16 px-5 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#E06D3B] text-white flex items-center justify-center font-bold shadow-sm">
                <ShieldCheck size={18} />
              </div>
              <div>
                <span className="font-serif tracking-wide font-bold text-base text-white block leading-none">
                  GlobeTrek AI
                </span>
                <span className="text-[10px] font-mono tracking-widest text-[#E06D3B] uppercase font-bold block mt-0.5">
                  CONTROL CENTER
                </span>
              </div>
            </div>
            <button
              onClick={() => setMobileOpen(false)}
              className="p-1.5 text-slate-400 hover:text-white md:hidden"
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation Items (Scrollable) */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
            {navSections.map(section => (
              <div key={section.title} className="space-y-1">
                <span className="px-3 text-[10px] font-bold tracking-widest text-slate-500 uppercase font-mono block">
                  {section.title}
                </span>
                {section.items.map(item => {
                  const Icon = item.icon
                  const active = location.pathname === item.path
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                        active
                          ? 'bg-[#E06D3B] text-white font-semibold shadow-sm'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <Icon size={16} className={active ? 'text-white' : 'text-slate-400'} />
                      <span>{item.label}</span>
                    </NavLink>
                  )
                })}
              </div>
            ))}
          </div>

          {/* Admin User Profile & Switcher */}
          <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 text-white flex items-center justify-center font-bold text-xs">
                  {user?.full_name?.charAt(0) || 'A'}
                </div>
                <div className="truncate max-w-[110px]">
                  <strong className="block text-white text-xs truncate">{user?.full_name || 'Administrator'}</strong>
                  <span className="text-[10px] font-mono text-[#E06D3B] block uppercase">{role || 'STAFF'}</span>
                </div>
              </div>
              <button
                onClick={() => {
                  logout()
                  navigate('/admin/login')
                }}
                className="p-2 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                title="Sign out of Admin Suite"
              >
                <LogOut size={16} />
              </button>
            </div>

            {/* Quick Demo Role Switcher */}
            <div className="pt-2 border-t border-slate-800 text-[10px] space-y-1">
              <span className="text-slate-500 block font-mono">Simulate Role:</span>
              <div className="grid grid-cols-2 gap-1 font-mono">
                <button
                  onClick={() => handleRoleSwitch('SUPER_ADMIN')}
                  className={`px-1.5 py-1 rounded text-left truncate border ${
                    role === 'SUPER_ADMIN'
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  Super Admin
                </button>
                <button
                  onClick={() => handleRoleSwitch('EVENT_MANAGER')}
                  className={`px-1.5 py-1 rounded text-left truncate border ${
                    role === 'EVENT_MANAGER'
                      ? 'bg-blue-950 text-blue-300 border-blue-700'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  Event Mgr
                </button>
                <button
                  onClick={() => handleRoleSwitch('TICKET_STAFF')}
                  className={`px-1.5 py-1 rounded text-left truncate border ${
                    role === 'TICKET_STAFF'
                      ? 'bg-amber-950 text-amber-300 border-amber-700'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  Ticket Staff
                </button>
                <button
                  onClick={() => handleRoleSwitch('FINANCE_MANAGER')}
                  className={`px-1.5 py-1 rounded text-left truncate border ${
                    role === 'FINANCE_MANAGER'
                      ? 'bg-purple-950 text-purple-300 border-purple-700'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  Finance
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Admin Topbar */}
        <header className="h-16 px-4 sm:px-8 bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 text-slate-600 md:hidden rounded-lg hover:bg-slate-100"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <span className="font-mono text-slate-400">GlobeTrek Admin</span>
              <span>/</span>
              <span className="text-slate-900 font-semibold capitalize">
                {location.pathname.replace('/admin/', '').replace('-', ' ') || 'Dashboard'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Direct Switch to Customer Portal */}
            <NavLink
              to="/"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
            >
              <span>View Customer Portal</span>
              <ExternalLink size={12} />
            </NavLink>

            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-mono font-bold">
              ● API Online
            </span>
          </div>
        </header>

        {/* Admin Content Route Outlet */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full space-y-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

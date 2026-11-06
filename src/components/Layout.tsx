import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { ChevronDown, Menu, Sparkles, Ticket, UserRound, X } from 'lucide-react'

export function Layout() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const link = ({ isActive }: { isActive: boolean }) => isActive ? 'active' : ''

  return <div className="app-shell">
    <header className="topbar">
      <NavLink to="/" className="brand" aria-label="WAYFARER AI home"><span className="brand-mark"><Ticket size={19}/></span>WAYFARER<span>AI</span></NavLink>
      <nav className={open ? 'main-nav open' : 'main-nav'}>
        <NavLink to="/explore" className={link}>Explore</NavLink>
        <NavLink to="/assistant" className={link}>AI Assistant</NavLink>
        <NavLink to="/bookings" className={link}>My bookings</NavLink>
        <NavLink to="/admin" className={link}>Admin</NavLink>
      </nav>
      <div className="nav-actions">
        <button className="language-button">EN <ChevronDown size={14}/></button>
        <button className="icon-user" aria-label="Open profile" onClick={() => navigate('/login')}><UserRound size={18}/></button>
        <button className="nav-primary" onClick={() => navigate('/explore')}>Explore events</button>
        <button className="menu-button" onClick={() => setOpen(!open)}>{open ? <X/> : <Menu/>}</button>
      </div>
    </header>
    <Outlet />
    <Footer />
    <button className="floating-assistant" onClick={() => navigate('/assistant')}><Sparkles size={20}/><span>Ask WAYFARER</span></button>
  </div>
}

function Footer() {
  return <footer className="site-footer">
    <NavLink to="/" className="brand"><span className="brand-mark"><Ticket size={19}/></span>WAYFARER<span>AI</span></NavLink>
    <p>Thoughtfully designed journeys across India.</p>
    <div><a href="#privacy">Privacy</a><a href="#terms">Terms</a><a href="mailto:hello@wayfarer.ai">Contact</a></div>
  </footer>
}

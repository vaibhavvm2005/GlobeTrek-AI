import { BarChart3, CalendarDays, ChevronRight, Download, IndianRupee, LayoutDashboard, Search, Settings, Ticket, Users } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { experiences } from '../data'

export function LoginPage() {
  const navigate=useNavigate(); const [mode,setMode]=useState<'login'|'signup'>('login')
  return <main className="auth-page"><div className="auth-art"><div><span className="kicker">WELCOME TO WAYFARER</span><h1>Great days begin with a great plan.</h1><p>Save trips, manage bookings and keep every ticket close at hand.</p></div></div><section className="auth-card"><div className="auth-tabs"><button className={mode==='login'?'active':''} onClick={()=>setMode('login')}>Log in</button><button className={mode==='signup'?'active':''} onClick={()=>setMode('signup')}>Create account</button></div><h2>{mode==='login'?'Welcome back':'Create your account'}</h2>{mode==='signup'&&<label>Full name<input placeholder="Aarav Sharma"/></label>}<label>Email address<input type="email" placeholder="you@example.com"/></label><label>Password<input type="password" placeholder="At least 8 characters"/></label><button className="primary full" onClick={()=>navigate('/bookings')}>{mode==='login'?'Log in':'Create account'} <ChevronRight/></button><p className="demo-login">Demo frontend only · no credentials are transmitted</p></section></main>
}

export function BookingsPage() {
  const navigate=useNavigate(); const [tab,setTab]=useState('Upcoming')
  const item=experiences[0]
  return <main className="dashboard-page"><header className="dashboard-header"><div><span className="kicker">YOUR JOURNEYS</span><h1>My bookings</h1></div><button className="primary" onClick={()=>navigate('/explore')}>Book an experience</button></header><div className="booking-tabs">{['Upcoming','Completed','Cancelled'].map(x=><button key={x} className={tab===x?'active':''} onClick={()=>setTab(x)}>{x}</button>)}</div>
    {tab==='Upcoming'?<article className="booking-list-card"><img src={item.image} alt={item.title}/><div><span className="status confirmed">Confirmed · demo</span><h2>{item.title}</h2><p><CalendarDays/> Sunday, 8 November · 10:00 AM</p><small>Server booking reference required</small></div><div className="booking-actions"><button className="secondary"><Download/>Ticket</button><button className="text-danger">Cancel booking</button></div></article>:<div className="empty-state"><Ticket/><h2>No {tab.toLowerCase()} bookings</h2><p>Your {tab.toLowerCase()} tickets will appear here.</p><button className="secondary" onClick={()=>navigate('/explore')}>Explore experiences</button></div>}
  </main>
}

export function AdminPage() {
  const [section,setSection]=useState('Overview')
  const stats=[['Total bookings','12,840',Ticket],['Confirmed','11,428',CalendarDays],['Revenue','₹18.6L',IndianRupee],['Active visitors','8,192',Users]]
  const adminNav=[['Overview',LayoutDashboard],['Experiences',Search],['Bookings',CalendarDays],['Customers',Users],['Analytics',BarChart3],['Settings',Settings]] as const
  return <main className="admin-page"><aside className="admin-sidebar"><strong><Ticket/> WAYFARER Admin</strong>{adminNav.map(([name,Icon])=><button key={name} className={section===name?'active':''} onClick={()=>setSection(name)}><Icon/> <span>{name}</span></button>)}</aside><section className="admin-content"><header><div><span>ADMIN DASHBOARD · DEMONSTRATION</span><h1>{section}</h1></div><button className="primary">+ Add experience</button></header><div className="admin-stats">{stats.map(([name,value,Icon])=>{const C=Icon as typeof Ticket;return <div key={name as string}><span><C/></span><p>{name as string}</p><strong>{value as string}</strong><small>Demo data</small></div>})}</div><div className="admin-grid"><article><div className="widget-title"><h3>Booking trend</h3><span>Demonstration only</span></div><div className="chart-bars">{[42,68,55,82,65,92,76].map((v,i)=><div key={i}><i style={{height:`${v}%`}}/><small>{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i]}</small></div>)}</div></article><article><div className="widget-title"><h3>Popular experiences</h3><small>Demo catalog</small></div>{experiences.slice(0,5).map((x,i)=><div className="popular-row" key={x.id}><img src={x.image} alt=""/><div><strong>{x.title}</strong><small>First-party demo inventory</small></div><b>{i===0?'#1':`#${i+1}`}</b></div>)}</article></div></section></main>
}

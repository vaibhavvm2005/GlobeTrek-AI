import { useMemo, useState } from 'react'
import { ArrowRight, CalendarDays, ChevronDown, Clock3, MapPin, Search, ShieldCheck, Star } from 'lucide-react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { experiences } from '../data'
import { ExperienceCard } from '../components/ExperienceCard'

export function ExplorePage() {
  const [params] = useSearchParams()
  const [query,setQuery]=useState(params.get('q')||'')
  const [city,setCity]=useState(params.get('city')||'All locations')
  const [category,setCategory]=useState(params.get('category')||'All')
  const filtered=useMemo(()=>experiences.filter(x=>(!query||`${x.title} ${x.category}`.toLowerCase().includes(query.toLowerCase()))&&(city==='All locations'||x.city===city)&&(category==='All'||x.category===category)),[query,city,category])
  return <main className="explore-page"><header className="page-title"><span className="kicker">DISCOVER INDIA</span><h1>Find something extraordinary</h1><p>Thoughtfully selected places and experiences for every kind of traveller.</p></header>
    <div className="filter-bar"><label><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search experiences"/></label><select value={city} onChange={e=>setCity(e.target.value)}><option>All locations</option>{[...new Set(experiences.map(x=>x.city))].map(x=><option key={x}>{x}</option>)}</select><select value={category} onChange={e=>setCategory(e.target.value)}><option>All</option>{[...new Set(experiences.map(x=>x.category))].map(x=><option key={x}>{x}</option>)}</select><button>Filters <ChevronDown size={16}/></button></div>
    <div className="results-meta"><strong>{filtered.length} experiences</strong><button>Recommended <ChevronDown size={15}/></button></div>
    <div className="explore-grid">{filtered.map(item=><ExperienceCard key={item.id} item={item}/>)}</div>
  </main>
}

export function ExperiencePage() {
  const {id}=useParams(); const navigate=useNavigate()
  const item=experiences.find(x=>x.id===Number(id))||experiences[0]
  return <main className="detail-page"><div className="detail-hero"><img src={item.image} alt={item.title}/><div><span>{item.category}</span><h1>{item.title}</h1><p><MapPin size={17}/>{item.city}<b><Star size={16} fill="currentColor"/>{item.rating}</b></p></div></div>
    <div className="detail-layout"><section><div className="detail-section"><span className="kicker">ABOUT THIS EXPERIENCE</span><h2>A memorable day begins here</h2><p>{item.description}</p></div><div className="detail-section"><h2>Good to know</h2><div className="info-row"><div><Clock3/><strong>Opening hours</strong><small>9:00 AM – 6:00 PM</small></div><div><CalendarDays/><strong>Best time</strong><small>Tuesday morning</small></div><div><ShieldCheck/><strong>Easy cancellation</strong><small>Up to 24 hours before</small></div></div></div></section>
      <aside className="booking-card"><span>Tickets from</span><strong>₹{item.price}<small> / person</small></strong><label>Date<select><option>Sunday, 8 November</option><option>Saturday, 14 November</option></select></label><label>Time<select><option>10:00 AM – General entry</option><option>2:00 PM – General entry</option></select></label><button className="primary full" onClick={()=>navigate(`/booking/${item.id}`)}>Check availability <ArrowRight/></button><p><ShieldCheck size={14}/> Secure demo reservation</p></aside>
    </div>
  </main>
}

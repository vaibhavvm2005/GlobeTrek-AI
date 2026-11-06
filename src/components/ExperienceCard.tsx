import { CalendarDays, Heart, MapPin, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Experience } from '../data'

export function ExperienceCard({ item, favorite, onFavorite }: { item: Experience; favorite?: boolean; onFavorite?: () => void }) {
  return <article className="experience-card">
    <div className="card-image">
      <Link to={`/experience/${item.id}`}><img src={item.image} alt={item.title}/></Link>
      <span className="category-pill">{item.category}</span>
      {onFavorite && <button className={`heart-button ${favorite ? 'selected' : ''}`} onClick={onFavorite} aria-label="Save experience"><Heart size={18} fill={favorite ? 'currentColor' : 'none'}/></button>}
    </div>
    <div className="card-content">
      <div className="rating"><Star size={14} fill="currentColor"/> {item.rating}</div>
      <h3><Link to={`/experience/${item.id}`}>{item.title}</Link></h3>
      <p className="location"><MapPin size={15}/>{item.city}</p>
      <div className="card-bottom">
        <span><CalendarDays size={15}/>{item.date}</span>
        <strong>₹{item.price}<small> onwards</small></strong>
      </div>
    </div>
  </article>
}

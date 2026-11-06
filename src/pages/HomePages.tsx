import { useState } from 'react'
import { ArrowRight, Building2, CalendarDays, Globe2, Landmark, MapPin, MessageCircle, Music2, Search, Sparkles, Ticket, Trees } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { experiences } from '../data'
import { ExperienceCard } from '../components/ExperienceCard'

export function HomePage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [city, setCity] = useState('Bengaluru')
  const [favorites, setFavorites] = useState<number[]>([])
  const goExplore = () => navigate(`/explore?q=${encodeURIComponent(search)}&city=${encodeURIComponent(city)}`)
  const categories = [
    { name: 'Museums', caption: 'Stories worth seeing', icon: Landmark, tone: 'sage' },
    { name: 'Events', caption: 'Live & local', icon: CalendarDays, tone: 'peach' },
    { name: 'Concerts', caption: 'Feel every beat', icon: Music2, tone: 'lavender' },
    { name: 'Adventure', caption: 'Go beyond', icon: Trees, tone: 'mint' },
  ]
  return <main>
    <section className="hero">
      <div className="hero-inner">
        <div className="eyebrow"><Sparkles size={15}/> Discover experiences. Ask naturally. Book confidently.</div>
        <h1>Some experiences<br/><em>are worth finding.</em></h1>
        <p>Explore extraordinary places, discover local events and plan your next experience with an intelligent travel assistant.</p>
        <div className="search-panel">
          <label><Search size={19}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Museums, concerts, experiences..."/></label>
          <span className="search-separator"/>
          <label><MapPin size={19}/><input value={city} onChange={e => setCity(e.target.value)} aria-label="City"/></label>
          <button onClick={goExplore}><Search size={18}/>Explore</button>
        </div>
        <div className="suggestions"><span>Popular:</span>{['Museums under ₹200','Weekend adventures','Live concerts'].map(x => <button key={x} onClick={() => navigate('/assistant', {state:{prompt:x}})}>{x}</button>)}</div>
      </div>
    </section>
    <section className="page-section">
      <SectionHeading kicker="EXPLORE YOUR WAY" title="Find your kind of experience" action="View all categories" to="/explore"/>
      <div className="category-grid">{categories.map(({name,caption,icon:Icon,tone}) => <button className={`category-card ${tone}`} key={name} onClick={() => navigate(`/explore?category=${name}`)}>
        <span className="category-icon"><Icon/></span><strong>{name}</strong><small>{caption}</small><ArrowRight size={18}/>
      </button>)}</div>
    </section>
    <section className="page-section trending-section">
      <SectionHeading kicker="CURATED FOR YOU" title="Trending experiences" action="See everything" to="/explore"/>
      <div className="experience-grid">{experiences.slice(0,6).map(item => <ExperienceCard key={item.id} item={item} favorite={favorites.includes(item.id)} onFavorite={() => setFavorites(old => old.includes(item.id) ? old.filter(id => id !== item.id) : [...old,item.id])}/>)}</div>
    </section>
    <section className="ai-banner">
      <div className="ai-visual"><div className="chat-card first">Find a museum under ₹200<br/><span>Looking at available places...</span></div><div className="chat-card second"><Sparkles size={16}/> 4 thoughtful matches found</div><div className="ai-orb"><MessageCircle/></div></div>
      <div className="ai-content"><span className="kicker">MEET YOUR AI TRAVEL COMPANION</span><h2>More than search.<br/><em>A conversation.</em></h2><p>Tell WAYFARER your plans in your own words. Discover, compare and book in English, Hindi or Kannada.</p><button className="primary" onClick={() => navigate('/assistant')}>Ask WAYFARER <ArrowRight size={18}/></button></div>
    </section>
    <section className="page-section trust-section">
      <SectionHeading kicker="A BETTER WAY TO GO" title="Everything for an easy day out"/>
      <div className="feature-grid">{[
        [Ticket,'Instant confirmation','Clear tickets and secure QR codes, ready when you are.'],
        [Building2,'Curated discoveries','Handpicked places and experiences, organised by your interests.'],
        [Globe2,'For every traveller','Simple guidance in English, Hindi and Kannada.'],
      ].map(([Icon,title,copy]) => {const C=Icon as typeof Ticket;return <div className="feature" key={title as string}><span><C/></span><h3>{title as string}</h3><p>{copy as string}</p></div>})}</div>
    </section>
  </main>
}

export function SectionHeading({kicker,title,action,to}: {kicker:string;title:string;action?:string;to?:string}) {
  const navigate=useNavigate()
  return <div className="section-heading"><div><span>{kicker}</span><h2>{title}</h2></div>{action&&<button onClick={()=>navigate(to||'/explore')}>{action}<ArrowRight size={16}/></button>}</div>
}

export function AssistantPage() {
  const [messages,setMessages]=useState([{role:'ai',text:'Namaste! I’m WAYFARER. Tell me the city, experience and date you have in mind.'},{role:'ai',text:'How about exploring these popular experiences?'}])
  const [input,setInput]=useState('')
  const [sessionId,setSessionId]=useState<string>()
  const [language,setLanguage]=useState<'en'|'hi'|'kn'>('en')
  const [thinking,setThinking]=useState(false)
  const [toolsUsed,setToolsUsed]=useState<string[]>([])
  const send=async()=>{if(!input.trim()||thinking)return;const text=input.trim();setInput('');setMessages(m=>[...m,{role:'user',text}]);setThinking(true)
    try{const response=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text,session_id:sessionId,language})})
      if(!response.ok)throw new Error('The booking agent is unavailable.')
      const data=await response.json();setSessionId(data.session_id);setToolsUsed(data.tools_used?.map((tool:{name:string})=>tool.name)||[]);setMessages(m=>[...m,{role:'ai',text:data.reply}])
    }catch(error){setMessages(m=>[...m,{role:'ai',text:error instanceof Error?error.message:'WAYFARER could not complete the request. Please try again.'}])}finally{setThinking(false)}
  }
  return <main className="assistant-page"><section className="assistant-heading"><span className="kicker">WAYFARER AI</span><h1>Where should we go next?</h1><p>Your personal travel concierge, available right here.</p></section>
    <div className="assistant-layout"><aside><h3>Quick starts</h3>{['Find museums near me','Concerts this weekend','Plan an adventure','Show my bookings'].map(x=><button key={x} onClick={()=>setInput(x)}><Sparkles size={16}/>{x}</button>)}</aside>
      <section className="chat-panel"><div className="chat-top"><span className="miko"><Sparkles/></span><div><strong>WAYFARER</strong><small><i/> {thinking?'Thinking...':'Online · AI travel concierge'}</small></div><select value={language} onChange={e=>setLanguage(e.target.value as 'en'|'hi'|'kn')} aria-label="Assistant language"><option value="en">English</option><option value="hi">Hindi</option><option value="kn">Kannada</option></select></div>
        <div className="chat-body">{messages.map((m,i)=> <div key={i} className={`chat-message ${m.role}`}>{m.text}</div>)}
          {messages.length>2&&<div className="chat-results">{experiences.slice(0,2).map(item=><ExperienceCard key={item.id} item={item}/>)}</div>}
          {toolsUsed.length>0&&<div className="tool-status">Verified with: {toolsUsed.join(', ')}</div>}
        </div><div className="chat-input"><input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder={language==='hi'?'WAYFARER से पूछें...':language==='kn'?'WAYFARER ಅನ್ನು ಕೇಳಿ...':'Ask WAYFARER anything...'}/><button disabled={thinking} onClick={send}><ArrowRight/></button></div>
      </section>
    </div>
  </main>
}

import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import {
  Sparkles,
  Send,
  Compass,
  ArrowRight,
  Languages,
  CheckCircle2,
  Calendar,
  Ticket,
  MapPin,
  Clock,
  ShieldCheck,
  Bot,
  User,
  RotateCcw
} from 'lucide-react'
import { apiRequest } from '../../../shared/api'
import { useLanguage, type Language } from '../../../shared/LanguageContext'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolsExecuted?: Array<{ tool: string; args?: any; count?: number }>
  interactiveCard?: any
  timestamp: string
}

export function ConciergePage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { language, setLanguage, t } = useLanguage()
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      content:
        language === 'hi'
          ? 'नमस्ते! मैं WAYFARER AI यात्रा सहायक हूँ। आप किस शहर, तारीख या बजट में अनुभव खोजना चाहते हैं?'
          : language === 'kn'
          ? 'ನಮಸ್ಕಾರ! ನಾನು WAYFARER AI ಸಹಾಯಕ. ಯಾವ ನಗರ, ದಿನಾಂಕ ಅಥವಾ ಬಜೆಟ್‌ನಲ್ಲಿ ಅನುಭವ ಹುಡುಕುತ್ತಿದ್ದೀರಿ?'
          : 'Namaste! I am your WAYFARER AI Travel Concierge. Tell me where you wish to go, your dates, budget, or group size. I retrieve real-time inventory directly from our database.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [sessionId, setSessionId] = useState<string>('')
  const chatBottomRef = useRef<HTMLDivElement>(null)

  // Handle incoming initial prompt from HomePage
  useEffect(() => {
    const prompt = (location.state as any)?.initialPrompt
    if (prompt && !thinking) {
      handleSend(prompt)
    }
  }, [location.state])

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  const handleSend = async (messageText?: string) => {
    const text = (messageText || input).trim()
    if (!text || thinking) return
    setInput('')

    const userMsg: Message = {
      id: 'user-' + Date.now(),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
    setMessages(prev => [...prev, userMsg])
    setThinking(true)

    try {
      const res = await apiRequest<{
        session_id: string
        reply: string
        tools_executed: any[]
        interactive_card: any
      }>('/chat', {
        method: 'POST',
        body: {
          message: text,
          session_id: sessionId || undefined,
          language: language,
        },
      })

      setSessionId(res.session_id)
      const assistantMsg: Message = {
        id: 'ai-' + Date.now(),
        role: 'assistant',
        content: res.reply,
        toolsExecuted: res.tools_executed,
        interactiveCard: res.interactive_card,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages(prev => [...prev, assistantMsg])
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: 'err-' + Date.now(),
          role: 'assistant',
          content: 'I apologize, but our reservation system is momentarily synchronizing. Please try your request again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    } finally {
      setThinking(false)
    }
  }

  const quickPrompts = [
    'I want to visit a museum in Bengaluru under ₹200',
    'Show me tickets for a concert in Bengaluru',
    'Plan a 2-day heritage itinerary for Hampi',
    'Show my upcoming bookings',
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-200 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#0B192C] text-white flex items-center justify-center">
              <Sparkles size={16} className="text-[#E06D3B]" />
            </div>
            <h1 className="font-serif text-2xl font-bold text-[#0B192C]">
              WAYFARER AI Travel Concierge
            </h1>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Authoritative conversational booking assistant · Multilingual tool calling engine
          </p>
        </div>

        {/* Language switcher inside Concierge */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-stone-500">Language:</span>
          {(['en', 'hi', 'kn'] as Language[]).map(l => (
            <button
              key={l}
              onClick={() => setLanguage(l)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                language === l
                  ? 'bg-[#0B192C] text-white border-[#0B192C]'
                  : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
              }`}
            >
              {l === 'en' ? 'English' : l === 'hi' ? 'हिंदी' : 'ಕನ್ನಡ'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar: Quick Starters */}
        <aside className="lg:col-span-1 space-y-4 hidden lg:block">
          <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-xs space-y-3">
            <h3 className="font-serif font-bold text-xs uppercase tracking-wider text-stone-400">
              Suggested Requests
            </h3>
            <div className="space-y-2">
              {quickPrompts.map(p => (
                <button
                  key={p}
                  onClick={() => handleSend(p)}
                  disabled={thinking}
                  className="w-full text-left p-2.5 rounded-xl text-xs font-medium text-stone-700 hover:text-[#0B192C] hover:bg-stone-50 border border-stone-100 hover:border-stone-300 transition-all flex items-start gap-2"
                >
                  <Sparkles size={13} className="text-[#E06D3B] shrink-0 mt-0.5" />
                  <span>{p}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-stone-100/70 border border-stone-200/80 text-[11px] text-stone-600 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-stone-800">
              <ShieldCheck size={14} className="text-emerald-600" />
              <span>Strict Anti-Hallucination</span>
            </div>
            <p>
              The AI concierge only quotes ticket prices and seat availability queried directly from the live database.
            </p>
          </div>
        </aside>

        {/* Right Chat Panel */}
        <div className="lg:col-span-3 flex flex-col h-[650px] rounded-3xl bg-white border border-stone-200/90 shadow-xl overflow-hidden">
          {/* Chat Messages scroll area */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-5 bg-[#FAF8F5]/30">
            {messages.map(m => (
              <div
                key={m.id}
                className={`flex gap-3 max-w-3xl ${m.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                    m.role === 'user'
                      ? 'bg-[#E06D3B] text-white shadow-xs'
                      : 'bg-[#0B192C] text-white shadow-xs'
                  }`}
                >
                  {m.role === 'user' ? <User size={15} /> : <Bot size={15} />}
                </div>

                {/* Message Bubble & Cards */}
                <div className={`space-y-3 ${m.role === 'user' ? 'items-end' : ''}`}>
                  <div
                    className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-[#0B192C] text-white rounded-tr-xs shadow-md'
                        : 'bg-white text-stone-800 border border-stone-200/80 rounded-tl-xs shadow-xs'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.content}</p>
                    <span
                      className={`block text-[10px] mt-1.5 font-sans ${
                        m.role === 'user' ? 'text-stone-300 text-right' : 'text-stone-400'
                      }`}
                    >
                      {m.timestamp}
                    </span>
                  </div>

                  {/* Tool execution badge */}
                  {m.toolsExecuted && m.toolsExecuted.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {m.toolsExecuted.map((t, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-mono"
                        >
                          <CheckCircle2 size={10} className="text-emerald-600" />
                          <span>DB tool: {t.tool}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Interactive Card: Experience Recommendation */}
                  {m.interactiveCard?.type === 'experience_recommendation' && (
                    <div className="p-4 rounded-2xl bg-white border border-stone-300/80 shadow-md max-w-md space-y-3 animate-in fade-in">
                      <div className="flex gap-3">
                        <img
                          src={m.interactiveCard.experience.image}
                          alt={m.interactiveCard.experience.title}
                          className="w-20 h-20 rounded-xl object-cover shrink-0"
                        />
                        <div>
                          <span className="text-[10px] font-bold text-[#D95D39] uppercase">
                            {m.interactiveCard.experience.city}
                          </span>
                          <h4 className="font-serif font-bold text-sm text-[#0B192C]">
                            {m.interactiveCard.experience.title}
                          </h4>
                          <span className="text-xs font-semibold text-stone-800">
                            ₹{m.interactiveCard.experience.price} / ticket
                          </span>
                        </div>
                      </div>

                      {m.interactiveCard.quote && (
                        <div className="p-2.5 rounded-xl bg-stone-50 text-xs text-stone-600 flex justify-between font-mono">
                          <span>2 Tickets + Tax & Fee:</span>
                          <strong className="text-stone-900">₹{m.interactiveCard.quote.total_amount}</strong>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/checkout?eventId=${m.interactiveCard.experience.id}&qty=2`)}
                          className="flex-1 py-2 px-3 rounded-xl bg-[#0B192C] text-white text-xs font-semibold hover:bg-[#D95D39] transition-colors flex items-center justify-center gap-1.5"
                        >
                          <span>Reserve 2 Tickets</span>
                          <ArrowRight size={13} />
                        </button>
                        <Link
                          to={`/experiences/${m.interactiveCard.experience.id}`}
                          className="py-2 px-3 rounded-xl border border-stone-200 text-stone-700 text-xs font-semibold hover:bg-stone-50"
                        >
                          Details
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* Interactive Card: Booking Summary */}
                  {m.interactiveCard?.type === 'booking_summary' && (
                    <div className="p-4 rounded-2xl bg-white border border-stone-300 shadow-md max-w-sm space-y-3">
                      <div className="flex items-center justify-between text-xs border-b border-stone-100 pb-2">
                        <span className="font-mono font-bold text-[#0B192C]">
                          #{m.interactiveCard.data.id}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                          {m.interactiveCard.data.status}
                        </span>
                      </div>
                      <h4 className="font-serif font-bold text-sm text-[#0B192C]">
                        {m.interactiveCard.data.event_title}
                      </h4>
                      <div className="text-xs text-stone-600 flex justify-between font-medium">
                        <span>Paid Total:</span>
                        <strong className="text-stone-900">₹{m.interactiveCard.data.total_amount}</strong>
                      </div>
                      <Link
                        to="/my-tickets"
                        className="w-full py-2 px-3 rounded-xl bg-[#0B192C] text-white text-xs font-semibold text-center block hover:bg-[#D95D39]"
                      >
                        Open Digital Gate Pass →
                      </Link>
                    </div>
                  )}

                  {/* Interactive Card: Smart Itinerary */}
                  {m.interactiveCard?.type === 'itinerary_suggestion' && (
                    <div className="p-4 rounded-2xl bg-white border border-stone-300 shadow-md max-w-lg space-y-3">
                      <div className="flex items-center justify-between text-xs border-b border-stone-100 pb-2">
                        <span className="font-serif font-bold text-stone-900">
                          {m.interactiveCard.data.destination} Curated Itinerary
                        </span>
                        <span className="text-[#D95D39] font-bold">
                          Est: ₹{m.interactiveCard.data.estimated_tickets_cost}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {m.interactiveCard.data.days.map((d: any, idx: number) => (
                          <div key={idx} className="p-2.5 rounded-xl bg-stone-50 border border-stone-100 text-xs space-y-1">
                            <span className="font-bold text-[#0B192C] block">{d.theme}</span>
                            <div className="text-stone-600 flex justify-between">
                              <span>Morning: {d.morning.activity}</span>
                              <span className="font-mono">₹{d.morning.price}</span>
                            </div>
                            <div className="text-stone-600 flex justify-between">
                              <span>Evening: {d.evening.activity}</span>
                              <span className="font-mono">₹{d.evening.price}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <Link
                        to="/trip-planner"
                        className="w-full py-2 px-3 rounded-xl border border-stone-200 text-stone-800 text-xs font-semibold text-center block hover:bg-stone-50"
                      >
                        Customize in Smart Trip Planner →
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Thinking indicator */}
            {thinking && (
              <div className="flex gap-3 items-center text-xs text-stone-500 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-[#0B192C] text-white flex items-center justify-center">
                  <Compass size={15} className="animate-spin text-[#E06D3B]" />
                </div>
                <div className="p-3 rounded-2xl bg-white border border-stone-200 text-stone-600 shadow-xs">
                  Querying verified real-time database & calculating quote...
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Chat Input Bar */}
          <div className="p-3 sm:p-4 bg-white border-t border-stone-200">
            <form
              onSubmit={e => {
                e.preventDefault()
                handleSend()
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={
                  language === 'hi'
                    ? 'अपनी योजना लिखें (उदा. बेंगलुरु में 200 रुपये से कम में संग्रहालय)...'
                    : language === 'kn'
                    ? 'ನಿಮ್ಮ ವಿನಂತಿಯನ್ನು ಬರೆಯಿರಿ (ಉದಾ. ಬೆಂಗಳೂರಿನಲ್ಲಿ ವಸ್ತುಸಂಗ್ರಹಾಲಯ)...'
                    : 'Ask about places, check availability, request quotes, or retrieve bookings...'
                }
                disabled={thinking}
                className="flex-1 px-4 py-3 text-xs sm:text-sm rounded-xl border border-stone-200 focus:outline-none focus:ring-1 focus:ring-[#0B192C] bg-stone-50 focus:bg-white"
              />
              <button
                type="submit"
                disabled={!input.trim() || thinking}
                className="p-3 rounded-xl bg-[#0B192C] text-white hover:bg-[#D95D39] disabled:opacity-40 transition-colors shadow-sm shrink-0"
                aria-label="Send message"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}


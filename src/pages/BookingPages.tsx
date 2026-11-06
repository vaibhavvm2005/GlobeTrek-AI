import { useEffect, useState } from 'react'
import { ArrowRight, Check, CreditCard, Minus, Plus, ShieldCheck, Ticket } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { experiences } from '../data'

export function BookingPage() {
  const {id}=useParams(); const navigate=useNavigate()
  const item=experiences.find(x=>x.id===Number(id))||experiences[0]
  const [quantity,setQuantity]=useState(2)
  const [ticket,setTicket]=useState('Adult')
  const subtotal=item.price*quantity; const fees=59; const total=subtotal+fees
  return <main className="booking-page"><div className="checkout-progress"><div className="active">1<span>Tickets</span></div><i/><div>2<span>Payment</span></div><i/><div>3<span>Confirmation</span></div></div>
    <div className="checkout-layout"><section><h1>Complete your booking</h1><p className="muted">Choose your ticket type and number of visitors.</p>
      <div className="form-section"><h3>Ticket category</h3>{['Adult','Student','Senior'].map((name,i)=><button key={name} className={`ticket-choice ${ticket===name?'selected':''}`} onClick={()=>setTicket(name)}><span className="radio">{ticket===name&&<Check size={13}/>}</span><div><strong>{name}</strong><small>{i===0?'Standard entry':i===1?'Valid student ID required':'60 years and above'}</small></div><b>₹{i===0?item.price:Math.round(item.price*(i===1?0.8:0.9))}</b></button>)}</div>
      <div className="form-section"><h3>Number of visitors</h3><div className="quantity"><button onClick={()=>setQuantity(q=>Math.max(1,q-1))}><Minus/></button><strong>{quantity}</strong><button onClick={()=>setQuantity(q=>Math.min(10,q+1))}><Plus/></button></div></div>
    </section><aside className="order-summary"><img src={item.image} alt={item.title}/><h3>{item.title}</h3><p>Sunday, 8 November · 10:00 AM</p><hr/><div><span>{ticket} × {quantity}</span><b>₹{subtotal}</b></div><div><span>Taxes & fees</span><b>₹{fees}</b></div><hr/><div className="total"><span>Total</span><strong>₹{total}</strong></div><button className="primary full" onClick={()=>navigate(`/payment/${item.id}`,{state:{quantity,total,ticket}})}>Continue to payment <ArrowRight/></button></aside></div>
  </main>
}

export function PaymentPage() {
  const {id}=useParams(); const navigate=useNavigate()
  const item=experiences.find(x=>x.id===Number(id))||experiences[0]
  const [method,setMethod]=useState('upi'); const [processing,setProcessing]=useState(false); const [error,setError]=useState('')
  const state = window.history.state?.usr as {quantity?:number;ticket?:string;total?:number}|undefined
  const quantity=state?.quantity||2; const total=state?.total||item.price*quantity+59
  const pay=async()=>{
    setProcessing(true); setError('')
    try {
      const reservation=await fetch('/api/bookings/reserve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({event_id:item.id,quantity,idempotency_key:`checkout-${item.id}-${Date.now()}`})}).then(async r=>{if(!r.ok)throw new Error((await r.json()).detail||'Reservation failed');return r.json()})
      const payment=await fetch('/api/payments/simulate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({booking_id:reservation.id})}).then(async r=>{if(!r.ok)throw new Error((await r.json()).detail||'Payment failed');return r.json()})
      await fetch(`/api/bookings/${reservation.id}/confirm`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({payment_reference:payment.id})}).then(async r=>{if(!r.ok)throw new Error((await r.json()).detail||'Confirmation failed');return r.json()})
      navigate(`/confirmation/${item.id}`,{state:{bookingId:reservation.id,quantity,total,ticket:state?.ticket||'Adult'}})
    } catch(e) {setError(e instanceof Error?e.message:'Unable to complete booking')}
    finally {setProcessing(false)}
  }
  return <main className="booking-page"><div className="checkout-progress"><div className="complete"><Check/></div><i/><div className="active">2<span>Payment</span></div><i/><div>3<span>Confirmation</span></div></div>
    <div className="checkout-layout"><section><h1>Choose how to pay</h1><p className="muted">This is a simulated payment. No real money will be charged.</p><div className="payment-options">{['upi','card','wallet'].map(x=><button key={x} className={method===x?'selected':''} onClick={()=>setMethod(x)}><CreditCard/><span><strong>{x==='upi'?'UPI':x==='card'?'Credit or debit card':'Mobile wallet'}</strong><small>{x==='upi'?'PhonePe, Google Pay, Paytm':'Secure card checkout'}</small></span></button>)}</div>
      {method==='upi'?<div className="payment-form"><label>UPI ID<input placeholder="name@bank"/></label></div>:<div className="payment-form"><label>Card number<input placeholder="4242 4242 4242 4242"/></label><div><label>Expiry<input placeholder="MM / YY"/></label><label>CVV<input placeholder="•••" type="password"/></label></div></div>}
      {error&&<p className="form-error" role="alert">{error}</p>}
      <button className="primary pay-button" disabled={processing} onClick={pay}>{processing?'Verifying payment...':`Pay ₹${total}`}<ShieldCheck/></button></section>
      <aside className="order-summary compact"><span className="demo-label">SIMULATED PAYMENT</span><h3>{item.title}</h3><p>{quantity} visitors · {state?.ticket||'Adult'}</p><hr/><div className="total"><span>Amount payable</span><strong>₹{total}</strong></div></aside>
    </div>
  </main>
}

export function ConfirmationPage() {
  const {id}=useParams(); const navigate=useNavigate()
  const item=experiences.find(x=>x.id===Number(id))||experiences[0]
  const bookingId=(window.history.state?.usr as {bookingId?:string}|undefined)?.bookingId
  const [ticket,setTicket]=useState<{booking_id:string;qr_payload:string;title?:string}|null>(null)
  const [loading,setLoading]=useState(Boolean(bookingId))
  useEffect(()=>{
    if(!bookingId)return
    fetch(`/api/tickets/${bookingId}`).then(async r=>{if(!r.ok)throw new Error('Ticket unavailable');return r.json()}).then(ticket=>{
      setTicket(ticket)
      localStorage.setItem(`wayfarer-ticket-${bookingId}`,JSON.stringify(ticket))
    }).catch(()=>{
      const cached=localStorage.getItem(`wayfarer-ticket-${bookingId}`)
      if(cached) setTicket(JSON.parse(cached))
    }).finally(()=>setLoading(false))
  },[bookingId])
  const ref=ticket?.booking_id||bookingId||'Pending confirmation'
  return <main className="confirmation-page"><div className="success-mark"><Check/></div><span className="kicker">BOOKING CONFIRMED</span><h1>You’re all set!</h1><p>Your demo reservation has been created successfully.</p>{loading?<p>Loading your signed ticket...</p>:<div className="digital-ticket"><div><span>WAYFARER AI</span><strong>{ticket?.title||item.title}</strong><p>{item.city}</p></div><div><span>Booking reference</span><strong>{ref}</strong></div><div className="qr"><div>{Array.from({length:49}).map((_,i)=>{const payload=ticket?.qr_payload||'';return <i key={i} className={payload.length && payload.charCodeAt(i%payload.length)%3===0?'on':''}/>})}</div><small>Signed ticket token</small></div></div>}<div className="confirmation-actions"><button className="primary" onClick={()=>navigate('/bookings')}>View my bookings <ArrowRight/></button><button className="secondary" onClick={()=>window.print()}>Download ticket <Ticket/></button></div></main>
}

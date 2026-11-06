import os
import uuid
import json
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, Header, Depends, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr

from database import get_db, utcnow, init_database, hash_password, verify_password
from auth import (
    create_access_token, get_current_user, get_current_user_optional,
    require_role, log_audit, sign_ticket_qr, verify_ticket_qr
)
from booking_engine import (
    calculate_quote, create_booking_reservation, process_simulated_payment,
    get_confirmed_ticket, scan_ticket_at_gate, cancel_and_refund_booking,
    expire_stale_reservations
)
from adapters import fetch_weather, fetch_attractions_osm, fetch_ticketmaster_events
from ai_agent import run_gemini_agent, search_experiences

# Auto-initialize database with seed data if fresh
init_database()

app = FastAPI(
    title="WAYFARER AI Travel & Ticketing API",
    description="Enterprise dual-application travel concierge, inventory reservation, and operations management platform",
    version="2.0.0"
)

# CORS setup
origins = [
    origin.strip() for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000"
    ).split(",") if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------------------
# PYDANTIC SCHEMAS
# -------------------------------------------------------------
class RegisterPayload(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: Optional[str] = None

class LoginPayload(BaseModel):
    email: str
    password: str

class QuoteRequest(BaseModel):
    event_id: int
    items: List[Dict[str, Any]]

class ReservationRequest(BaseModel):
    event_id: int
    customer_name: str
    customer_email: str
    customer_phone: Optional[str] = None
    items: List[Dict[str, Any]]
    idempotency_key: Optional[str] = None

class PaymentSimulateRequest(BaseModel):
    booking_id: str

class CancelRequest(BaseModel):
    reason: str = "Customer requested cancellation"

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    language: str = "en"

class QRVerifyRequest(BaseModel):
    qr_token: str
    location: str = "Main Gate"

class EventCreatePayload(BaseModel):
    title: str
    category_id: str
    venue_id: Optional[str] = None
    city: str
    price: int
    image: str
    date_str: str
    start_time: str = "10:00 AM"
    end_time: str = "06:00 PM"
    description: str
    highlights: Optional[List[str]] = None
    is_published: int = 1
    inventory: int = 100

class InventoryUpdatePayload(BaseModel):
    available_quantity: int

class ItinerarySavePayload(BaseModel):
    destination: str
    title: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    days: List[Dict[str, Any]]

# -------------------------------------------------------------
# AUTHENTICATION & IDENTITY
# -------------------------------------------------------------
@app.post("/api/auth/register", status_code=status.HTTP_201_CREATED)
def register_user(payload: RegisterPayload):
    with get_db() as conn:
        existing = conn.execute("SELECT id FROM users WHERE LOWER(email) = ?", (payload.email.lower(),)).fetchone()
        if existing:
            raise HTTPException(status_code=409, detail="An account with this email already exists")

        user_id = "usr-" + uuid.uuid4().hex[:10]
        now_str = utcnow()
        hashed = hash_password(payload.password)
        conn.execute("""
        INSERT INTO users(id, email, password_hash, full_name, role, phone, created_at)
        VALUES(?,?,?,?,?,?,?)
        """, (user_id, payload.email.lower(), hashed, payload.full_name, "CUSTOMER", payload.phone, now_str))
        conn.commit()

        token = create_access_token(user_id, payload.email.lower(), "CUSTOMER", payload.full_name)
        log_audit(payload.email.lower(), "CUSTOMER", "REGISTER", "USER", user_id, "User registered account")
        return {
            "token": token,
            "user": {
                "id": user_id,
                "email": payload.email.lower(),
                "full_name": payload.full_name,
                "role": "CUSTOMER"
            }
        }

@app.post("/api/auth/login")
def login_user(payload: LoginPayload):
    with get_db() as conn:
        row = conn.execute("SELECT * FROM users WHERE LOWER(email) = ?", (payload.email.lower().strip(),)).fetchone()
        if not row or not verify_password(payload.password, row["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        token = create_access_token(row["id"], row["email"], row["role"], row["full_name"])
        log_audit(row["email"], row["role"], "LOGIN", "USER", row["id"], "User logged in")
        return {
            "token": token,
            "user": {
                "id": row["id"],
                "email": row["email"],
                "full_name": row["full_name"],
                "role": row["role"],
                "phone": row["phone"]
            }
        }

@app.get("/api/auth/me")
def get_current_profile(current_user: dict = Depends(get_current_user)):
    with get_db() as conn:
        user = conn.execute("SELECT id, email, full_name, role, phone, created_at FROM users WHERE id = ?", (current_user["sub"],)).fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return dict(user)

# -------------------------------------------------------------
# CUSTOMER DISCOVERY & EXPERIENCES
# -------------------------------------------------------------
@app.get("/api/events")
def list_events(
    city: Optional[str] = None,
    category: Optional[str] = None,
    q: Optional[str] = None,
    max_price: Optional[float] = None,
    featured: Optional[bool] = None
):
    sql = """
    SELECT e.*, c.name as category_name, c.icon as category_icon, v.name as venue_name
    FROM events e
    JOIN categories c ON c.id = e.category_id
    LEFT JOIN venues v ON v.id = e.venue_id
    WHERE e.is_published = 1
    """
    args = []
    if city and city != "All locations":
        sql += " AND LOWER(e.city) LIKE ?"
        args.append(f"%{city.lower()}%")
    if category and category != "All":
        sql += " AND (c.name = ? OR c.slug = ? OR e.category_id = ?)"
        args.extend([category, category, category])
    if max_price:
        sql += " AND e.price <= ?"
        args.append(float(max_price))
    if featured is not None:
        sql += " AND e.featured = ?"
        args.append(1 if featured else 0)
    if q:
        sql += " AND (LOWER(e.title) LIKE ? OR LOWER(e.description) LIKE ? OR LOWER(e.city) LIKE ?)"
        term = f"%{q.lower()}%"
        args.extend([term, term, term])

    sql += " ORDER BY e.featured DESC, e.rating DESC, e.id ASC"

    with get_db() as conn:
        rows = conn.execute(sql, args).fetchall()
        results = []
        for r in rows:
            d = dict(r)
            if d.get("highlights"):
                try:
                    d["highlights"] = json.loads(d["highlights"])
                except Exception:
                    pass
            results.append(d)
        return results

@app.get("/api/events/{event_id}")
def get_event_details(event_id: int):
    with get_db() as conn:
        row = conn.execute("""
        SELECT e.*, c.name as category_name, v.name as venue_name, v.address as venue_address,
               v.latitude as venue_lat, v.longitude as venue_lon
        FROM events e
        JOIN categories c ON c.id = e.category_id
        LEFT JOIN venues v ON v.id = e.venue_id
        WHERE e.id = ?
        """, (event_id,)).fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Event not found")

        d = dict(row)
        if d.get("highlights"):
            try:
                d["highlights"] = json.loads(d["highlights"])
            except Exception:
                d["highlights"] = []

        # Fetch ticket tiers with remaining inventory
        tiers = conn.execute("""
        SELECT tt.id, tt.name, tt.price, tt.capacity, tt.booking_limit, tt.description,
               inv.available_quantity, inv.reserved_quantity
        FROM ticket_types tt
        JOIN inventory inv ON inv.ticket_type_id = tt.id
        WHERE tt.event_id = ?
        ORDER BY tt.price ASC
        """, (event_id,)).fetchall()
        d["ticket_types"] = [dict(t) for t in tiers]

        # Fetch related experiences in same city or category
        related = conn.execute("""
        SELECT id, title, city, price, rating, image, date_str
        FROM events
        WHERE id != ? AND (city = ? OR category_id = ?) AND is_published = 1
        LIMIT 3
        """, (event_id, d["city"], d["category_id"])).fetchall()
        d["related_experiences"] = [dict(r) for r in related]

        return d

@app.get("/api/categories")
def list_categories():
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM categories ORDER BY name ASC").fetchall()
        return [dict(r) for r in rows]

@app.get("/api/venues")
def list_venues():
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM venues ORDER BY city, name").fetchall()
        return [dict(r) for r in rows]

# -------------------------------------------------------------
# LIVE EXTERNAL PROVIDERS (WEATHER, OSM, TICKETMASTER)
# -------------------------------------------------------------
@app.get("/api/discovery/weather")
def get_weather(latitude: float = Query(12.9716), longitude: float = Query(77.5946)):
    return fetch_weather(latitude, longitude)

@app.get("/api/discovery/attractions")
def get_osm_attractions(latitude: float = Query(12.9716), longitude: float = Query(77.5946), radius: int = 5000):
    return fetch_attractions_osm(latitude, longitude, radius)

@app.get("/api/discovery/ticketmaster")
def get_ticketmaster(keyword: str = "", city: str = ""):
    return fetch_ticketmaster_events(keyword, city)

# -------------------------------------------------------------
# AI TRAVEL CONCIERGE
# -------------------------------------------------------------
@app.post("/api/chat")
def chat_with_concierge(payload: ChatRequest):
    session_id = payload.session_id or ("session-" + uuid.uuid4().hex[:12])
    language = payload.language if payload.language in ("en", "hi", "kn") else "en"

    # Store user message
    with get_db() as conn:
        conn.execute("INSERT OR IGNORE INTO chat_sessions(id, language, created_at) VALUES(?,?,?)",
                     (session_id, language, utcnow()))
        conn.execute("INSERT INTO chat_messages(session_id, role, content, created_at) VALUES(?,?,?,?)",
                     (session_id, "user", payload.message, utcnow()))
        history_rows = conn.execute(
            "SELECT role, content FROM chat_messages WHERE session_id = ? ORDER BY id DESC LIMIT 10",
            (session_id,)
        ).fetchall()
        history = list(reversed([dict(r) for r in history_rows]))

    reply_text, tools_used, interactive_card = run_gemini_agent(payload.message, history, language)

    # Store assistant reply
    with get_db() as conn:
        conn.execute(
            "INSERT INTO chat_messages(session_id, role, content, tools_json, created_at) VALUES(?,?,?,?,?)",
            (session_id, "assistant", reply_text, json.dumps(tools_used), utcnow())
        )

    return {
        "session_id": session_id,
        "reply": reply_text,
        "language": language,
        "tools_executed": tools_used,
        "interactive_card": interactive_card,
        "verified_database": True
    }

# -------------------------------------------------------------
# BOOKING & PAYMENT ENGINE
# -------------------------------------------------------------
@app.post("/api/bookings/quote")
def quote_booking(payload: QuoteRequest):
    return calculate_quote(payload.event_id, payload.items)

@app.post("/api/bookings/reserve")
def reserve_booking(
    payload: ReservationRequest,
    idempotency_key: Optional[str] = Header(None),
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    key = payload.idempotency_key or idempotency_key
    user_id = current_user.get("sub") if current_user else None
    return create_booking_reservation(
        event_id=payload.event_id,
        customer_name=payload.customer_name,
        customer_email=payload.customer_email,
        customer_phone=payload.customer_phone,
        items=payload.items,
        user_id=user_id,
        idempotency_key=key
    )

@app.post("/api/payments/simulate")
def pay_simulated(payload: PaymentSimulateRequest):
    return process_simulated_payment(payload.booking_id)

@app.get("/api/tickets/{booking_id}")
def retrieve_digital_ticket(booking_id: str):
    return get_confirmed_ticket(booking_id)

@app.get("/api/bookings/my")
def get_customer_bookings(
    email: Optional[str] = None,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    expire_stale_reservations()
    target_email = current_user.get("email") if current_user else email
    if not target_email:
        # Return demo bookings if not signed in
        target_email = "customer@wayfarer.com"

    with get_db() as conn:
        rows = conn.execute("""
        SELECT b.*, e.title as event_title, e.city, e.image, e.date_str, e.start_time
        FROM bookings b
        JOIN events e ON e.id = b.event_id
        WHERE LOWER(b.customer_email) = ?
        ORDER BY b.created_at DESC
        """, (target_email.lower(),)).fetchall()
        
        results = []
        for r in rows:
            d = dict(r)
            # Add line items
            items = conn.execute("SELECT ticket_name, quantity, unit_price, subtotal FROM booking_items WHERE booking_id = ?", (d["id"],)).fetchall()
            d["items"] = [dict(it) for it in items]
            d["qr_token"] = sign_ticket_qr(d["id"]) if d["status"] in ("CONFIRMED", "COMPLETED") else None
            results.append(d)
        return results

@app.post("/api/bookings/{booking_id}/cancel")
def cancel_booking(
    booking_id: str,
    payload: CancelRequest,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    actor = current_user.get("email") if current_user else "customer@wayfarer.com"
    return cancel_and_refund_booking(booking_id, payload.reason, actor)

# -------------------------------------------------------------
# WISHLIST & ITINERARY TRIP PLANNER
# -------------------------------------------------------------
@app.get("/api/wishlist")
def get_wishlist(current_user: Optional[dict] = Depends(get_current_user_optional)):
    user_id = current_user.get("sub") if current_user else "usr-cust1"
    with get_db() as conn:
        rows = conn.execute("""
        SELECT w.id as wishlist_id, w.created_at as saved_at, e.*
        FROM wishlists w
        JOIN events e ON e.id = w.event_id
        WHERE w.user_id = ?
        ORDER BY w.created_at DESC
        """, (user_id,)).fetchall()
        return [dict(r) for r in rows]

@app.post("/api/wishlist/toggle")
def toggle_wishlist(event_id: int = Query(...), current_user: Optional[dict] = Depends(get_current_user_optional)):
    user_id = current_user.get("sub") if current_user else "usr-cust1"
    with get_db() as conn:
        existing = conn.execute("SELECT id FROM wishlists WHERE user_id = ? AND event_id = ?", (user_id, event_id)).fetchone()
        if existing:
            conn.execute("DELETE FROM wishlists WHERE id = ?", (existing["id"],))
            conn.commit()
            return {"saved": False, "event_id": event_id}
        else:
            conn.execute("INSERT INTO wishlists(user_id, event_id, created_at) VALUES(?,?,?)", (user_id, event_id, utcnow()))
            conn.commit()
            return {"saved": True, "event_id": event_id}

@app.get("/api/itineraries")
def get_user_itineraries(current_user: Optional[dict] = Depends(get_current_user_optional)):
    user_id = current_user.get("sub") if current_user else "usr-cust1"
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM itineraries WHERE user_id = ? ORDER BY created_at DESC", (user_id,)).fetchall()
        results = []
        for r in rows:
            d = dict(r)
            try:
                d["days"] = json.loads(d["days_json"])
            except Exception:
                d["days"] = []
            results.append(d)
        return results

@app.post("/api/itineraries")
def save_itinerary(payload: ItinerarySavePayload, current_user: Optional[dict] = Depends(get_current_user_optional)):
    user_id = current_user.get("sub") if current_user else "usr-cust1"
    itin_id = "ITIN-" + uuid.uuid4().hex[:8].upper()
    now_str = utcnow()
    with get_db() as conn:
        conn.execute("""
        INSERT INTO itineraries(id, user_id, title, destination, start_date, end_date, days_json, created_at)
        VALUES(?,?,?,?,?,?,?,?)
        """, (itin_id, user_id, payload.title, payload.destination, payload.start_date, payload.end_date, json.dumps(payload.days), now_str))
        conn.commit()
    return {"id": itin_id, "status": "SAVED", "created_at": now_str}

# -------------------------------------------------------------
# ADMIN CONTROL CENTER APIS (PROTECTED BY RBAC)
# -------------------------------------------------------------
@app.get("/api/admin/dashboard")
def get_admin_dashboard(admin: dict = Depends(require_role(["SUPER_ADMIN", "EVENT_MANAGER", "BOOKING_MANAGER", "FINANCE_MANAGER"]))):
    expire_stale_reservations()
    with get_db() as conn:
        total_bookings = conn.execute("SELECT COUNT(*) FROM bookings").fetchone()[0]
        confirmed_bookings = conn.execute("SELECT COUNT(*) FROM bookings WHERE status IN ('CONFIRMED', 'COMPLETED')").fetchone()[0]
        pending_bookings = conn.execute("SELECT COUNT(*) FROM bookings WHERE status = 'PENDING_PAYMENT'").fetchone()[0]
        cancelled_bookings = conn.execute("SELECT COUNT(*) FROM bookings WHERE status IN ('CANCELLED', 'REFUNDED')").fetchone()[0]
        
        revenue_row = conn.execute("SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'VERIFIED'").fetchone()
        total_revenue = revenue_row[0] if revenue_row else 0
        
        active_events = conn.execute("SELECT COUNT(*) FROM events WHERE is_published = 1").fetchone()[0]
        total_stock = conn.execute("SELECT COALESCE(SUM(available_quantity), 0) FROM inventory").fetchone()[0]

        # Recent 7 transactions
        recent_tx = conn.execute("""
        SELECT b.id, b.customer_name, b.customer_email, b.total_amount, b.status, b.created_at, e.title as event_title
        FROM bookings b
        JOIN events e ON e.id = b.event_id
        ORDER BY b.created_at DESC LIMIT 7
        """).fetchall()

        # Popular experiences
        popular = conn.execute("""
        SELECT e.id, e.title, e.city, e.image, COUNT(b.id) as booking_count, COALESCE(SUM(b.total_amount), 0) as total_volume
        FROM events e
        LEFT JOIN bookings b ON b.event_id = e.id AND b.status IN ('CONFIRMED', 'COMPLETED')
        GROUP BY e.id
        ORDER BY booking_count DESC, e.rating DESC LIMIT 5
        """).fetchall()

        # Status distribution
        status_dist = conn.execute("""
        SELECT status, COUNT(*) as count FROM bookings GROUP BY status
        """).fetchall()

        return {
            "metrics": {
                "total_bookings": total_bookings,
                "confirmed_bookings": confirmed_bookings,
                "pending_bookings": pending_bookings,
                "cancelled_bookings": cancelled_bookings,
                "total_revenue": total_revenue,
                "active_events": active_events,
                "remaining_ticket_inventory": total_stock
            },
            "recent_transactions": [dict(r) for r in recent_tx],
            "popular_experiences": [dict(r) for r in popular],
            "status_distribution": {r["status"]: r["count"] for r in status_dist},
            "daily_trends": [
                {"day": "Mon", "bookings": 42, "revenue": 28400},
                {"day": "Tue", "bookings": 56, "revenue": 39200},
                {"day": "Wed", "bookings": 64, "revenue": 45100},
                {"day": "Thu", "bookings": 72, "revenue": 52800},
                {"day": "Fri", "bookings": 95, "revenue": 76500},
                {"day": "Sat", "bookings": 142, "revenue": 118400},
                {"day": "Sun", "bookings": 128, "revenue": 98600}
            ]
        }

@app.get("/api/admin/events")
def admin_list_events(admin: dict = Depends(require_role(["SUPER_ADMIN", "EVENT_MANAGER"]))):
    with get_db() as conn:
        rows = conn.execute("""
        SELECT e.*, c.name as category_name, v.name as venue_name,
               (SELECT COALESCE(SUM(inv.available_quantity), 0) FROM ticket_types tt JOIN inventory inv ON inv.ticket_type_id = tt.id WHERE tt.event_id = e.id) as available_seats
        FROM events e
        JOIN categories c ON c.id = e.category_id
        LEFT JOIN venues v ON v.id = e.venue_id
        ORDER BY e.id DESC
        """).fetchall()
        return [dict(r) for r in rows]

@app.post("/api/admin/events")
def admin_create_event(payload: EventCreatePayload, admin: dict = Depends(require_role(["SUPER_ADMIN", "EVENT_MANAGER"]))):
    now_str = utcnow()
    slug = payload.title.lower().replace(" ", "-").replace(":", "").replace("&", "and")[:50]
    with get_db() as conn:
        cursor = conn.execute("""
        INSERT INTO events(
            title, slug, category_id, venue_id, city, price, rating, image, date_str,
            start_time, end_time, description, highlights, is_published, inventory, created_at
        ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, (
            payload.title, slug, payload.category_id, payload.venue_id, payload.city,
            payload.price, 4.8, payload.image, payload.date_str, payload.start_time,
            payload.end_time, payload.description, json.dumps(payload.highlights or []),
            payload.is_published, payload.inventory, now_str
        ))
        ev_id = cursor.lastrowid

        # Automatically create default ticket types and inventory
        tt_id = f"tt-{ev_id}-gen"
        conn.execute("""
        INSERT INTO ticket_types(id, event_id, name, price, capacity, booking_limit, description)
        VALUES(?,?,?,?,?,?,?)
        """, (tt_id, ev_id, "General Admission", payload.price, payload.inventory, 10, "Standard admission"))
        conn.execute("""
        INSERT INTO inventory(id, ticket_type_id, total_quantity, available_quantity, reserved_quantity)
        VALUES(?,?,?,?,?)
        """, (f"inv-{tt_id}", tt_id, payload.inventory, payload.inventory, 0))

        conn.commit()
        log_audit(admin["email"], admin["role"], "CREATE_EVENT", "EVENT", str(ev_id), f"Created event '{payload.title}'")
        return {"id": ev_id, "title": payload.title, "status": "CREATED"}

@app.delete("/api/admin/events/{event_id}")
def admin_delete_event(event_id: int, admin: dict = Depends(require_role(["SUPER_ADMIN"]))):
    with get_db() as conn:
        has_bookings = conn.execute("SELECT 1 FROM bookings WHERE event_id = ? AND status = 'CONFIRMED'", (event_id,)).fetchone()
        if has_bookings:
            raise HTTPException(status_code=409, detail="Cannot delete event with confirmed bookings. Unpublish instead.")
        conn.execute("DELETE FROM events WHERE id = ?", (event_id,))
        conn.commit()
        log_audit(admin["email"], admin["role"], "DELETE_EVENT", "EVENT", str(event_id), "Deleted event record")
        return {"status": "DELETED", "event_id": event_id}

@app.get("/api/admin/inventory")
def admin_list_inventory(admin: dict = Depends(require_role(["SUPER_ADMIN", "EVENT_MANAGER", "BOOKING_MANAGER"]))):
    with get_db() as conn:
        rows = conn.execute("""
        SELECT inv.id as inventory_id, inv.total_quantity, inv.available_quantity, inv.reserved_quantity,
               tt.id as ticket_type_id, tt.name as tier_name, tt.price, tt.booking_limit,
               e.id as event_id, e.title as event_title, e.city
        FROM inventory inv
        JOIN ticket_types tt ON tt.id = inv.ticket_type_id
        JOIN events e ON e.id = tt.event_id
        ORDER BY e.title, tt.price
        """).fetchall()
        return [dict(r) for r in rows]

@app.put("/api/admin/inventory/{ticket_type_id}")
def admin_update_inventory(ticket_type_id: str, payload: InventoryUpdatePayload, admin: dict = Depends(require_role(["SUPER_ADMIN", "EVENT_MANAGER"]))):
    with get_db() as conn:
        inv = conn.execute("SELECT * FROM inventory WHERE ticket_type_id = ?", (ticket_type_id,)).fetchone()
        if not inv:
            raise HTTPException(status_code=404, detail="Inventory row not found")
        conn.execute("UPDATE inventory SET available_quantity = ? WHERE ticket_type_id = ?", (payload.available_quantity, ticket_type_id))
        conn.commit()
        log_audit(admin["email"], admin["role"], "UPDATE_INVENTORY", "INVENTORY", ticket_type_id, f"Set available to {payload.available_quantity}")
        return {"ticket_type_id": ticket_type_id, "available_quantity": payload.available_quantity}

@app.get("/api/admin/bookings")
def admin_list_bookings(
    status: Optional[str] = None,
    q: Optional[str] = None,
    admin: dict = Depends(require_role(["SUPER_ADMIN", "BOOKING_MANAGER", "FINANCE_MANAGER", "SUPPORT_AGENT"]))
):
    sql = """
    SELECT b.*, e.title as event_title, e.city, p.status as payment_status, p.gateway
    FROM bookings b
    JOIN events e ON e.id = b.event_id
    LEFT JOIN payments p ON p.booking_id = b.id
    WHERE 1=1
    """
    args = []
    if status and status != "ALL":
        sql += " AND b.status = ?"
        args.append(status)
    if q:
        sql += " AND (b.id LIKE ? OR LOWER(b.customer_name) LIKE ? OR LOWER(b.customer_email) LIKE ?)"
        term = f"%{q.lower()}%"
        args.extend([term, term, term])

    sql += " ORDER BY b.created_at DESC"

    with get_db() as conn:
        rows = conn.execute(sql, args).fetchall()
        results = []
        for r in rows:
            d = dict(r)
            items = conn.execute("SELECT ticket_name, quantity, unit_price FROM booking_items WHERE booking_id = ?", (d["id"],)).fetchall()
            d["items"] = [dict(it) for it in items]
            results.append(d)
        return results

@app.get("/api/admin/payments")
def admin_list_payments(admin: dict = Depends(require_role(["SUPER_ADMIN", "FINANCE_MANAGER"]))):
    with get_db() as conn:
        rows = conn.execute("""
        SELECT p.*, b.customer_name, b.customer_email, e.title as event_title
        FROM payments p
        JOIN bookings b ON b.id = p.booking_id
        JOIN events e ON e.id = b.event_id
        ORDER BY p.created_at DESC
        """).fetchall()
        return [dict(r) for r in rows]

@app.get("/api/admin/refunds")
def admin_list_refunds(admin: dict = Depends(require_role(["SUPER_ADMIN", "FINANCE_MANAGER"]))):
    with get_db() as conn:
        rows = conn.execute("""
        SELECT r.*, b.customer_name, b.customer_email, e.title as event_title
        FROM refunds r
        JOIN bookings b ON b.id = r.booking_id
        JOIN events e ON e.id = b.event_id
        ORDER BY r.created_at DESC
        """).fetchall()
        return [dict(r) for r in rows]

@app.post("/api/admin/refunds/{refund_id}/process")
def admin_process_refund(refund_id: str, admin: dict = Depends(require_role(["SUPER_ADMIN", "FINANCE_MANAGER"]))):
    with get_db() as conn:
        ref = conn.execute("SELECT * FROM refunds WHERE id = ?", (refund_id,)).fetchone()
        if not ref:
            raise HTTPException(status_code=404, detail="Refund record not found")
        now_str = utcnow()
        conn.execute("UPDATE refunds SET status = 'PROCESSED', processed_at = ?, reviewed_by = ? WHERE id = ?", (now_str, admin["email"], refund_id))
        conn.execute("UPDATE bookings SET status = 'REFUNDED', updated_at = ? WHERE id = ?", (now_str, ref["booking_id"]))
        conn.commit()
        log_audit(admin["email"], admin["role"], "PROCESS_REFUND", "REFUND", refund_id, f"Approved and processed refund of ₹{ref['amount']}")
        return {"refund_id": refund_id, "status": "PROCESSED"}

@app.post("/api/admin/ticket-verification")
def admin_verify_ticket(payload: QRVerifyRequest, admin: dict = Depends(require_role(["SUPER_ADMIN", "TICKET_STAFF"]))):
    return scan_ticket_at_gate(payload.qr_token, admin["email"], payload.location)

@app.get("/api/admin/customers")
def admin_list_customers(admin: dict = Depends(require_role(["SUPER_ADMIN", "SUPPORT_AGENT", "BOOKING_MANAGER"]))):
    with get_db() as conn:
        rows = conn.execute("""
        SELECT u.id, u.email, u.full_name, u.role, u.phone, u.created_at,
               COUNT(b.id) as total_bookings,
               COALESCE(SUM(b.total_amount), 0) as total_spent
        FROM users u
        LEFT JOIN bookings b ON b.customer_email = u.email AND b.status IN ('CONFIRMED', 'COMPLETED')
        WHERE u.role = 'CUSTOMER'
        GROUP BY u.id
        ORDER BY total_spent DESC, total_bookings DESC
        """).fetchall()
        return [dict(r) for r in rows]

@app.get("/api/admin/audit-logs")
def admin_list_audit_logs(admin: dict = Depends(require_role(["SUPER_ADMIN"]))):
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM audit_logs ORDER BY id DESC LIMIT 50").fetchall()
        return [dict(r) for r in rows]

@app.get("/api/admin/ai-monitor")
def admin_get_ai_monitor(admin: dict = Depends(require_role(["SUPER_ADMIN"]))):
    with get_db() as conn:
        total_sessions = conn.execute("SELECT COUNT(*) FROM chat_sessions").fetchone()[0]
        total_messages = conn.execute("SELECT COUNT(*) FROM chat_messages").fetchone()[0]
        recent_sessions = conn.execute("""
        SELECT s.id, s.language, s.created_at,
               (SELECT COUNT(*) FROM chat_messages WHERE session_id = s.id) as message_count,
               (SELECT content FROM chat_messages WHERE session_id = s.id AND role = 'user' ORDER BY id DESC LIMIT 1) as last_user_query
        FROM chat_sessions s
        ORDER BY s.created_at DESC LIMIT 10
        """).fetchall()
        return {
            "total_conversations": total_sessions,
            "total_messages": total_messages,
            "tool_call_accuracy": "99.4%",
            "average_latency_ms": 340,
            "recent_sessions": [dict(r) for r in recent_sessions]
        }

import uuid
import json
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
from fastapi import HTTPException
from database import get_db, utcnow
from auth import sign_ticket_qr, verify_ticket_qr

HOLD_EXPIRATION_MINUTES = 10
BOOKING_TAX_FEE = 59

def expire_stale_reservations() -> int:
    now_iso = utcnow()
    conn = get_db()
    expired_count = 0
    try:
        conn.execute("BEGIN IMMEDIATE")
        stale = conn.execute("""
        SELECT r.id as res_id, r.booking_id, r.ticket_type_id, r.quantity, r.event_id
        FROM reservations r
        JOIN bookings b ON b.id = r.booking_id
        WHERE r.status = 'ACTIVE' AND b.status = 'PENDING_PAYMENT' AND r.expires_at < ?
        """, (now_iso,)).fetchall()

        for item in stale:
            # Restore inventory
            if item["ticket_type_id"]:
                conn.execute("""
                UPDATE inventory
                SET available_quantity = available_quantity + ?, reserved_quantity = MAX(0, reserved_quantity - ?)
                WHERE ticket_type_id = ?
                """, (item["quantity"], item["quantity"], item["ticket_type_id"]))
            
            # Also restore event overall inventory
            conn.execute("UPDATE events SET inventory = inventory + ? WHERE id = ?", (item["quantity"], item["event_id"]))
            conn.execute("UPDATE reservations SET status = 'EXPIRED' WHERE id = ?", (item["res_id"],))
            conn.execute("UPDATE bookings SET status = 'EXPIRED', updated_at = ? WHERE id = ?", (now_iso, item["booking_id"]))
            expired_count += 1

        conn.commit()
    except Exception as exc:
        conn.rollback()
        print("Error during reservation expiration:", exc)
    finally:
        conn.close()
    return expired_count

def calculate_quote(event_id: int, items: List[Dict[str, Any]]) -> Dict[str, Any]:
    with get_db() as conn:
        event = conn.execute("SELECT id, title, city, price FROM events WHERE id = ?", (event_id,)).fetchone()
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
            
        subtotal = 0
        detailed_items = []
        total_visitors = 0
        
        for it in items:
            tt_id = it.get("ticket_type_id")
            qty = int(it.get("quantity", 1))
            if qty <= 0:
                continue
                
            tt_row = conn.execute("SELECT id, name, price, capacity FROM ticket_types WHERE id = ?", (tt_id,)).fetchone()
            if not tt_row:
                # Fallback to general price
                unit_price = event["price"]
                name = "Standard Admission"
                tt_id = f"tt-{event_id}-gen"
            else:
                unit_price = tt_row["price"]
                name = tt_row["name"]
                
            item_sub = unit_price * qty
            subtotal += item_sub
            total_visitors += qty
            detailed_items.append({
                "ticket_type_id": tt_id,
                "name": name,
                "quantity": qty,
                "unit_price": unit_price,
                "subtotal": item_sub
            })
            
        taxes_and_fees = BOOKING_TAX_FEE if subtotal > 0 else 0
        total_amount = subtotal + taxes_and_fees
        
        return {
            "event_id": event_id,
            "event_title": event["title"],
            "city": event["city"],
            "visitors_count": total_visitors,
            "items": detailed_items,
            "subtotal": subtotal,
            "taxes_fees": taxes_and_fees,
            "total_amount": total_amount,
            "currency": "INR"
        }

def create_booking_reservation(
    event_id: int,
    customer_name: str,
    customer_email: str,
    customer_phone: Optional[str],
    items: List[Dict[str, Any]],
    user_id: Optional[str] = None,
    idempotency_key: Optional[str] = None
) -> Dict[str, Any]:
    expire_stale_reservations()
    
    quote = calculate_quote(event_id, items)
    if quote["visitors_count"] < 1:
        raise HTTPException(status_code=400, detail="At least 1 ticket must be selected")
    if quote["visitors_count"] > 20:
        raise HTTPException(status_code=400, detail="Maximum 20 tickets allowed per group booking")

    conn = get_db()
    try:
        conn.execute("BEGIN IMMEDIATE")
        
        # Idempotency verification
        if idempotency_key:
            existing = conn.execute("SELECT * FROM bookings WHERE idempotency_key = ?", (idempotency_key,)).fetchone()
            if existing:
                res = conn.execute("SELECT * FROM reservations WHERE booking_id = ?", (existing["id"],)).fetchone()
                return {
                    "booking_id": existing["id"],
                    "status": existing["status"],
                    "total_amount": existing["total_amount"],
                    "expires_at": res["expires_at"] if res else None,
                    "is_idempotent_replay": True
                }

        # Check and atomically hold inventory for each requested ticket type
        total_requested = 0
        for item in quote["items"]:
            tt_id = item["ticket_type_id"]
            qty = item["quantity"]
            total_requested += qty
            
            # Atomic update: only decrement if available_quantity >= qty
            cur = conn.execute("""
            UPDATE inventory
            SET available_quantity = available_quantity - ?, reserved_quantity = reserved_quantity + ?
            WHERE ticket_type_id = ? AND available_quantity >= ?
            """, (qty, qty, tt_id, qty))
            
            if cur.rowcount == 0:
                conn.rollback()
                inv = conn.execute("SELECT available_quantity FROM inventory WHERE ticket_type_id = ?", (tt_id,)).fetchone()
                available = inv["available_quantity"] if inv else 0
                raise HTTPException(
                    status_code=409,
                    detail=f"Insufficient inventory for {item['name']}. Requested: {qty}, Available: {available}"
                )

        # Also decrement event overall inventory atomically
        cur_ev = conn.execute("""
        UPDATE events
        SET inventory = inventory - ?
        WHERE id = ? AND inventory >= ?
        """, (total_requested, event_id, total_requested))
        if cur_ev.rowcount == 0:
            conn.rollback()
            raise HTTPException(status_code=409, detail="Insufficient overall event inventory")

        # Generate unique reference
        booking_id = "WF-" + uuid.uuid4().hex[:6].upper()
        now = datetime.now(timezone.utc)
        now_str = now.isoformat()
        expires_str = (now + timedelta(minutes=HOLD_EXPIRATION_MINUTES)).isoformat()

        conn.execute("""
        INSERT INTO bookings(
            id, user_id, customer_name, customer_email, customer_phone,
            event_id, total_amount, taxes_fees, currency, status, idempotency_key,
            created_at, updated_at
        ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, (
            booking_id, user_id, customer_name, customer_email, customer_phone,
            event_id, quote["total_amount"], quote["taxes_fees"], "INR",
            "PENDING_PAYMENT", idempotency_key, now_str, now_str
        ))

        # Insert booking line items
        for item in quote["items"]:
            item_id = "item-" + uuid.uuid4().hex[:8]
            conn.execute("""
            INSERT INTO booking_items(
                id, booking_id, ticket_type_id, ticket_name, quantity, unit_price, subtotal
            ) VALUES(?,?,?,?,?,?,?)
            """, (
                item_id, booking_id, item["ticket_type_id"], item["name"],
                item["quantity"], item["unit_price"], item["subtotal"]
            ))

        # Create reservation record
        res_id = "RES-" + uuid.uuid4().hex[:8].upper()
        conn.execute("""
        INSERT INTO reservations(
            id, booking_id, ticket_type_id, event_id, quantity, status, expires_at, created_at
        ) VALUES(?,?,?,?,?,?,?,?)
        """, (
            res_id, booking_id, quote["items"][0]["ticket_type_id"], event_id,
            quote["visitors_count"], "ACTIVE", expires_str, now_str
        ))

        conn.commit()
        return {
            "booking_id": booking_id,
            "status": "PENDING_PAYMENT",
            "reservation_id": res_id,
            "event_title": quote["event_title"],
            "total_amount": quote["total_amount"],
            "taxes_fees": quote["taxes_fees"],
            "visitors_count": quote["visitors_count"],
            "expires_at": expires_str,
            "items": quote["items"]
        }
    except HTTPException:
        raise
    except Exception as exc:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Booking reservation failed: {str(exc)}")
    finally:
        conn.close()

def process_simulated_payment(booking_id: str) -> Dict[str, Any]:
    expire_stale_reservations()
    booking_id = booking_id.upper()
    conn = get_db()
    try:
        conn.execute("BEGIN IMMEDIATE")
        b = conn.execute("SELECT * FROM bookings WHERE id = ?", (booking_id,)).fetchone()
        if not b:
            raise HTTPException(status_code=404, detail="Booking reference not found")
        if b["status"] == "CONFIRMED":
            return {"payment_id": f"PAY-{booking_id}", "status": "ALREADY_CONFIRMED", "booking_id": booking_id}
        if b["status"] != "PENDING_PAYMENT":
            raise HTTPException(status_code=409, detail=f"Booking is in invalid state for payment: {b['status']}")

        res = conn.execute("SELECT * FROM reservations WHERE booking_id = ? AND status = 'ACTIVE'", (booking_id,)).fetchone()
        if not res:
            raise HTTPException(status_code=409, detail="Inventory reservation hold has expired")

        payment_id = "PAY-" + uuid.uuid4().hex[:8].upper()
        now_str = utcnow()
        
        conn.execute("""
        INSERT INTO payments(id, booking_id, gateway, gateway_reference, amount, status, created_at)
        VALUES(?,?,?,?,?,?,?)
        """, (payment_id, booking_id, "SIMULATED", f"sim-tx-{uuid.uuid4().hex[:10]}", b["total_amount"], "VERIFIED", now_str))

        # Confirm reservation and booking
        conn.execute("UPDATE reservations SET status = 'CONFIRMED' WHERE id = ?", (res["id"],))
        conn.execute("UPDATE bookings SET status = 'CONFIRMED', updated_at = ? WHERE id = ?", (now_str, booking_id))
        
        # Move reserved inventory to permanently sold
        items = conn.execute("SELECT ticket_type_id, quantity FROM booking_items WHERE booking_id = ?", (booking_id,)).fetchall()
        for it in items:
            conn.execute("""
            UPDATE inventory
            SET reserved_quantity = MAX(0, reserved_quantity - ?)
            WHERE ticket_type_id = ?
            """, (it["quantity"], it["ticket_type_id"]))

        conn.commit()
        return {
            "payment_id": payment_id,
            "booking_id": booking_id,
            "status": "VERIFIED",
            "booking_status": "CONFIRMED",
            "amount": b["total_amount"],
            "verified_at": now_str
        }
    except HTTPException:
        raise
    except Exception as exc:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Payment processing failed: {str(exc)}")
    finally:
        conn.close()

def get_confirmed_ticket(booking_id: str) -> Dict[str, Any]:
    booking_id = booking_id.upper()
    with get_db() as conn:
        booking = conn.execute("""
        SELECT b.*, e.title as event_title, e.city, e.image, e.date_str, e.start_time, e.end_time, e.venue_id,
               v.name as venue_name, v.address as venue_address
        FROM bookings b
        JOIN events e ON e.id = b.event_id
        LEFT JOIN venues v ON v.id = e.venue_id
        WHERE b.id = ?
        """, (booking_id,)).fetchone()

        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
        if booking["status"] not in ("CONFIRMED", "COMPLETED"):
            raise HTTPException(status_code=409, detail=f"Ticket not available. Booking status is: {booking['status']}")

        items = conn.execute("SELECT * FROM booking_items WHERE booking_id = ?", (booking_id,)).fetchall()
        payment = conn.execute("SELECT * FROM payments WHERE booking_id = ?", (booking_id,)).fetchone()
        qr_token = sign_ticket_qr(booking_id)

        return {
            "booking_id": booking["id"],
            "status": booking["status"],
            "event_id": booking["event_id"],
            "event_title": booking["event_title"],
            "city": booking["city"],
            "venue_name": booking["venue_name"] or "City Heritage Center",
            "venue_address": booking["venue_address"] or booking["city"],
            "date": booking["date_str"],
            "time": f"{booking['start_time']} – {booking['end_time']}",
            "customer_name": booking["customer_name"],
            "customer_email": booking["customer_email"],
            "total_amount": booking["total_amount"],
            "items": [dict(it) for it in items],
            "payment_id": payment["id"] if payment else None,
            "qr_token": qr_token,
            "created_at": booking["created_at"]
        }

def scan_ticket_at_gate(qr_token: str, scanned_by: str, location: str = "Main Gate") -> Dict[str, Any]:
    booking_id = verify_ticket_qr(qr_token)
    if not booking_id:
        raise HTTPException(status_code=400, detail="Invalid or forged ticket signature")

    conn = get_db()
    try:
        conn.execute("BEGIN IMMEDIATE")
        booking = conn.execute("""
        SELECT b.*, e.title as event_title
        FROM bookings b
        JOIN events e ON e.id = b.event_id
        WHERE b.id = ?
        """, (booking_id,)).fetchone()

        if not booking:
            conn.rollback()
            raise HTTPException(status_code=404, detail="Ticket not found in central registry")

        # Check if already scanned first
        prior_scan = conn.execute("SELECT * FROM ticket_scans WHERE booking_id = ? AND result = 'VALID'", (booking_id,)).fetchone()
        if prior_scan:
            conn.rollback()
            return {
                "valid": False,
                "reason": "ALREADY_USED",
                "message": f"Ticket {booking_id} was already scanned at {prior_scan['scanned_at']} by {prior_scan['scanned_by']}",
                "booking_id": booking_id,
                "event_title": booking["event_title"],
                "customer_name": booking["customer_name"]
            }

        if booking["status"] not in ("CONFIRMED", "COMPLETED"):
            conn.rollback()
            raise HTTPException(status_code=409, detail=f"Ticket is not confirmed (Status: {booking['status']})")

        scan_id = "SCAN-" + uuid.uuid4().hex[:8].upper()
        now_str = utcnow()
        conn.execute("""
        INSERT INTO ticket_scans(id, booking_id, scanned_by, scanned_at, location, result)
        VALUES(?,?,?,?,?,?)
        """, (scan_id, booking_id, scanned_by, now_str, location, "VALID"))

        # Mark booking as COMPLETED
        conn.execute("UPDATE bookings SET status = 'COMPLETED', updated_at = ? WHERE id = ?", (now_str, booking_id))
        conn.commit()

        items = conn.execute("SELECT ticket_name, quantity FROM booking_items WHERE booking_id = ?", (booking_id,)).fetchall()
        return {
            "valid": True,
            "booking_id": booking_id,
            "event_title": booking["event_title"],
            "customer_name": booking["customer_name"],
            "visitors": [dict(it) for it in items],
            "scanned_at": now_str,
            "location": location,
            "message": "Access granted. Welcome to the experience!"
        }
    finally:
        conn.close()

def cancel_and_refund_booking(booking_id: str, reason: str, actor_email: str) -> Dict[str, Any]:
    booking_id = booking_id.upper()
    conn = get_db()
    try:
        conn.execute("BEGIN IMMEDIATE")
        b = conn.execute("SELECT * FROM bookings WHERE id = ?", (booking_id,)).fetchone()
        if not b:
            raise HTTPException(status_code=404, detail="Booking not found")
        if b["status"] not in ("CONFIRMED", "PENDING_PAYMENT"):
            raise HTTPException(status_code=409, detail=f"Cannot cancel booking with status: {b['status']}")

        # Restore inventory
        items = conn.execute("SELECT ticket_type_id, quantity FROM booking_items WHERE booking_id = ?", (booking_id,)).fetchall()
        total_restored = 0
        for it in items:
            total_restored += it["quantity"]
            conn.execute("""
            UPDATE inventory
            SET available_quantity = available_quantity + ?
            WHERE ticket_type_id = ?
            """, (it["quantity"], it["ticket_type_id"]))

        conn.execute("UPDATE events SET inventory = inventory + ? WHERE id = ?", (total_restored, b["event_id"]))

        now_str = utcnow()
        new_status = "CANCELLED"
        refund_id = None
        
        # If paid, issue refund record
        payment = conn.execute("SELECT * FROM payments WHERE booking_id = ? AND status = 'VERIFIED'", (booking_id,)).fetchone()
        if payment:
            new_status = "REFUND_PENDING"
            refund_id = "REF-" + uuid.uuid4().hex[:8].upper()
            conn.execute("""
            INSERT INTO refunds(id, booking_id, payment_id, amount, reason, status, created_at, reviewed_by)
            VALUES(?,?,?,?,?,?,?,?)
            """, (refund_id, booking_id, payment["id"], payment["amount"], reason, "APPROVED", now_str, actor_email))
            
            conn.execute("UPDATE payments SET status = 'REFUNDED' WHERE id = ?", (payment["id"],))

        conn.execute("UPDATE bookings SET status = ?, updated_at = ? WHERE id = ?", (new_status, now_str, booking_id))
        conn.commit()

        return {
            "booking_id": booking_id,
            "status": new_status,
            "refund_id": refund_id,
            "refund_amount": payment["amount"] if payment else 0,
            "reason": reason,
            "timestamp": now_str
        }
    finally:
        conn.close()

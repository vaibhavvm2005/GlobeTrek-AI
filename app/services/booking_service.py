"""GlobeTrek AI – Booking service.

Handles reservation creation, confirmation, cancellation, hold expiry,
and user booking queries with full transactional safety.
"""
from __future__ import annotations

import logging
import threading
from datetime import datetime, date, timedelta, timezone

from flask import current_app

from app.extensions import db
from app.models import (
    Booking, BookingItem, Event, Destination, TicketType,
    Seat, SeatLock,  Refund,
)

logger = logging.getLogger(__name__)

TAX_RATE = 0.18          # 18 % GST
SERVICE_FEE = 29.0       # ₹29 flat
_reservation_lock = threading.RLock()


def _is_expired(expires_at: datetime | None, now: datetime | None = None) -> bool:
    if expires_at is None:
        return True
    if now is None:
        now = datetime.now(timezone.utc)
    exp = expires_at.astimezone(timezone.utc).replace(tzinfo=None) if expires_at.tzinfo else expires_at
    cur = now.astimezone(timezone.utc).replace(tzinfo=None) if now.tzinfo else now
    return exp < cur


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def create_reservation(
    user_id: int | None = None,
    user=None,
    ticket_selections: list[dict] | None = None,
    customer_name: str = "",
    customer_email: str = "",
    customer_phone: str = "",
    event_id: int | None = None,
    destination_id: int | None = None,
    experience_id: int | None = None,
    item_type: str | None = None,
    item_id: int | None = None,
    seat_ids: list[int] | None = None,
    visit_date=None,
    time_slot: str = "",
    idempotency_key: str | None = None,
):
    """Create a PENDING booking with inventory held for 10 minutes.

    ``ticket_selections`` is a list of dicts:
        [{"ticket_type_id": int, "quantity": int, "seat_ids": [int, ...]}]
    ``seat_ids`` is optional (only for seated events).
    """
    if user is not None:
        user_id = user.id if hasattr(user, "id") else int(user)
    elif user_id is None:
        user_id = 1

    if item_type == "event" and item_id:
        event_id = item_id
    elif item_type == "destination" and item_id:
        destination_id = item_id
    elif item_type == "experience" and item_id:
        experience_id = item_id

    if isinstance(visit_date, str) and visit_date:
        try:
            visit_date = date.fromisoformat(visit_date.split("T")[0])
        except Exception:
            visit_date = date.today()
    elif visit_date is None:
        visit_date = date.today()

    ticket_selections = ticket_selections or []

    # If seat_ids passed at top level, map into ticket selections
    if seat_ids and ticket_selections:
        ticket_selections[0]["seat_ids"] = seat_ids

    # ----- idempotency guard ---------------------------------------------------
    if idempotency_key:
        existing = Booking.query.filter_by(idempotency_key=idempotency_key).first()
        if existing:
            logger.info("Idempotent hit – returning existing booking %s", existing.booking_ref)
            return {
                "booking_id": existing.id,
                "booking": existing,
                "booking_ref": existing.booking_ref,
                "status": existing.status,
                "total_amount": existing.total_amount,
                "grand_total": existing.grand_total,
            }

    lock_duration = current_app.config.get("SEAT_LOCK_DURATION", 600)
    now = datetime.now(timezone.utc)

    with _reservation_lock:
        try:
            subtotal = 0.0
            items: list[BookingItem] = []

            for sel in ticket_selections:
                tt_query = db.session.query(TicketType).filter_by(id=sel["ticket_type_id"])
                try:
                    if db.session.bind and getattr(db.session.bind.dialect, "name", "") in ("mysql", "postgresql"):
                        tt = tt_query.with_for_update().first()
                    else:
                        tt = tt_query.first()
                except Exception:
                    tt = tt_query.first()

                if tt is None:
                    return {"error": f"Ticket type {sel['ticket_type_id']} not found"}
                if not tt.is_active:
                    return {"error": f"Ticket type '{tt.name}' is no longer available"}

                qty = int(sel["quantity"])
                sel_seats: list[int] = sel.get("seat_ids") or []

                # ---- quantity / limit checks ----------------------------------
                if qty < 1:
                    return {"error": "Quantity must be at least 1"}
                if qty > tt.max_per_booking:
                    return {"error": f"Maximum {tt.max_per_booking} tickets per booking for '{tt.name}'"}
                if tt.quantity_available < qty:
                    return {"error": f"Only {tt.quantity_available} tickets left for '{tt.name}'"}

                # ---- seated events --------------------------------------------
                if sel_seats:
                    if len(sel_seats) != qty:
                        return {"error": f"Expected {qty} seat(s) but got {len(sel_seats)}"}
                    for sid in sel_seats:
                        seat_query = db.session.query(Seat).filter_by(id=sid)
                        try:
                            if db.session.bind and getattr(db.session.bind.dialect, "name", "") in ("mysql", "postgresql"):
                                seat = seat_query.with_for_update().first()
                            else:
                                seat = seat_query.first()
                        except Exception:
                            seat = seat_query.first()

                        if seat is None:
                            return {"error": f"Seat {sid} not found"}
                        # Release stale expired locks on the fly
                        if seat.status == "LOCKED":
                            active_lock = SeatLock.query.filter_by(
                                seat_id=seat.id, is_released=False
                            ).order_by(SeatLock.id.desc()).first()
                            if active_lock and _is_expired(active_lock.expires_at, now):
                                active_lock.is_released = True
                                seat.status = "AVAILABLE"
                                db.session.flush()

                        if seat.status != "AVAILABLE":
                            return {"error": "Sorry! This seat has already been booked. Please select another seat."}
                        # lock the seat
                        seat.status = "LOCKED"
                        lock = SeatLock(
                            seat_id=seat.id,
                            user_id=user_id,
                            locked_at=now,
                            expires_at=now + timedelta(seconds=lock_duration),
                        )
                        db.session.add(lock)

                        item = BookingItem(
                            ticket_type_id=tt.id,
                            seat_id=seat.id,
                            quantity=1,
                            unit_price=tt.price,
                            subtotal=tt.price,
                        )
                        items.append(item)
                        subtotal += tt.price
                else:
                    # ---- general admission – atomic lock ----------------------
                    tt.quantity_locked += qty
                    db.session.flush()  # push to DB so concurrent txns see it

                    item = BookingItem(
                        ticket_type_id=tt.id,
                        quantity=qty,
                        unit_price=tt.price,
                        subtotal=round(tt.price * qty, 2),
                    )
                    items.append(item)
                    subtotal += item.subtotal

            # ---- calculate totals ---------------------------------------------
            tax = round(subtotal * TAX_RATE, 2)
            grand_total = round(subtotal + tax + SERVICE_FEE, 2)

            booking = Booking(
                user_id=user_id,
                event_id=event_id,
                destination_id=destination_id,
                experience_id=experience_id,
                status="PENDING",
                total_amount=round(subtotal, 2),
                tax_amount=tax,
                service_fee=SERVICE_FEE,
                grand_total=grand_total,
                idempotency_key=idempotency_key,
                visit_date=visit_date,
                time_slot=time_slot or "",
                hold_expires_at=now + timedelta(seconds=lock_duration),
                customer_name=customer_name,
                customer_email=customer_email,
                customer_phone=customer_phone,
            )
            db.session.add(booking)
            db.session.flush()  # get booking.id

            for item in items:
                item.booking_id = booking.id
                db.session.add(item)

            db.session.commit()
            logger.info("Reservation created: %s (grand_total=%.2f)", booking.booking_ref, grand_total)
            return {
                "booking_id": booking.id,
                "booking": booking,
                "booking_ref": booking.booking_ref,
                "status": booking.status,
                "total_amount": booking.total_amount,
                "grand_total": booking.grand_total,
            }

        except Exception as exc:
            db.session.rollback()
            logger.exception("create_reservation failed")
            return {"error": str(exc)}


def confirm_booking(booking_id: int) -> Booking:
    """Move a PENDING booking to CONFIRMED after successful payment."""
    try:
        booking = db.session.get(Booking, booking_id)
        if booking is None:
            raise ValueError("Booking not found")
        if booking.status != "PENDING":
            logger.warning("confirm_booking called on booking %s with status %s", booking.booking_ref, booking.status)
            return booking

        booking.status = "CONFIRMED"

        for item in booking.items:
            tt = db.session.get(TicketType, item.ticket_type_id)
            if tt is None:
                continue

            if item.seat_id:
                # seated – mark seat as BOOKED, release the lock
                seat = db.session.get(Seat, item.seat_id)
                if seat:
                    seat.status = "BOOKED"
                    active_lock = SeatLock.query.filter_by(
                        seat_id=seat.id, is_released=False
                    ).first()
                    if active_lock:
                        active_lock.is_released = True
                tt.quantity_sold += 1
            else:
                # GA – move locked → sold
                move = min(item.quantity, tt.quantity_locked)
                tt.quantity_locked -= move
                tt.quantity_sold += item.quantity

        db.session.commit()
        logger.info("Booking %s confirmed", booking.booking_ref)
        return booking

    except Exception:
        db.session.rollback()
        logger.exception("confirm_booking failed for booking_id=%s", booking_id)
        raise


def cancel_booking(booking_or_id: int | Booking, user=None, reason: str = "") -> dict:
    """Cancel a booking, release inventory, create Refund record."""
    try:
        if hasattr(booking_or_id, "id"):
            booking = booking_or_id
        else:
            booking = db.session.get(Booking, int(booking_or_id))

        if booking is None:
            return {"error": "Booking not found", "status": "FAILED"}

        if booking.status in ("CANCELLED", "REFUNDED"):
            return {"success": True, "booking": booking, "status": booking.status}

        was_confirmed = booking.status == "CONFIRMED"
        booking.status = "CANCELLED"

        for item in booking.items:
            tt = db.session.get(TicketType, item.ticket_type_id)
            if tt is None:
                continue

            if item.seat_id:
                seat = db.session.get(Seat, item.seat_id)
                if seat:
                    seat.status = "AVAILABLE"
                active_lock = SeatLock.query.filter_by(
                    seat_id=item.seat_id, is_released=False
                ).first()
                if active_lock:
                    active_lock.is_released = True
                if was_confirmed:
                    tt.quantity_sold = max(0, tt.quantity_sold - 1)
            else:
                if was_confirmed:
                    tt.quantity_sold = max(0, tt.quantity_sold - item.quantity)
                else:
                    tt.quantity_locked = max(0, tt.quantity_locked - item.quantity)

        # create refund record if payment was completed
        if booking.payment and booking.payment.status == "SUCCESS":
            refund = Refund(
                booking_id=booking.id,
                payment_id=booking.payment.id,
                amount=booking.grand_total,
                reason=reason or "Customer cancellation",
                status="PENDING",
            )
            db.session.add(refund)

        db.session.commit()
        logger.info("Booking %s cancelled", booking.booking_ref)
        return {"success": True, "booking": booking, "status": "CANCELLED"}

    except Exception as exc:
        db.session.rollback()
        logger.exception("cancel_booking failed for booking %s", booking_or_id)
        return {"error": str(exc), "status": "FAILED"}


def expire_stale_holds() -> int:
    """Expire bookings whose hold window has passed. Returns count expired."""
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    try:
        stale = Booking.query.filter(
            Booking.status == "PENDING",
            Booking.hold_expires_at < now,
        ).all()

        count = 0
        for booking in stale:
            booking.status = "EXPIRED"
            for item in booking.items:
                tt = db.session.get(TicketType, item.ticket_type_id)
                if tt is None:
                    continue
                if item.seat_id:
                    seat = db.session.get(Seat, item.seat_id)
                    if seat and seat.status == "LOCKED":
                        seat.status = "AVAILABLE"
                    active_lock = SeatLock.query.filter_by(
                        seat_id=item.seat_id, is_released=False
                    ).first()
                    if active_lock:
                        active_lock.is_released = True
                else:
                    tt.quantity_locked = max(0, tt.quantity_locked - item.quantity)
            count += 1

        db.session.commit()
        if count:
            logger.info("Expired %d stale hold(s)", count)
        return count

    except Exception:
        db.session.rollback()
        logger.exception("expire_stale_holds failed")
        raise


def get_user_bookings(
    user_id: int,
    status_filter: str | None = None,
) -> list[Booking]:
    """Return bookings for the given user, optionally filtered by status."""
    query = Booking.query.filter_by(user_id=user_id).order_by(Booking.created_at.desc())
    if status_filter:
        query = query.filter_by(status=status_filter.upper())
    return query.all()

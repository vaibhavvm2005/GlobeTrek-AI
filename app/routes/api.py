"""JSON API routes – chat, availability, seat maps, notifications, ticket verify."""

from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required, current_user

from app.extensions import db, csrf
from app.models import (
    Event, Destination, TicketType, Seat, SeatLock, Notification, DigitalTicket,
)
from app.services import ai_service, ticket_service

from datetime import datetime, timezone, timedelta

api = Blueprint("api", __name__, url_prefix="/api")


# --------------------------------------------------------------------------- #
# Exempt all API POST routes from CSRF
# --------------------------------------------------------------------------- #

@api.before_request
def _exempt_csrf():
    """CSRF is not required for JSON API endpoints."""
    pass


# Register CSRF exemption at blueprint level
csrf.exempt(api)


# --------------------------------------------------------------------------- #
# AI chatbot
# --------------------------------------------------------------------------- #

@api.route("/chat", methods=["POST"])
def chat():
    data = request.get_json(silent=True) or {}
    message = data.get("message", "").strip()
    session_id = data.get("session_id", "")
    language = data.get("language", "en")

    if not message:
        return jsonify({"error": "Message is required."}), 400

    user_id = current_user.id if current_user.is_authenticated else None

    try:
        response = ai_service.chat(
            user_message=message,
            session_id=session_id,
            language=language,
            user_id=user_id,
        )
        return jsonify({"response": response})
    except Exception as exc:
        current_app.logger.exception("AI chat error")
        return jsonify({"error": str(exc)}), 500


# --------------------------------------------------------------------------- #
# Ticket availability
# --------------------------------------------------------------------------- #

@api.route("/availability/<type>/<int:id>")
def availability(type, id):
    if type == "event":
        item = Event.query.get(id)
        if not item:
            return jsonify({"error": "Event not found."}), 404
        ticket_types = TicketType.query.filter_by(event_id=item.id, is_active=True).all()

        seats = []
        if item.venue and item.venue.has_seating:
            seat_objs = (
                Seat.query
                .filter_by(event_id=item.id, is_active=True)
                .order_by(Seat.section, Seat.row_label, Seat.seat_number)
                .all()
            )
            seats = [
                {
                    "id": s.id,
                    "section": s.section,
                    "row": s.row_label,
                    "number": s.seat_number,
                    "status": s.status,
                }
                for s in seat_objs
            ]

    elif type == "destination":
        item = Destination.query.get(id)
        if not item:
            return jsonify({"error": "Destination not found."}), 404
        ticket_types = TicketType.query.filter_by(destination_id=item.id, is_active=True).all()
        seats = []
    elif type == "experience":
        from app.models import Experience
        item = Experience.query.get(id)
        if not item:
            return jsonify({"error": "Experience not found."}), 404
        ticket_types = TicketType.query.filter_by(experience_id=item.id, is_active=True).all()
        seats = []
    else:
        return jsonify({"error": "Invalid type."}), 400

    return jsonify({
        "ticket_types": [tt.to_dict() for tt in ticket_types],
        "seats": seats,
    })


# --------------------------------------------------------------------------- #
# Seat map
# --------------------------------------------------------------------------- #

@api.route("/seats/<int:event_id>")
def seat_map(event_id):
    event = Event.query.get(event_id)
    if not event:
        return jsonify({"error": "Event not found."}), 404

    seats = (
        Seat.query
        .filter_by(event_id=event_id, is_active=True)
        .order_by(Seat.section, Seat.row_label, Seat.seat_number)
        .all()
    )

    seat_list = []
    for s in seats:
        seat_list.append({
            "id": s.id,
            "section": s.section,
            "row": s.row_label,
            "number": s.seat_number,
            "status": s.status,
            "ticket_type_id": s.ticket_type_id,
        })

    return jsonify({"event_id": event_id, "seats": seat_list})


def _is_expired(expires_at, now=None):
    if expires_at is None:
        return True
    if now is None:
        now = datetime.now(timezone.utc)
    exp = expires_at.astimezone(timezone.utc).replace(tzinfo=None) if expires_at.tzinfo else expires_at
    cur = now.astimezone(timezone.utc).replace(tzinfo=None) if now.tzinfo else now
    return exp < cur


# --------------------------------------------------------------------------- #
# Seat lock
# --------------------------------------------------------------------------- #

@api.route("/seat/lock", methods=["POST"])
@login_required
def lock_seat():
    data = request.get_json(silent=True) or {}
    seat_id = data.get("seat_id")
    event_id = data.get("event_id")

    if not seat_id or not event_id:
        return jsonify({"error": "seat_id and event_id are required."}), 400

    seat = Seat.query.filter_by(id=seat_id, event_id=event_id).first()
    if not seat:
        return jsonify({"error": "Seat not found."}), 404

    now = datetime.now(timezone.utc)
    # Check if existing lock has expired
    if seat.status == "LOCKED":
        active_lock = (
            SeatLock.query
            .filter_by(seat_id=seat.id, is_released=False)
            .order_by(SeatLock.id.desc())
            .first()
        )
        if active_lock and _is_expired(active_lock.expires_at, now):
            active_lock.is_released = True
            seat.status = "AVAILABLE"
            db.session.commit()

    if seat.status != "AVAILABLE":
        return jsonify({"error": "Sorry! This seat has already been booked. Please select another seat."}), 409

    lock_duration = current_app.config.get("SEAT_LOCK_DURATION", 600)

    seat.status = "LOCKED"
    lock = SeatLock(
        seat_id=seat.id,
        user_id=current_user.id,
        locked_at=now,
        expires_at=now + timedelta(seconds=lock_duration),
    )
    db.session.add(lock)
    db.session.commit()

    return jsonify({
        "success": True,
        "seat_id": seat.id,
        "expires_at": lock.expires_at.isoformat(),
    })


# --------------------------------------------------------------------------- #
# Seat unlock
# --------------------------------------------------------------------------- #

@api.route("/seat/unlock", methods=["POST"])
@login_required
def unlock_seat():
    data = request.get_json(silent=True) or {}
    seat_id = data.get("seat_id")

    if not seat_id:
        return jsonify({"error": "seat_id is required."}), 400

    seat = Seat.query.get(seat_id)
    if not seat:
        return jsonify({"error": "Seat not found."}), 404

    # Only the user who locked the seat (or an admin) may unlock it
    active_lock = (
        SeatLock.query
        .filter_by(seat_id=seat.id, user_id=current_user.id, is_released=False)
        .first()
    )
    if not active_lock and not current_user.is_admin:
        return jsonify({"error": "You do not hold a lock on this seat."}), 403

    if active_lock:
        active_lock.is_released = True

    seat.status = "AVAILABLE"
    db.session.commit()

    return jsonify({"success": True, "seat_id": seat.id})


# --------------------------------------------------------------------------- #
# Unread notification count
# --------------------------------------------------------------------------- #

@api.route("/notifications/unread")
@login_required
def unread_notifications():
    count = Notification.query.filter_by(
        user_id=current_user.id, is_read=False
    ).count()
    return jsonify({"unread_count": count})


# --------------------------------------------------------------------------- #
# Ticket verification
# --------------------------------------------------------------------------- #

@api.route("/ticket/verify", methods=["POST"])
def verify_ticket():
    data = request.get_json(silent=True) or {}
    qr_token = data.get("qr_token", "").strip()

    if not qr_token:
        return jsonify({"valid": False, "message": "No QR token provided."}), 400

    scanned_by = current_user.id if current_user.is_authenticated else None

    result = ticket_service.verify_ticket(
        qr_token=qr_token,
        scanned_by=scanned_by,
    )
    return jsonify(result)

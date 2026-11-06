"""Customer dashboard routes – bookings, tickets, notifications."""

from functools import wraps

from flask import (
    Blueprint, render_template, redirect, url_for, flash, request,
    jsonify, send_file, abort, current_app,
)
from flask_login import login_required, current_user
from sqlalchemy import func

from app.extensions import db
from app.models import Booking, DigitalTicket, Notification

customer = Blueprint("customer", __name__, url_prefix="/dashboard")


# --------------------------------------------------------------------------- #
# Role decorator
# --------------------------------------------------------------------------- #

def role_required(*roles):
    """Restrict access to users whose role is in *roles*."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if current_user.role not in roles:
                abort(403)
            return f(*args, **kwargs)
        return decorated_function
    return decorator


# --------------------------------------------------------------------------- #
# Dashboard home
# --------------------------------------------------------------------------- #

@customer.route("/")
@login_required
@role_required("CUSTOMER")
def dashboard():
    from datetime import date

    upcoming_count = (
        Booking.query
        .filter_by(user_id=current_user.id, status="CONFIRMED")
        .filter(Booking.visit_date >= date.today())
        .count()
    )
    past_count = (
        Booking.query
        .filter_by(user_id=current_user.id, status="CONFIRMED")
        .filter(Booking.visit_date < date.today())
        .count()
    )
    total_spent = (
        db.session.query(func.coalesce(func.sum(Booking.grand_total), 0))
        .filter(Booking.user_id == current_user.id, Booking.status == "CONFIRMED")
        .scalar()
    )

    recent_bookings = (
        Booking.query
        .filter_by(user_id=current_user.id)
        .order_by(Booking.created_at.desc())
        .limit(5)
        .all()
    )

    return render_template(
        "customer/dashboard.html",
        upcoming_count=upcoming_count,
        past_count=past_count,
        total_spent=total_spent,
        recent_bookings=recent_bookings,
    )


# --------------------------------------------------------------------------- #
# All bookings
# --------------------------------------------------------------------------- #

@customer.route("/bookings")
@login_required
@role_required("CUSTOMER")
def bookings():
    status_filter = request.args.get("status", "", type=str).strip().upper()
    page = request.args.get("page", 1, type=int)

    query = Booking.query.filter_by(user_id=current_user.id)
    if status_filter and status_filter in ("PENDING", "CONFIRMED", "CANCELLED", "REFUNDED", "EXPIRED"):
        query = query.filter_by(status=status_filter)

    pagination = query.order_by(Booking.created_at.desc()).paginate(
        page=page, per_page=10, error_out=False
    )

    return render_template(
        "customer/bookings.html",
        bookings=pagination,
        filter=status_filter,
    )


# --------------------------------------------------------------------------- #
# Digital tickets
# --------------------------------------------------------------------------- #

@customer.route("/tickets")
@login_required
@role_required("CUSTOMER")
def tickets():
    page = request.args.get("page", 1, type=int)
    pagination = (
        DigitalTicket.query
        .join(Booking)
        .filter(Booking.user_id == current_user.id)
        .order_by(DigitalTicket.created_at.desc())
        .paginate(page=page, per_page=12, error_out=False)
    )

    return render_template("customer/tickets.html", tickets=pagination)


# --------------------------------------------------------------------------- #
# Download ticket PDF
# --------------------------------------------------------------------------- #

@customer.route("/tickets/<uid>/download")
@login_required
@role_required("CUSTOMER")
def download_ticket(uid):
    import os
    from app.services import ticket_service

    ticket = DigitalTicket.query.filter_by(ticket_uid=uid).first_or_404()
    # Verify ownership
    bk = db.session.get(Booking, ticket.booking_id)
    if not bk or (bk.user_id != current_user.id and not current_user.is_admin):
        abort(403)

    pdf_full = ticket_service.get_ticket_pdf_path(ticket.ticket_uid)
    if not pdf_full or not os.path.isfile(pdf_full):
        if ticket.pdf_path:
            alt = os.path.join(current_app.root_path, "static", ticket.pdf_path)
            if os.path.isfile(alt):
                pdf_full = alt

    # If still not found, generate it on the fly
    if not pdf_full or not os.path.isfile(pdf_full):
        ticket_service._generate_pdf_ticket(ticket)
        pdf_full = ticket_service.get_ticket_pdf_path(ticket.ticket_uid)

    if not pdf_full or not os.path.isfile(pdf_full):
        flash("Ticket file not found.", "danger")
        return redirect(url_for("customer.tickets"))

    return send_file(
        pdf_full,
        mimetype="application/pdf",
        as_attachment=True,
        download_name=f"ticket_{ticket.ticket_uid}.pdf",
    )


# --------------------------------------------------------------------------- #
# Notifications
# --------------------------------------------------------------------------- #

@customer.route("/notifications")
@login_required
@role_required("CUSTOMER")
def notifications():
    page = request.args.get("page", 1, type=int)
    pagination = (
        Notification.query
        .filter_by(user_id=current_user.id)
        .order_by(Notification.created_at.desc())
        .paginate(page=page, per_page=20, error_out=False)
    )

    return render_template("customer/notifications.html", notifications=pagination)


# --------------------------------------------------------------------------- #
# Mark notification as read (AJAX)
# --------------------------------------------------------------------------- #

@customer.route("/notifications/<int:id>/read", methods=["POST"])
@login_required
@role_required("CUSTOMER")
def mark_notification_read(id):
    notif = Notification.query.get_or_404(id)
    if notif.user_id != current_user.id:
        return jsonify({"error": "Forbidden"}), 403

    notif.is_read = True
    db.session.commit()

    return jsonify({"success": True, "id": notif.id})

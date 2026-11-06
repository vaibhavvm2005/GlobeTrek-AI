"""Organizer routes – event management, bookings, revenue, ticket verification."""

import json
from functools import wraps
from datetime import date

from flask import (
    Blueprint, render_template, redirect, url_for, flash, request,
    jsonify, abort, current_app,
)
from flask_login import login_required, current_user
from sqlalchemy import func

from app.extensions import db
from app.models import (
    Event, TicketType, Booking, BookingItem, Payment, Category, Venue,
)
from app.services import ticket_service

organizer = Blueprint("organizer", __name__, url_prefix="/organizer")


# --------------------------------------------------------------------------- #
# Role decorator
# --------------------------------------------------------------------------- #

def role_required(*roles):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if current_user.role not in roles:
                abort(403)
            return f(*args, **kwargs)
        return decorated_function
    return decorator


# --------------------------------------------------------------------------- #
# Dashboard
# --------------------------------------------------------------------------- #

@organizer.route("/dashboard")
@login_required
@role_required("ORGANIZER")
def dashboard():
    my_events = Event.query.filter_by(organizer_id=current_user.id)
    event_ids = [e.id for e in my_events.all()]

    total_events = my_events.count()

    total_bookings = (
        Booking.query
        .filter(Booking.event_id.in_(event_ids), Booking.status == "CONFIRMED")
        .count()
    ) if event_ids else 0

    total_revenue = (
        db.session.query(func.coalesce(func.sum(Booking.grand_total), 0))
        .filter(Booking.event_id.in_(event_ids), Booking.status == "CONFIRMED")
        .scalar()
    ) if event_ids else 0

    recent_bookings = (
        Booking.query
        .filter(Booking.event_id.in_(event_ids))
        .order_by(Booking.created_at.desc())
        .limit(10)
        .all()
    ) if event_ids else []

    return render_template(
        "organizer/dashboard.html",
        total_events=total_events,
        total_bookings=total_bookings,
        total_revenue=total_revenue,
        recent_bookings=recent_bookings,
    )


# --------------------------------------------------------------------------- #
# List organizer's events
# --------------------------------------------------------------------------- #

@organizer.route("/events")
@login_required
@role_required("ORGANIZER")
def events():
    page = request.args.get("page", 1, type=int)
    pagination = (
        Event.query
        .filter_by(organizer_id=current_user.id)
        .order_by(Event.created_at.desc())
        .paginate(page=page, per_page=10, error_out=False)
    )
    return render_template("organizer/events.html", events=pagination)


# --------------------------------------------------------------------------- #
# Create event
# --------------------------------------------------------------------------- #

@organizer.route("/events/create", methods=["GET", "POST"])
@login_required
@role_required("ORGANIZER")
def create_event():
    categories = Category.query.filter_by(is_active=True).all()
    venues = Venue.query.filter_by(is_active=True).all()

    if request.method == "POST":
        title = request.form.get("title", "").strip()
        description = request.form.get("description", "").strip()
        image = request.form.get("image", "").strip()
        category_id = request.form.get("category_id", None, type=int)
        venue_id = request.form.get("venue_id", None, type=int)
        venue_name = request.form.get("venue_name", "").strip()
        venue_address = request.form.get("venue_address", "").strip()
        city = request.form.get("city", "").strip()
        country = request.form.get("country", "").strip()
        latitude = request.form.get("latitude", 0.0, type=float)
        longitude = request.form.get("longitude", 0.0, type=float)
        event_date_str = request.form.get("event_date", "")
        start_time = request.form.get("start_time", "18:00")
        end_time = request.form.get("end_time", "21:00")
        cancellation_policy = request.form.get(
            "cancellation_policy", "Full refund up to 48 hours before the event."
        )

        if not title or not description or not event_date_str or not city or not country:
            flash("Title, description, date, city, and country are required.", "danger")
            return render_template(
                "organizer/create_event.html",
                categories=categories, venues=venues,
            )

        try:
            event_date = date.fromisoformat(event_date_str)
        except ValueError:
            flash("Invalid date format.", "danger")
            return render_template(
                "organizer/create_event.html",
                categories=categories, venues=venues,
            )

        # Generate slug
        import re
        slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
        # Ensure uniqueness
        existing = Event.query.filter_by(slug=slug).first()
        if existing:
            import uuid
            slug = f"{slug}-{uuid.uuid4().hex[:6]}"

        event = Event(
            title=title,
            slug=slug,
            description=description,
            image=image,
            category_id=category_id,
            organizer_id=current_user.id,
            venue_id=venue_id,
            venue_name=venue_name,
            venue_address=venue_address,
            city=city,
            country=country,
            latitude=latitude,
            longitude=longitude,
            event_date=event_date,
            start_time=start_time,
            end_time=end_time,
            cancellation_policy=cancellation_policy,
            is_published=True,
            is_approved=False,
        )
        db.session.add(event)
        db.session.flush()  # get event.id

        # Create ticket types from form
        tt_names = request.form.getlist("tt_name")
        tt_prices = request.form.getlist("tt_price")
        tt_quantities = request.form.getlist("tt_quantity")
        tt_descriptions = request.form.getlist("tt_description")

        for i in range(len(tt_names)):
            if tt_names[i].strip():
                tt = TicketType(
                    event_id=event.id,
                    name=tt_names[i].strip(),
                    price=float(tt_prices[i]) if i < len(tt_prices) else 0.0,
                    quantity_total=int(tt_quantities[i]) if i < len(tt_quantities) else 100,
                    description=tt_descriptions[i].strip() if i < len(tt_descriptions) else "",
                )
                db.session.add(tt)

        db.session.commit()

        flash("Event created successfully! It will be visible after admin approval.", "success")
        return redirect(url_for("organizer.events"))

    return render_template(
        "organizer/create_event.html",
        categories=categories,
        venues=venues,
    )


# --------------------------------------------------------------------------- #
# Edit event
# --------------------------------------------------------------------------- #

@organizer.route("/events/<int:id>/edit", methods=["GET", "POST"])
@login_required
@role_required("ORGANIZER")
def edit_event(id):
    event = Event.query.get_or_404(id)
    if event.organizer_id != current_user.id:
        abort(403)

    categories = Category.query.filter_by(is_active=True).all()
    venues = Venue.query.filter_by(is_active=True).all()

    if request.method == "POST":
        event.title = request.form.get("title", event.title).strip()
        event.description = request.form.get("description", event.description).strip()
        event.image = request.form.get("image", event.image).strip()
        event.category_id = request.form.get("category_id", event.category_id, type=int)
        event.venue_id = request.form.get("venue_id", event.venue_id, type=int)
        event.venue_name = request.form.get("venue_name", event.venue_name).strip()
        event.venue_address = request.form.get("venue_address", event.venue_address).strip()
        event.city = request.form.get("city", event.city).strip()
        event.country = request.form.get("country", event.country).strip()
        event.latitude = request.form.get("latitude", event.latitude, type=float)
        event.longitude = request.form.get("longitude", event.longitude, type=float)
        event.start_time = request.form.get("start_time", event.start_time)
        event.end_time = request.form.get("end_time", event.end_time)
        event.cancellation_policy = request.form.get(
            "cancellation_policy", event.cancellation_policy
        )

        event_date_str = request.form.get("event_date", "")
        if event_date_str:
            try:
                event.event_date = date.fromisoformat(event_date_str)
            except ValueError:
                flash("Invalid date format.", "danger")
                return render_template(
                    "organizer/edit_event.html",
                    event=event, categories=categories, venues=venues,
                )

        db.session.commit()
        flash("Event updated successfully.", "success")
        return redirect(url_for("organizer.events"))

    return render_template(
        "organizer/edit_event.html",
        event=event,
        categories=categories,
        venues=venues,
    )


# --------------------------------------------------------------------------- #
# Bookings for organizer's events
# --------------------------------------------------------------------------- #

@organizer.route("/bookings")
@login_required
@role_required("ORGANIZER")
def bookings():
    page = request.args.get("page", 1, type=int)
    event_ids = [
        e.id for e in Event.query.filter_by(organizer_id=current_user.id).all()
    ]

    if event_ids:
        pagination = (
            Booking.query
            .filter(Booking.event_id.in_(event_ids))
            .order_by(Booking.created_at.desc())
            .paginate(page=page, per_page=15, error_out=False)
        )
    else:
        pagination = Booking.query.filter_by(id=-1).paginate(
            page=1, per_page=15, error_out=False
        )

    return render_template("organizer/bookings.html", bookings=pagination)


# --------------------------------------------------------------------------- #
# Revenue analytics
# --------------------------------------------------------------------------- #

@organizer.route("/revenue")
@login_required
@role_required("ORGANIZER")
def revenue():
    event_ids = [
        e.id for e in Event.query.filter_by(organizer_id=current_user.id).all()
    ]

    revenue_by_event = []
    if event_ids:
        rows = (
            db.session.query(
                Event.title,
                func.count(Booking.id).label("booking_count"),
                func.coalesce(func.sum(Booking.grand_total), 0).label("revenue"),
            )
            .join(Booking, Booking.event_id == Event.id)
            .filter(Event.id.in_(event_ids), Booking.status == "CONFIRMED")
            .group_by(Event.id, Event.title)
            .all()
        )
        revenue_by_event = [
            {"title": r.title, "booking_count": r.booking_count, "revenue": float(r.revenue)}
            for r in rows
        ]

    total_revenue = sum(r["revenue"] for r in revenue_by_event)
    total_bookings = sum(r["booking_count"] for r in revenue_by_event)

    return render_template(
        "organizer/revenue.html",
        revenue_by_event=revenue_by_event,
        total_revenue=total_revenue,
        total_bookings=total_bookings,
    )


# --------------------------------------------------------------------------- #
# QR ticket verification
# --------------------------------------------------------------------------- #

@organizer.route("/verify", methods=["GET", "POST"])
@login_required
@role_required("ORGANIZER")
def verify_ticket():
    if request.method == "POST":
        qr_token = request.form.get("qr_token", "").strip()
        if not qr_token:
            return jsonify({"valid": False, "message": "No QR token provided."})

        result = ticket_service.verify_ticket(
            qr_token=qr_token,
            scanned_by=current_user.id,
        )
        return jsonify(result)

    return render_template("organizer/verify_ticket.html")

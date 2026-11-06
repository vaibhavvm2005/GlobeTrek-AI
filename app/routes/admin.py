"""Admin routes – dashboard, user/event/destination/booking/payment management."""

import re
import uuid
from functools import wraps

from flask import (
    Blueprint, render_template, redirect, url_for, flash, request, abort, current_app,
)
from flask_login import login_required, current_user
from sqlalchemy import func

from app.extensions import db
from app.models import (
    User, Category, Destination, Event, TicketType, Booking, Payment, Review,
)

admin = Blueprint("admin", __name__, url_prefix="/admin")


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
# Admin dashboard
# --------------------------------------------------------------------------- #

@admin.route("/dashboard")
@login_required
@role_required("ADMIN")
def dashboard():
    total_users = User.query.count()
    total_events = Event.query.count()
    total_destinations = Destination.query.count()
    total_bookings = Booking.query.count()
    total_revenue = (
        db.session.query(func.coalesce(func.sum(Booking.grand_total), 0))
        .filter(Booking.status == "CONFIRMED")
        .scalar()
    )
    pending_approvals = Event.query.filter_by(is_approved=False, is_published=True).count()
    active_users = User.query.filter_by(is_active=True).count()

    recent_bookings = (
        Booking.query.order_by(Booking.created_at.desc()).limit(10).all()
    )

    return render_template(
        "admin/dashboard.html",
        total_users=total_users,
        total_events=total_events,
        total_destinations=total_destinations,
        total_bookings=total_bookings,
        total_revenue=total_revenue,
        pending_approvals=pending_approvals,
        active_users=active_users,
        recent_bookings=recent_bookings,
    )


# --------------------------------------------------------------------------- #
# User management
# --------------------------------------------------------------------------- #

@admin.route("/users")
@login_required
@role_required("ADMIN")
def users():
    page = request.args.get("page", 1, type=int)
    q = request.args.get("q", "", type=str).strip()
    role_filter = request.args.get("role", "", type=str).strip().upper()

    query = User.query
    if q:
        query = query.filter(
            (User.username.ilike(f"%{q}%"))
            | (User.email.ilike(f"%{q}%"))
            | (User.full_name.ilike(f"%{q}%"))
        )
    if role_filter and role_filter in ("CUSTOMER", "ORGANIZER", "ADMIN"):
        query = query.filter_by(role=role_filter)

    pagination = query.order_by(User.created_at.desc()).paginate(
        page=page, per_page=20, error_out=False
    )

    return render_template("admin/users.html", users=pagination, q=q, role_filter=role_filter)


@admin.route("/users/<int:id>/toggle", methods=["POST"])
@login_required
@role_required("ADMIN")
def toggle_user(id):
    user = User.query.get_or_404(id)
    if user.id == current_user.id:
        flash("You cannot deactivate your own account.", "warning")
        return redirect(url_for("admin.users"))

    user.is_active = not user.is_active
    db.session.commit()
    status = "activated" if user.is_active else "deactivated"
    flash(f"User {user.username} has been {status}.", "success")
    return redirect(url_for("admin.users"))


# --------------------------------------------------------------------------- #
# Destination management
# --------------------------------------------------------------------------- #

@admin.route("/destinations")
@login_required
@role_required("ADMIN")
def destinations():
    page = request.args.get("page", 1, type=int)
    pagination = (
        Destination.query
        .order_by(Destination.created_at.desc())
        .paginate(page=page, per_page=15, error_out=False)
    )
    return render_template("admin/destinations.html", destinations=pagination)


@admin.route("/destinations/create", methods=["GET", "POST"])
@login_required
@role_required("ADMIN")
def create_destination():
    categories = Category.query.filter_by(is_active=True).all()

    if request.method == "POST":
        name = request.form.get("name", "").strip()
        description = request.form.get("description", "").strip()
        country = request.form.get("country", "").strip()
        state = request.form.get("state", "").strip()
        city = request.form.get("city", "").strip()
        address = request.form.get("address", "").strip()
        latitude = request.form.get("latitude", 0.0, type=float)
        longitude = request.form.get("longitude", 0.0, type=float)
        category_id = request.form.get("category_id", None, type=int)
        images = request.form.get("images", "[]").strip()
        opening_hours = request.form.get("opening_hours", "09:00 – 17:00").strip()
        ticket_price = request.form.get("ticket_price", 0.0, type=float)
        capacity = request.form.get("capacity", 500, type=int)
        is_featured = bool(request.form.get("is_featured"))

        if not name or not description or not country or not city:
            flash("Name, description, country, and city are required.", "danger")
            return render_template(
                "admin/create_destination.html", categories=categories
            )

        slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
        if Destination.query.filter_by(slug=slug).first():
            slug = f"{slug}-{uuid.uuid4().hex[:6]}"

        dest = Destination(
            name=name,
            slug=slug,
            description=description,
            country=country,
            state=state,
            city=city,
            address=address,
            latitude=latitude,
            longitude=longitude,
            category_id=category_id,
            images=images,
            opening_hours=opening_hours,
            ticket_price=ticket_price,
            capacity=capacity,
            is_featured=is_featured,
        )
        db.session.add(dest)
        db.session.flush()

        # Create ticket types
        tt_names = request.form.getlist("tt_name")
        tt_prices = request.form.getlist("tt_price")
        tt_quantities = request.form.getlist("tt_quantity")
        tt_descriptions = request.form.getlist("tt_description")

        for i in range(len(tt_names)):
            if tt_names[i].strip():
                tt = TicketType(
                    destination_id=dest.id,
                    name=tt_names[i].strip(),
                    price=float(tt_prices[i]) if i < len(tt_prices) else 0.0,
                    quantity_total=int(tt_quantities[i]) if i < len(tt_quantities) else 100,
                    description=tt_descriptions[i].strip() if i < len(tt_descriptions) else "",
                )
                db.session.add(tt)

        db.session.commit()
        flash("Destination created successfully.", "success")
        return redirect(url_for("admin.destinations"))

    return render_template("admin/create_destination.html", categories=categories)


@admin.route("/destinations/<int:id>/edit", methods=["GET", "POST"])
@login_required
@role_required("ADMIN")
def edit_destination(id):
    dest = Destination.query.get_or_404(id)
    categories = Category.query.filter_by(is_active=True).all()

    if request.method == "POST":
        dest.name = request.form.get("name", dest.name).strip()
        dest.description = request.form.get("description", dest.description).strip()
        dest.country = request.form.get("country", dest.country).strip()
        dest.state = request.form.get("state", dest.state).strip()
        dest.city = request.form.get("city", dest.city).strip()
        dest.address = request.form.get("address", dest.address).strip()
        dest.latitude = request.form.get("latitude", dest.latitude, type=float)
        dest.longitude = request.form.get("longitude", dest.longitude, type=float)
        dest.category_id = request.form.get("category_id", dest.category_id, type=int)
        dest.images = request.form.get("images", dest.images).strip()
        dest.opening_hours = request.form.get("opening_hours", dest.opening_hours).strip()
        dest.ticket_price = request.form.get("ticket_price", dest.ticket_price, type=float)
        dest.capacity = request.form.get("capacity", dest.capacity, type=int)
        dest.is_featured = bool(request.form.get("is_featured"))
        dest.is_active = bool(request.form.get("is_active", True))

        db.session.commit()
        flash("Destination updated successfully.", "success")
        return redirect(url_for("admin.destinations"))

    return render_template(
        "admin/edit_destination.html", destination=dest, categories=categories
    )


# --------------------------------------------------------------------------- #
# Event management (approve / reject)
# --------------------------------------------------------------------------- #

@admin.route("/events")
@login_required
@role_required("ADMIN")
def events():
    page = request.args.get("page", 1, type=int)
    status_filter = request.args.get("status", "", type=str).strip()

    query = Event.query
    if status_filter == "pending":
        query = query.filter_by(is_approved=False, is_published=True)
    elif status_filter == "approved":
        query = query.filter_by(is_approved=True)

    pagination = query.order_by(Event.created_at.desc()).paginate(
        page=page, per_page=15, error_out=False
    )

    return render_template(
        "admin/events.html", events=pagination, status_filter=status_filter
    )


@admin.route("/events/<int:id>/approve", methods=["POST"])
@login_required
@role_required("ADMIN")
def approve_event(id):
    event = Event.query.get_or_404(id)
    event.is_approved = True
    db.session.commit()
    flash(f'Event "{event.title}" has been approved.', "success")
    return redirect(url_for("admin.events"))


# --------------------------------------------------------------------------- #
# Bookings
# --------------------------------------------------------------------------- #

@admin.route("/bookings")
@login_required
@role_required("ADMIN")
def bookings():
    page = request.args.get("page", 1, type=int)
    status_filter = request.args.get("status", "", type=str).strip().upper()

    query = Booking.query
    if status_filter and status_filter in ("PENDING", "CONFIRMED", "CANCELLED", "REFUNDED", "EXPIRED"):
        query = query.filter_by(status=status_filter)

    pagination = query.order_by(Booking.created_at.desc()).paginate(
        page=page, per_page=20, error_out=False
    )

    return render_template(
        "admin/bookings.html", bookings=pagination, status_filter=status_filter
    )


# --------------------------------------------------------------------------- #
# Payment ledger
# --------------------------------------------------------------------------- #

@admin.route("/payments")
@login_required
@role_required("ADMIN")
def payments():
    page = request.args.get("page", 1, type=int)
    pagination = (
        Payment.query
        .order_by(Payment.created_at.desc())
        .paginate(page=page, per_page=20, error_out=False)
    )
    return render_template("admin/payments.html", payments=pagination)


# --------------------------------------------------------------------------- #
# Revenue analytics
# --------------------------------------------------------------------------- #

@admin.route("/analytics")
@login_required
@role_required("ADMIN")
def analytics():
    total_revenue = (
        db.session.query(func.coalesce(func.sum(Booking.grand_total), 0))
        .filter(Booking.status == "CONFIRMED")
        .scalar()
    )
    total_bookings = Booking.query.filter_by(status="CONFIRMED").count()

    # Revenue by month (dialect-agnostic for both SQLite and MySQL)
    is_mysql = False
    try:
        is_mysql = db.engine.dialect.name == "mysql"
    except Exception:
        pass

    if is_mysql:
        month_expr = func.date_format(Booking.created_at, "%Y-%m")
    else:
        month_expr = func.strftime("%Y-%m", Booking.created_at)

    monthly_revenue = (
        db.session.query(
            month_expr.label("month"),
            func.sum(Booking.grand_total).label("revenue"),
            func.count(Booking.id).label("count"),
        )
        .filter(Booking.status == "CONFIRMED")
        .group_by(month_expr)
        .order_by(month_expr.desc())
        .limit(12)
        .all()
    )
    monthly_revenue = [
        {"month": str(r.month), "revenue": float(r.revenue or 0), "count": r.count}
        for r in monthly_revenue
    ]

    # Revenue by category (includes experiences, events, and destinations)
    cat_rev_map = {}
    confirmed_bookings = Booking.query.filter_by(status="CONFIRMED").all()
    for b in confirmed_bookings:
        cat_name = "General"
        if b.experience and b.experience.category:
            cat_name = b.experience.category.name
        elif b.event and b.event.category:
            cat_name = b.event.category.name
        elif b.destination and b.destination.category:
            cat_name = b.destination.category.name
        cat_rev_map[cat_name] = cat_rev_map.get(cat_name, 0.0) + (b.grand_total or 0.0)

    category_revenue = [
        {"category": cat, "revenue": float(rev)}
        for cat, rev in cat_rev_map.items()
    ]

    return render_template(
        "admin/analytics.html",
        total_revenue=total_revenue,
        total_bookings=total_bookings,
        monthly_revenue=monthly_revenue,
        category_revenue=category_revenue,
    )


# --------------------------------------------------------------------------- #
# Review moderation
# --------------------------------------------------------------------------- #

@admin.route("/reviews")
@login_required
@role_required("ADMIN")
def reviews():
    page = request.args.get("page", 1, type=int)
    pagination = (
        Review.query
        .order_by(Review.created_at.desc())
        .paginate(page=page, per_page=20, error_out=False)
    )
    return render_template("admin/reviews.html", reviews=pagination)


@admin.route("/reviews/<int:id>/toggle", methods=["POST"])
@login_required
@role_required("ADMIN")
def toggle_review(id):
    review = Review.query.get_or_404(id)
    review.is_approved = not review.is_approved
    db.session.commit()
    status = "approved" if review.is_approved else "hidden"
    flash(f"Review #{review.id} has been {status}.", "success")
    return redirect(url_for("admin.reviews"))

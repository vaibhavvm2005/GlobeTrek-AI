"""Public-facing routes – homepage, destinations, events, search."""

from datetime import date

from flask import (
    Blueprint, render_template, request, current_app, redirect, url_for
)
from sqlalchemy import or_

from app.extensions import db
from app.models import Destination, Event, Category, Review, TicketType, Seat, Experience

main = Blueprint("main", __name__)

PER_PAGE = 12


# --------------------------------------------------------------------------- #
# Homepage
# --------------------------------------------------------------------------- #

@main.route("/")
def index():
    featured_destinations = (
        Destination.query
        .filter_by(is_active=True, is_featured=True)
        .order_by(Destination.rating.desc())
        .limit(6)
        .all()
    )

    upcoming_events = (
        Event.query
        .filter(Event.is_published.is_(True), Event.is_approved.is_(True),
                Event.event_date >= date.today())
        .order_by(Event.event_date.asc())
        .limit(6)
        .all()
    )

    trending_events = (
        Event.query
        .filter(Event.is_published.is_(True), Event.is_approved.is_(True),
                Event.is_featured.is_(True), Event.event_date >= date.today())
        .order_by(Event.event_date.asc())
        .limit(6)
        .all()
    )

    categories = Category.query.filter_by(is_active=True).all()

    return render_template(
        "main/index.html",
        destinations=featured_destinations,
        events=upcoming_events,
        trending_events=trending_events,
        categories=categories,
    )


# --------------------------------------------------------------------------- #
# Destination listing
# --------------------------------------------------------------------------- #

@main.route("/destinations")
def destinations():
    page = request.args.get("page", 1, type=int)
    q = request.args.get("q", "", type=str).strip()
    country = request.args.get("country", "", type=str).strip()
    city = request.args.get("city", "", type=str).strip()
    category = request.args.get("category", "", type=str).strip()
    min_price = request.args.get("min_price", None, type=float)
    max_price = request.args.get("max_price", None, type=float)
    sort = request.args.get("sort", "rating", type=str)

    query = Destination.query.filter_by(is_active=True)

    if q:
        query = query.filter(
            or_(
                Destination.name.ilike(f"%{q}%"),
                Destination.description.ilike(f"%{q}%"),
                Destination.city.ilike(f"%{q}%"),
                Destination.country.ilike(f"%{q}%"),
            )
        )
    if country:
        query = query.filter(Destination.country.ilike(f"%{country}%"))
    if city:
        query = query.filter(Destination.city.ilike(f"%{city}%"))
    if category:
        cat = Category.query.filter_by(slug=category).first()
        if cat:
            query = query.filter_by(category_id=cat.id)
    if min_price is not None:
        query = query.filter(Destination.ticket_price >= min_price)
    if max_price is not None:
        query = query.filter(Destination.ticket_price <= max_price)

    # Sorting
    sort_map = {
        "rating": Destination.rating.desc(),
        "price_low": Destination.ticket_price.asc(),
        "price_high": Destination.ticket_price.desc(),
        "name": Destination.name.asc(),
        "newest": Destination.created_at.desc(),
    }
    query = query.order_by(sort_map.get(sort, Destination.rating.desc()))

    pagination = query.paginate(page=page, per_page=PER_PAGE, error_out=False)

    # Distinct countries for filter sidebar
    countries = (
        db.session.query(Destination.country)
        .filter(Destination.is_active.is_(True))
        .distinct()
        .order_by(Destination.country)
        .all()
    )
    countries = [c[0] for c in countries]

    categories = Category.query.filter_by(is_active=True).all()

    filters = dict(q=q, country=country, city=city, category=category,
                   min_price=min_price, max_price=max_price, sort=sort)

    return render_template(
        "main/destinations.html",
        destinations=pagination,
        categories=categories,
        countries=countries,
        filters=filters,
    )


# --------------------------------------------------------------------------- #
# Destination detail
# --------------------------------------------------------------------------- #

@main.route("/destinations/<int:id>")
def destination_detail(id):
    destination = Destination.query.get_or_404(id)
    ticket_types = (
        TicketType.query
        .filter_by(destination_id=destination.id, is_active=True)
        .all()
    )
    reviews = (
        Review.query
        .filter_by(destination_id=destination.id, is_approved=True)
        .order_by(Review.created_at.desc())
        .all()
    )
    maps_key = current_app.config.get("GOOGLE_MAPS_API_KEY", "")

    return render_template(
        "main/destination_detail.html",
        destination=destination,
        ticket_types=ticket_types,
        reviews=reviews,
        maps_key=maps_key,
    )


# --------------------------------------------------------------------------- #
# Event listing
# --------------------------------------------------------------------------- #

@main.route("/events")
def events():
    page = request.args.get("page", 1, type=int)
    q = request.args.get("q", "", type=str).strip()
    country = request.args.get("country", "", type=str).strip()
    city = request.args.get("city", "", type=str).strip()
    category = request.args.get("category", "", type=str).strip()
    date_from = request.args.get("date_from", "", type=str).strip()
    date_to = request.args.get("date_to", "", type=str).strip()
    min_price = request.args.get("min_price", None, type=float)
    max_price = request.args.get("max_price", None, type=float)
    sort = request.args.get("sort", "date", type=str)

    query = Event.query.filter(
        Event.is_published.is_(True),
        Event.is_approved.is_(True),
    )

    if q:
        query = query.filter(
            or_(
                Event.title.ilike(f"%{q}%"),
                Event.description.ilike(f"%{q}%"),
                Event.city.ilike(f"%{q}%"),
                Event.country.ilike(f"%{q}%"),
                Event.venue_name.ilike(f"%{q}%"),
            )
        )
    if country:
        query = query.filter(Event.country.ilike(f"%{country}%"))
    if city:
        query = query.filter(Event.city.ilike(f"%{city}%"))
    if category:
        cat = Category.query.filter_by(slug=category).first()
        if cat:
            query = query.filter_by(category_id=cat.id)
    if date_from:
        try:
            query = query.filter(Event.event_date >= date.fromisoformat(date_from))
        except ValueError:
            pass
    if date_to:
        try:
            query = query.filter(Event.event_date <= date.fromisoformat(date_to))
        except ValueError:
            pass
    if min_price is not None:
        query = query.join(TicketType, TicketType.event_id == Event.id).filter(
            TicketType.price >= min_price
        )
    if max_price is not None:
        query = query.join(TicketType, TicketType.event_id == Event.id).filter(
            TicketType.price <= max_price
        )

    sort_map = {
        "date": Event.event_date.asc(),
        "name": Event.title.asc(),
        "newest": Event.created_at.desc(),
    }
    query = query.order_by(sort_map.get(sort, Event.event_date.asc()))

    pagination = query.paginate(page=page, per_page=PER_PAGE, error_out=False)

    countries = (
        db.session.query(Event.country)
        .filter(Event.is_published.is_(True), Event.is_approved.is_(True))
        .distinct()
        .order_by(Event.country)
        .all()
    )
    countries = [c[0] for c in countries]

    categories = Category.query.filter_by(is_active=True).all()

    filters = dict(q=q, country=country, city=city, category=category,
                   date_from=date_from, date_to=date_to,
                   min_price=min_price, max_price=max_price, sort=sort)

    return render_template(
        "main/events.html",
        events=pagination,
        categories=categories,
        countries=countries,
        filters=filters,
    )


# --------------------------------------------------------------------------- #
# Event detail
# --------------------------------------------------------------------------- #

@main.route("/events/<int:id>")
def event_detail(id):
    event = Event.query.get_or_404(id)
    ticket_types = (
        TicketType.query
        .filter_by(event_id=event.id, is_active=True)
        .all()
    )

    available_seats = []
    if event.venue and event.venue.has_seating:
        available_seats = (
            Seat.query
            .filter_by(event_id=event.id, status="AVAILABLE", is_active=True)
            .order_by(Seat.section, Seat.row_label, Seat.seat_number)
            .all()
        )

    reviews = (
        Review.query
        .filter_by(event_id=event.id, is_approved=True)
        .order_by(Review.created_at.desc())
        .all()
    )
    maps_key = current_app.config.get("GOOGLE_MAPS_API_KEY", "")

    return render_template(
        "main/event_detail.html",
        event=event,
        ticket_types=ticket_types,
        available_seats=available_seats,
        reviews=reviews,
        maps_key=maps_key,
    )


# --------------------------------------------------------------------------- #
# Combined search
# --------------------------------------------------------------------------- #

@main.route("/search")
def search():
    q = request.args.get("q", "", type=str).strip()
    page = request.args.get("page", 1, type=int)

    dest_results = []
    event_results = []

    if q:
        dest_results = (
            Destination.query
            .filter(
                Destination.is_active.is_(True),
                or_(
                    Destination.name.ilike(f"%{q}%"),
                    Destination.description.ilike(f"%{q}%"),
                    Destination.city.ilike(f"%{q}%"),
                    Destination.country.ilike(f"%{q}%"),
                ),
            )
            .order_by(Destination.rating.desc())
            .limit(20)
            .all()
        )

        event_results = (
            Event.query
            .filter(
                Event.is_published.is_(True),
                Event.is_approved.is_(True),
                or_(
                    Event.title.ilike(f"%{q}%"),
                    Event.description.ilike(f"%{q}%"),
                    Event.city.ilike(f"%{q}%"),
                    Event.country.ilike(f"%{q}%"),
                    Event.venue_name.ilike(f"%{q}%"),
                ),
            )
            .order_by(Event.event_date.asc())
            .limit(20)
            .all()
        )

    return render_template(
        "main/search_results.html",
        q=q,
        destinations=dest_results,
        events=event_results,
    )


# --------------------------------------------------------------------------- #
# Dedicated Category listing
# --------------------------------------------------------------------------- #

@main.route("/categories")
def categories():
    return redirect(url_for("main.experiences"))


@main.route("/categories/<slug>")
@main.route("/category/<slug>")
def category_detail(slug):
    category = Category.query.filter_by(slug=slug).first_or_404()
    page = request.args.get("page", 1, type=int)
    q = request.args.get("q", "", type=str).strip()
    country = request.args.get("country", "", type=str).strip()
    city = request.args.get("city", "", type=str).strip()
    min_price = request.args.get("min_price", None, type=float)
    max_price = request.args.get("max_price", None, type=float)
    sort = request.args.get("sort", "rating", type=str)

    query = Experience.query.filter_by(category_id=category.id, is_active=True)

    if q:
        query = query.filter(
            or_(
                Experience.experience_name.ilike(f"%{q}%"),
                Experience.description.ilike(f"%{q}%"),
                Experience.city.ilike(f"%{q}%"),
                Experience.country.ilike(f"%{q}%"),
                Experience.location.ilike(f"%{q}%"),
            )
        )
    if country:
        query = query.filter(Experience.country.ilike(f"%{country}%"))
    if city:
        query = query.filter(Experience.city.ilike(f"%{city}%"))
    if min_price is not None:
        query = query.filter(Experience.ticket_price >= min_price)
    if max_price is not None:
        query = query.filter(Experience.ticket_price <= max_price)

    sort_map = {
        "rating": Experience.rating.desc(),
        "price_low": Experience.ticket_price.asc(),
        "price_high": Experience.ticket_price.desc(),
        "name": Experience.experience_name.asc(),
        "newest": Experience.created_at.desc(),
    }
    query = query.order_by(sort_map.get(sort, Experience.rating.desc()))

    pagination = query.paginate(page=page, per_page=12, error_out=False)

    all_categories = Category.query.filter_by(is_active=True).all()
    countries = (
        db.session.query(Experience.country)
        .filter(Experience.category_id == category.id, Experience.is_active.is_(True))
        .distinct()
        .order_by(Experience.country)
        .all()
    )
    countries = [c[0] for c in countries]

    filters = dict(q=q, country=country, city=city, min_price=min_price, max_price=max_price, sort=sort)

    return render_template(
        "main/category_detail.html",
        category=category,
        experiences=pagination,
        all_categories=all_categories,
        countries=countries,
        filters=filters,
    )


# --------------------------------------------------------------------------- #
# All Experiences listing ("View All" page)
# --------------------------------------------------------------------------- #

@main.route("/experiences")
def experiences():
    page = request.args.get("page", 1, type=int)
    q = request.args.get("q", "", type=str).strip()
    category = request.args.get("category", "", type=str).strip()
    country = request.args.get("country", "", type=str).strip()
    city = request.args.get("city", "", type=str).strip()
    min_price = request.args.get("min_price", None, type=float)
    max_price = request.args.get("max_price", None, type=float)
    date_from = request.args.get("date_from", "", type=str).strip()
    date_to = request.args.get("date_to", "", type=str).strip()
    sort = request.args.get("sort", "rating", type=str)

    query = Experience.query.filter_by(is_active=True)

    if q:
        query = query.filter(
            or_(
                Experience.experience_name.ilike(f"%{q}%"),
                Experience.description.ilike(f"%{q}%"),
                Experience.city.ilike(f"%{q}%"),
                Experience.country.ilike(f"%{q}%"),
                Experience.location.ilike(f"%{q}%"),
            )
        )
    if category:
        cat = Category.query.filter_by(slug=category).first()
        if cat:
            query = query.filter_by(category_id=cat.id)
    if country:
        query = query.filter(Experience.country.ilike(f"%{country}%"))
    if city:
        query = query.filter(Experience.city.ilike(f"%{city}%"))
    if min_price is not None:
        query = query.filter(Experience.ticket_price >= min_price)
    if max_price is not None:
        query = query.filter(Experience.ticket_price <= max_price)
    if date_from:
        try:
            query = query.filter(Experience.event_date >= date.fromisoformat(date_from))
        except ValueError:
            pass
    if date_to:
        try:
            query = query.filter(Experience.event_date <= date.fromisoformat(date_to))
        except ValueError:
            pass

    sort_map = {
        "rating": Experience.rating.desc(),
        "price_low": Experience.ticket_price.asc(),
        "price_high": Experience.ticket_price.desc(),
        "name": Experience.experience_name.asc(),
        "newest": Experience.created_at.desc(),
    }
    query = query.order_by(sort_map.get(sort, Experience.rating.desc()))

    pagination = query.paginate(page=page, per_page=12, error_out=False)

    categories = Category.query.filter_by(is_active=True).all()
    countries = (
        db.session.query(Experience.country)
        .filter(Experience.is_active.is_(True))
        .distinct()
        .order_by(Experience.country)
        .all()
    )
    countries = [c[0] for c in countries]

    filters = dict(
        q=q, category=category, country=country, city=city,
        min_price=min_price, max_price=max_price,
        date_from=date_from, date_to=date_to, sort=sort,
    )

    return render_template(
        "main/experiences.html",
        experiences=pagination,
        categories=categories,
        countries=countries,
        filters=filters,
    )


# --------------------------------------------------------------------------- #
# Experience detail
# --------------------------------------------------------------------------- #

@main.route("/experiences/<int:id>")
def experience_detail(id):
    experience = Experience.query.get_or_404(id)
    ticket_types = TicketType.query.filter_by(experience_id=experience.id, is_active=True).all()
    if not ticket_types and experience.booking_enabled:
        tt = TicketType(
            experience_id=experience.id,
            name="General Admission Pass",
            price=experience.ticket_price,
            quantity_total=experience.availability,
            max_per_booking=10,
        )
        db.session.add(tt)
        db.session.commit()
        ticket_types = [tt]

    related = (
        Experience.query
        .filter(Experience.category_id == experience.category_id, Experience.id != experience.id, Experience.is_active.is_(True))
        .order_by(Experience.rating.desc())
        .limit(3)
        .all()
    )

    reviews = (
        Review.query
        .filter_by(experience_id=experience.id, is_approved=True)
        .order_by(Review.created_at.desc())
        .all()
    )

    maps_key = current_app.config.get("GOOGLE_MAPS_API_KEY", "")

    return render_template(
        "main/experience_detail.html",
        experience=experience,
        ticket_types=ticket_types,
        related=related,
        reviews=reviews,
        maps_key=maps_key,
    )

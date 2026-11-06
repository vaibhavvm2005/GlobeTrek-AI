"""GlobeTrek AI – SQLAlchemy ORM models.

All tables are defined in a single module to avoid circular-import issues.
Supports both MySQL and SQLite via SQLAlchemy's dialect abstraction.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash

from app.extensions import db, login_manager


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _uuid() -> str:
    return uuid.uuid4().hex


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# User
# ---------------------------------------------------------------------------

class User(UserMixin, db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    full_name = db.Column(db.String(150), nullable=False)
    phone = db.Column(db.String(20), default="")
    role = db.Column(db.String(20), nullable=False, default="CUSTOMER")  # CUSTOMER | ORGANIZER | ADMIN
    avatar = db.Column(db.String(500), default="")
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=_utcnow)
    updated_at = db.Column(db.DateTime, default=_utcnow, onupdate=_utcnow)

    # Relationships
    bookings = db.relationship("Booking", back_populates="user", lazy="dynamic")
    reviews = db.relationship("Review", back_populates="user", lazy="dynamic")
    notifications = db.relationship("Notification", back_populates="user", lazy="dynamic")
    organized_events = db.relationship("Event", back_populates="organizer", lazy="dynamic")

    def set_password(self, password: str):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    @property
    def is_admin(self) -> bool:
        return self.role == "ADMIN"

    @property
    def is_organizer(self) -> bool:
        return self.role == "ORGANIZER"

    @property
    def is_customer(self) -> bool:
        return self.role == "CUSTOMER"

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "username": self.username,
            "full_name": self.full_name,
            "phone": self.phone,
            "role": self.role,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, int(user_id))


# ---------------------------------------------------------------------------
# Category
# ---------------------------------------------------------------------------

class Category(db.Model):
    __tablename__ = "categories"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    slug = db.Column(db.String(100), unique=True, nullable=False)
    icon = db.Column(db.String(50), default="bi-tag")
    description = db.Column(db.Text, default="")
    category_type = db.Column(db.String(20), default="EVENT")  # EVENT | DESTINATION
    is_active = db.Column(db.Boolean, default=True)

    destinations = db.relationship("Destination", back_populates="category", lazy="dynamic")
    events = db.relationship("Event", back_populates="category", lazy="dynamic")
    experiences = db.relationship("Experience", back_populates="category", lazy="dynamic")


# ---------------------------------------------------------------------------
# Destination (Tourist Attraction)
# ---------------------------------------------------------------------------

class Destination(db.Model):
    __tablename__ = "destinations"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    slug = db.Column(db.String(200), unique=True, nullable=False)
    country = db.Column(db.String(100), nullable=False, index=True)
    state = db.Column(db.String(100), default="")
    city = db.Column(db.String(100), nullable=False, index=True)
    description = db.Column(db.Text, nullable=False)
    address = db.Column(db.String(500), default="")
    latitude = db.Column(db.Float, default=0.0)
    longitude = db.Column(db.Float, default=0.0)
    category_id = db.Column(db.Integer, db.ForeignKey("categories.id"), nullable=True)
    images = db.Column(db.Text, default="[]")  # JSON array of image URLs
    opening_hours = db.Column(db.String(255), default="09:00 – 17:00")
    ticket_price = db.Column(db.Float, default=0.0)
    capacity = db.Column(db.Integer, default=500)
    rating = db.Column(db.Float, default=4.0)
    review_count = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)
    is_featured = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=_utcnow)

    category = db.relationship("Category", back_populates="destinations")
    ticket_types = db.relationship("TicketType", back_populates="destination", lazy="dynamic",
                                   foreign_keys="TicketType.destination_id")
    reviews = db.relationship("Review", back_populates="destination", lazy="dynamic")

    def to_dict(self):
        import json
        return {
            "id": self.id, "name": self.name, "slug": self.slug,
            "country": self.country, "state": self.state, "city": self.city,
            "description": self.description, "address": self.address,
            "latitude": self.latitude, "longitude": self.longitude,
            "category": self.category.name if self.category else "",
            "images": json.loads(self.images) if self.images else [],
            "opening_hours": self.opening_hours,
            "ticket_price": self.ticket_price, "capacity": self.capacity,
            "rating": self.rating, "review_count": self.review_count,
            "is_featured": self.is_featured,
        }


# ---------------------------------------------------------------------------
# Experience (Unified Global Experience Listing)
# ---------------------------------------------------------------------------

class Experience(db.Model):
    __tablename__ = "experiences"

    id = db.Column(db.Integer, primary_key=True)
    experience_name = db.Column(db.String(255), nullable=False)
    slug = db.Column(db.String(255), unique=True, nullable=False, index=True)
    category_id = db.Column(db.Integer, db.ForeignKey("categories.id"), nullable=False, index=True)
    country = db.Column(db.String(100), nullable=False, index=True)
    city = db.Column(db.String(100), nullable=False, index=True)
    location = db.Column(db.String(500), default="")
    description = db.Column(db.Text, nullable=False)
    image_url = db.Column(db.String(1000), default="")
    gallery_images = db.Column(db.Text, default="[]")
    ticket_price = db.Column(db.Float, default=0.0)
    rating = db.Column(db.Float, default=4.8)
    review_count = db.Column(db.Integer, default=120)
    availability = db.Column(db.Integer, default=500)
    booking_enabled = db.Column(db.Boolean, default=True)
    is_featured = db.Column(db.Boolean, default=False)
    is_active = db.Column(db.Boolean, default=True)
    event_date = db.Column(db.Date, nullable=True)
    opening_hours = db.Column(db.String(255), default="09:00 – 18:00")
    created_at = db.Column(db.DateTime, default=_utcnow)

    category = db.relationship("Category", back_populates="experiences")
    ticket_types = db.relationship("TicketType", back_populates="experience", lazy="dynamic",
                                   foreign_keys="TicketType.experience_id")
    reviews = db.relationship("Review", back_populates="experience", lazy="dynamic")

    @property
    def experience_id(self) -> int:
        return self.id

    @property
    def name(self) -> str:
        return self.experience_name

    def to_dict(self):
        import json
        return {
            "id": self.id,
            "experience_id": self.id,
            "experience_name": self.experience_name,
            "name": self.experience_name,
            "slug": self.slug,
            "category": self.category.name if self.category else "",
            "category_slug": self.category.slug if self.category else "",
            "country": self.country,
            "city": self.city,
            "location": self.location,
            "description": self.description,
            "image_url": self.image_url,
            "gallery_images": json.loads(self.gallery_images) if self.gallery_images else [self.image_url],
            "ticket_price": self.ticket_price,
            "rating": self.rating,
            "review_count": self.review_count,
            "availability": self.availability,
            "booking_enabled": self.booking_enabled,
            "event_date": self.event_date.isoformat() if self.event_date else "",
            "opening_hours": self.opening_hours,
            "is_featured": self.is_featured,
        }


# ---------------------------------------------------------------------------
# Venue
# ---------------------------------------------------------------------------

class Venue(db.Model):
    __tablename__ = "venues"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    address = db.Column(db.String(500), default="")
    city = db.Column(db.String(100), nullable=False)
    country = db.Column(db.String(100), nullable=False)
    latitude = db.Column(db.Float, default=0.0)
    longitude = db.Column(db.Float, default=0.0)
    capacity = db.Column(db.Integer, default=1000)
    has_seating = db.Column(db.Boolean, default=False)
    seating_map = db.Column(db.Text, default="")  # JSON seating configuration
    is_active = db.Column(db.Boolean, default=True)

    events = db.relationship("Event", back_populates="venue", lazy="dynamic")


# ---------------------------------------------------------------------------
# Event
# ---------------------------------------------------------------------------

class Event(db.Model):
    __tablename__ = "events"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(300), nullable=False)
    slug = db.Column(db.String(300), unique=True, nullable=False)
    description = db.Column(db.Text, nullable=False)
    image = db.Column(db.String(500), default="")
    category_id = db.Column(db.Integer, db.ForeignKey("categories.id"), nullable=True)
    organizer_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    venue_id = db.Column(db.Integer, db.ForeignKey("venues.id"), nullable=True)
    venue_name = db.Column(db.String(200), default="")
    venue_address = db.Column(db.String(500), default="")
    city = db.Column(db.String(100), nullable=False, index=True)
    country = db.Column(db.String(100), nullable=False, index=True)
    latitude = db.Column(db.Float, default=0.0)
    longitude = db.Column(db.Float, default=0.0)
    event_date = db.Column(db.Date, nullable=False, index=True)
    start_time = db.Column(db.String(10), default="18:00")
    end_time = db.Column(db.String(10), default="21:00")
    booking_deadline = db.Column(db.DateTime, nullable=True)
    cancellation_policy = db.Column(db.Text, default="Full refund up to 48 hours before the event.")
    is_published = db.Column(db.Boolean, default=False)
    is_approved = db.Column(db.Boolean, default=False)
    is_featured = db.Column(db.Boolean, default=False)
    status = db.Column(db.String(20), default="UPCOMING")  # UPCOMING | ONGOING | COMPLETED | CANCELLED
    created_at = db.Column(db.DateTime, default=_utcnow)
    updated_at = db.Column(db.DateTime, default=_utcnow, onupdate=_utcnow)

    category = db.relationship("Category", back_populates="events")
    organizer = db.relationship("User", back_populates="organized_events")
    venue = db.relationship("Venue", back_populates="events")
    ticket_types = db.relationship("TicketType", back_populates="event", lazy="dynamic",
                                   foreign_keys="TicketType.event_id")
    seats = db.relationship("Seat", back_populates="event", lazy="dynamic")
    bookings = db.relationship("Booking", back_populates="event", lazy="dynamic")
    reviews = db.relationship("Review", back_populates="event", lazy="dynamic")

    def to_dict(self):
        return {
            "id": self.id, "title": self.title, "slug": self.slug,
            "description": self.description, "image": self.image,
            "category": self.category.name if self.category else "",
            "organizer": self.organizer.full_name if self.organizer else "",
            "venue_name": self.venue_name or (self.venue.name if self.venue else ""),
            "city": self.city, "country": self.country,
            "event_date": self.event_date.isoformat() if self.event_date else "",
            "start_time": self.start_time, "end_time": self.end_time,
            "is_featured": self.is_featured, "status": self.status,
            "cancellation_policy": self.cancellation_policy,
        }


# ---------------------------------------------------------------------------
# Ticket Type
# ---------------------------------------------------------------------------

class TicketType(db.Model):
    __tablename__ = "ticket_types"

    id = db.Column(db.Integer, primary_key=True)
    event_id = db.Column(db.Integer, db.ForeignKey("events.id"), nullable=True, index=True)
    destination_id = db.Column(db.Integer, db.ForeignKey("destinations.id"), nullable=True, index=True)
    experience_id = db.Column(db.Integer, db.ForeignKey("experiences.id"), nullable=True, index=True)
    name = db.Column(db.String(100), nullable=False)  # General, Premium, VIP, Student, Child, Adult
    price = db.Column(db.Float, nullable=False)
    quantity_total = db.Column(db.Integer, nullable=False, default=100)
    quantity_sold = db.Column(db.Integer, nullable=False, default=0)
    quantity_locked = db.Column(db.Integer, nullable=False, default=0)
    max_per_booking = db.Column(db.Integer, default=10)
    description = db.Column(db.String(500), default="")
    is_active = db.Column(db.Boolean, default=True)

    event = db.relationship("Event", back_populates="ticket_types", foreign_keys=[event_id])
    destination = db.relationship("Destination", back_populates="ticket_types", foreign_keys=[destination_id])
    experience = db.relationship("Experience", back_populates="ticket_types", foreign_keys=[experience_id])
    booking_items = db.relationship("BookingItem", back_populates="ticket_type", lazy="dynamic")

    @property
    def quantity_available(self) -> int:
        return max(0, self.quantity_total - self.quantity_sold - self.quantity_locked)

    def to_dict(self):
        return {
            "id": self.id, "name": self.name, "price": self.price,
            "quantity_total": self.quantity_total,
            "quantity_available": self.quantity_available,
            "max_per_booking": self.max_per_booking,
            "description": self.description,
        }


# ---------------------------------------------------------------------------
# Seat (for assigned-seating events)
# ---------------------------------------------------------------------------

class Seat(db.Model):
    __tablename__ = "seats"

    id = db.Column(db.Integer, primary_key=True)
    event_id = db.Column(db.Integer, db.ForeignKey("events.id"), nullable=False, index=True)
    ticket_type_id = db.Column(db.Integer, db.ForeignKey("ticket_types.id"), nullable=True)
    section = db.Column(db.String(50), default="")
    row_label = db.Column(db.String(10), nullable=False)
    seat_number = db.Column(db.String(10), nullable=False)
    status = db.Column(db.String(20), default="AVAILABLE")  # AVAILABLE | LOCKED | BOOKED
    is_active = db.Column(db.Boolean, default=True)

    event = db.relationship("Event", back_populates="seats")
    locks = db.relationship("SeatLock", back_populates="seat", lazy="dynamic")

    __table_args__ = (
        db.UniqueConstraint("event_id", "row_label", "seat_number", name="uq_event_seat"),
    )


# ---------------------------------------------------------------------------
# Seat Lock (temporary reservation)
# ---------------------------------------------------------------------------

class SeatLock(db.Model):
    __tablename__ = "seat_locks"

    id = db.Column(db.Integer, primary_key=True)
    seat_id = db.Column(db.Integer, db.ForeignKey("seats.id"), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    locked_at = db.Column(db.DateTime, default=_utcnow)
    expires_at = db.Column(db.DateTime, nullable=False)
    is_released = db.Column(db.Boolean, default=False)

    seat = db.relationship("Seat", back_populates="locks")
    user = db.relationship("User")


# ---------------------------------------------------------------------------
# Booking
# ---------------------------------------------------------------------------

class Booking(db.Model):
    __tablename__ = "bookings"

    id = db.Column(db.Integer, primary_key=True)
    booking_ref = db.Column(db.String(32), unique=True, nullable=False, default=_uuid, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    event_id = db.Column(db.Integer, db.ForeignKey("events.id"), nullable=True)
    destination_id = db.Column(db.Integer, db.ForeignKey("destinations.id"), nullable=True)
    experience_id = db.Column(db.Integer, db.ForeignKey("experiences.id"), nullable=True)
    status = db.Column(db.String(20), nullable=False, default="PENDING")
    # PENDING | CONFIRMED | CANCELLED | REFUNDED | EXPIRED
    total_amount = db.Column(db.Float, nullable=False, default=0.0)
    tax_amount = db.Column(db.Float, nullable=False, default=0.0)
    service_fee = db.Column(db.Float, nullable=False, default=0.0)
    grand_total = db.Column(db.Float, nullable=False, default=0.0)
    currency = db.Column(db.String(3), default="INR")
    idempotency_key = db.Column(db.String(64), unique=True, nullable=True)
    visit_date = db.Column(db.Date, nullable=True)
    time_slot = db.Column(db.String(50), default="")
    hold_expires_at = db.Column(db.DateTime, nullable=True)
    customer_name = db.Column(db.String(150), default="")
    customer_email = db.Column(db.String(255), default="")
    customer_phone = db.Column(db.String(20), default="")
    created_at = db.Column(db.DateTime, default=_utcnow)
    updated_at = db.Column(db.DateTime, default=_utcnow, onupdate=_utcnow)

    user = db.relationship("User", back_populates="bookings")
    event = db.relationship("Event", back_populates="bookings")
    destination = db.relationship("Destination")
    experience = db.relationship("Experience")
    items = db.relationship("BookingItem", back_populates="booking", cascade="all, delete-orphan")
    payment = db.relationship("Payment", back_populates="booking", uselist=False)
    tickets = db.relationship("DigitalTicket", back_populates="booking", lazy="dynamic")
    refund = db.relationship("Refund", back_populates="booking", uselist=False)

    @property
    def item_name(self) -> str:
        if self.experience:
            return self.experience.experience_name
        if self.event:
            return self.event.title
        if self.destination:
            return self.destination.name
        return "Unknown"

    def to_dict(self):
        return {
            "id": self.id, "booking_ref": self.booking_ref,
            "item_name": self.item_name,
            "status": self.status,
            "grand_total": self.grand_total, "currency": self.currency,
            "visit_date": self.visit_date.isoformat() if self.visit_date else "",
            "time_slot": self.time_slot,
            "created_at": self.created_at.isoformat() if self.created_at else "",
        }


# ---------------------------------------------------------------------------
# Booking Item (line items)
# ---------------------------------------------------------------------------

class BookingItem(db.Model):
    __tablename__ = "booking_items"

    id = db.Column(db.Integer, primary_key=True)
    booking_id = db.Column(db.Integer, db.ForeignKey("bookings.id"), nullable=False)
    ticket_type_id = db.Column(db.Integer, db.ForeignKey("ticket_types.id"), nullable=False)
    seat_id = db.Column(db.Integer, db.ForeignKey("seats.id"), nullable=True)
    quantity = db.Column(db.Integer, nullable=False, default=1)
    unit_price = db.Column(db.Float, nullable=False)
    subtotal = db.Column(db.Float, nullable=False)

    booking = db.relationship("Booking", back_populates="items")
    ticket_type = db.relationship("TicketType", back_populates="booking_items")
    seat = db.relationship("Seat")

    __table_args__ = (
        db.UniqueConstraint("booking_id", "seat_id", name="uq_booking_seat"),
    )


# ---------------------------------------------------------------------------
# Payment
# ---------------------------------------------------------------------------

class Payment(db.Model):
    __tablename__ = "payments"

    id = db.Column(db.Integer, primary_key=True)
    booking_id = db.Column(db.Integer, db.ForeignKey("bookings.id"), nullable=False, unique=True)
    payment_gateway = db.Column(db.String(50), default="SIMULATED")
    gateway_order_id = db.Column(db.String(255), default="")
    gateway_payment_id = db.Column(db.String(255), default="")
    gateway_signature = db.Column(db.String(500), default="")
    amount = db.Column(db.Float, nullable=False)
    currency = db.Column(db.String(3), default="INR")
    status = db.Column(db.String(20), nullable=False, default="PENDING")
    # PENDING | SUCCESS | FAILED | REFUNDED
    method = db.Column(db.String(50), default="")
    idempotency_key = db.Column(db.String(64), unique=True, nullable=True)
    created_at = db.Column(db.DateTime, default=_utcnow)
    verified_at = db.Column(db.DateTime, nullable=True)

    booking = db.relationship("Booking", back_populates="payment")


# ---------------------------------------------------------------------------
# Digital Ticket
# ---------------------------------------------------------------------------

class DigitalTicket(db.Model):
    __tablename__ = "digital_tickets"

    id = db.Column(db.Integer, primary_key=True)
    ticket_uid = db.Column(db.String(64), unique=True, nullable=False, default=_uuid, index=True)
    booking_id = db.Column(db.Integer, db.ForeignKey("bookings.id"), nullable=False)
    booking_item_id = db.Column(db.Integer, db.ForeignKey("booking_items.id"), nullable=True)
    event_title = db.Column(db.String(300), default="")
    holder_name = db.Column(db.String(150), default="")
    visit_date = db.Column(db.String(20), default="")
    time_slot = db.Column(db.String(50), default="")
    ticket_type_name = db.Column(db.String(100), default="")
    seat_info = db.Column(db.String(50), default="")  # e.g. "A12"
    qr_token = db.Column(db.String(255), unique=True, nullable=False)
    qr_image_path = db.Column(db.String(500), default="")
    pdf_path = db.Column(db.String(500), default="")
    status = db.Column(db.String(20), default="VALID")  # VALID | USED | CANCELLED | EXPIRED
    created_at = db.Column(db.DateTime, default=_utcnow)

    booking = db.relationship("Booking", back_populates="tickets")

    def to_dict(self):
        return {
            "id": self.id, "ticket_uid": self.ticket_uid,
            "event_title": self.event_title,
            "holder_name": self.holder_name,
            "visit_date": self.visit_date, "time_slot": self.time_slot,
            "ticket_type_name": self.ticket_type_name,
            "seat_info": self.seat_info,
            "status": self.status,
            "qr_token": self.qr_token,
        }


# ---------------------------------------------------------------------------
# Ticket Scan (gate verification)
# ---------------------------------------------------------------------------

class TicketScan(db.Model):
    __tablename__ = "ticket_scans"

    id = db.Column(db.Integer, primary_key=True)
    ticket_id = db.Column(db.Integer, db.ForeignKey("digital_tickets.id"), nullable=False)
    scanned_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    scanned_at = db.Column(db.DateTime, default=_utcnow)
    scan_result = db.Column(db.String(20), default="VALID")  # VALID | ALREADY_USED | INVALID | EXPIRED
    terminal_info = db.Column(db.String(200), default="")

    ticket = db.relationship("DigitalTicket")
    scanner = db.relationship("User")


# ---------------------------------------------------------------------------
# Notification
# ---------------------------------------------------------------------------

class Notification(db.Model):
    __tablename__ = "notifications"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    type = db.Column(db.String(50), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    data = db.Column(db.Text, default="{}")  # JSON extra data
    created_at = db.Column(db.DateTime, default=_utcnow)

    user = db.relationship("User", back_populates="notifications")


# ---------------------------------------------------------------------------
# Review
# ---------------------------------------------------------------------------

class Review(db.Model):
    __tablename__ = "reviews"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    destination_id = db.Column(db.Integer, db.ForeignKey("destinations.id"), nullable=True)
    event_id = db.Column(db.Integer, db.ForeignKey("events.id"), nullable=True)
    experience_id = db.Column(db.Integer, db.ForeignKey("experiences.id"), nullable=True)
    rating = db.Column(db.Integer, nullable=False)  # 1–5
    comment = db.Column(db.Text, default="")
    is_approved = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=_utcnow)

    user = db.relationship("User", back_populates="reviews")
    destination = db.relationship("Destination", back_populates="reviews")
    event = db.relationship("Event", back_populates="reviews")
    experience = db.relationship("Experience", back_populates="reviews")


# ---------------------------------------------------------------------------
# Chat History (AI assistant)
# ---------------------------------------------------------------------------

class ChatHistory(db.Model):
    __tablename__ = "chat_history"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    session_id = db.Column(db.String(64), nullable=False, index=True)
    role = db.Column(db.String(20), nullable=False)  # user | assistant
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=_utcnow)


# ---------------------------------------------------------------------------
# Refund
# ---------------------------------------------------------------------------

class Refund(db.Model):
    __tablename__ = "refunds"

    id = db.Column(db.Integer, primary_key=True)
    booking_id = db.Column(db.Integer, db.ForeignKey("bookings.id"), nullable=False, unique=True)
    payment_id = db.Column(db.Integer, db.ForeignKey("payments.id"), nullable=True)
    amount = db.Column(db.Float, nullable=False)
    reason = db.Column(db.Text, default="")
    status = db.Column(db.String(20), default="PENDING")  # PENDING | APPROVED | PROCESSED | REJECTED
    processed_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=_utcnow)

    booking = db.relationship("Booking", back_populates="refund")
    payment = db.relationship("Payment")


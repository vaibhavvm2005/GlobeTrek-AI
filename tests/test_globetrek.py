"""GlobeTrek AI – Comprehensive Automated Test Suite.
Validates:
- RBAC role access controls
- Zero-oversell ticket inventory locks
- Duplicate seat reservation concurrency protection
- Expired hold cleanup
- Idempotency deduplication
- Payment processing & ticket generation
- Gate turnstile QR verification & anti-double-entry lockout
- AI Concierge responses
"""
import uuid
import pytest
from datetime import date, datetime, timedelta, timezone

from app import create_app
from app.config import Config
from app.extensions import db
from app.models import (
    User, Event, Destination, Experience, Category, TicketType, Seat, SeatLock,
    Booking, BookingItem, Payment, DigitalTicket, TicketScan
)
from app.services import booking_service, payment_service, ticket_service, ai_service
from app.seed import seed_database


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    WTF_CSRF_ENABLED = False
    SERVER_NAME = "localhost"


@pytest.fixture
def app():
    app = create_app(TestConfig)
    with app.app_context():
        db.create_all()
        seed_database()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


def test_rbac_dashboard_guards(client, app):
    """Ensure unauthorized users cannot access role-protected dashboards."""
    # 1. Unauthenticated access redirects to login
    res = client.get("/admin/dashboard", follow_redirects=False)
    assert res.status_code in (302, 401, 403)

    res = client.get("/organizer/dashboard", follow_redirects=False)
    assert res.status_code in (302, 401, 403)

    res = client.get("/dashboard/", follow_redirects=False)
    assert res.status_code in (302, 401, 403)


def test_atomic_reservation_and_inventory_decrement(app):
    """Verifies that reserving tickets locks inventory and creates a pending hold."""
    with app.app_context():
        customer = User.query.filter_by(role="CUSTOMER").first()
        tt = TicketType.query.filter(TicketType.quantity_total >= 5).first()
        initial_avail = tt.quantity_available

        idem_key = "test_idem_" + uuid.uuid4().hex

        res = booking_service.create_reservation(
            user=customer,
            item_type="event" if tt.event_id else "destination",
            item_id=tt.event_id or tt.destination_id,
            ticket_selections=[{"ticket_type_id": tt.id, "quantity": 2}],
            seat_ids=[],
            visit_date="2026-05-20",
            time_slot="Evening",
            customer_name=customer.full_name,
            customer_email=customer.email,
            customer_phone=customer.phone,
            idempotency_key=idem_key,
        )

        assert "error" not in res
        booking_id = res["booking_id"]

        booking = db.session.get(Booking, booking_id)
        assert booking.status == "PENDING"
        assert booking.total_amount == tt.price * 2
        assert booking.grand_total > booking.total_amount  # includes 18% GST + statutory service fee

        # Refresh ticket type - 2 tickets held/locked
        db.session.refresh(tt)
        assert tt.quantity_available == initial_avail - 2


def test_all_8_categories_and_minimum_10_experiences_each(app):
    """Verify that all 8 categories exist, each has >= 10 experiences, and total >= 80."""
    with app.app_context():
        expected_categories = [
            "museums-art", "monuments", "theme-parks", "nature-adventure",
            "concerts-music", "sports", "conferences", "festivals",
        ]
        assert Category.query.count() >= 8

        total_experiences = Experience.query.count()
        assert total_experiences >= 80, f"Expected at least 80 experiences, got {total_experiences}"

        for slug in expected_categories:
            cat = Category.query.filter_by(slug=slug).first()
            assert cat is not None, f"Category with slug '{slug}' not found"
            count = Experience.query.filter_by(category_id=cat.id).count()
            assert count >= 10, f"Category '{cat.name}' ({slug}) has only {count} experiences, expected >= 10"


def test_category_page_routes_and_view_all(client, app):
    """Verify category dedicated pages, search, filter, and View All page."""
    with app.app_context():
        # Home page category cards
        res_home = client.get("/")
        assert res_home.status_code == 200
        assert b"Explore by Category" in res_home.data

        # Category pages for all 8 categories
        for cat in Category.query.all():
            res = client.get(f"/categories/{cat.slug}")
            assert res.status_code == 200
            assert cat.slug.encode() in res.data
            assert b"Experiences Listed" in res.data

        # View All Experiences page
        res_all = client.get("/experiences")
        assert res_all.status_code == 200
        assert b"All Curated Experiences" in res_all.data

        # Filter by category and price
        res_filter = client.get("/experiences?category=theme-parks&max_price=5000")
        assert res_filter.status_code == 200


def test_experience_booking_and_payment_flow(client, app):
    """End-to-end booking of an Experience, payment, and QR ticket generation."""
    with app.app_context():
        customer = User.query.filter_by(role="CUSTOMER").first()
        exp = Experience.query.filter_by(booking_enabled=True).first()
        assert exp is not None

        tt = TicketType.query.filter_by(experience_id=exp.id).first()
        assert tt is not None

        # 1. Create reservation for the Experience
        res = booking_service.create_reservation(
            user=customer,
            item_type="experience",
            item_id=exp.id,
            ticket_selections=[{"ticket_type_id": tt.id, "quantity": 2}],
            customer_name=customer.full_name,
            customer_email=customer.email,
            customer_phone=customer.phone,
            idempotency_key="exp_book_" + uuid.uuid4().hex,
        )
        assert "error" not in res
        booking_id = res["booking_id"]
        booking = db.session.get(Booking, booking_id)
        assert booking.experience_id == exp.id
        assert booking.item_name == exp.experience_name

        # 2. Simulate Payment
        pay_res = payment_service.simulate_payment(booking)
        assert pay_res.get("status") == "SUCCESS"
        assert booking.status == "CONFIRMED"

        # 3. Generate Digital Tickets
        tickets = ticket_service.generate_tickets(booking)
        assert len(tickets) == 2
        for t in tickets:
            assert t.status == "VALID"
            assert t.event_title == exp.experience_name


def test_prevent_duplicate_seat_booking(app):
    """Customer A locks Seat A1. Customer B attempting to lock Seat A1 must be rejected immediately."""
    with app.app_context():
        customer = User.query.filter_by(role="CUSTOMER").first()
        organizer = User.query.filter_by(role="ORGANIZER").first()

        seat = Seat.query.filter_by(status="AVAILABLE").first()
        assert seat is not None
        tt = TicketType.query.filter_by(event_id=seat.event_id).first()

        # 1. Customer reserves the seat
        res1 = booking_service.create_reservation(
            user=customer,
            item_type="event",
            item_id=seat.event_id,
            ticket_selections=[{"ticket_type_id": tt.id, "quantity": 1}],
            seat_ids=[seat.id],
            visit_date="2026-06-15",
            time_slot="18:00",
            customer_name=customer.full_name,
            customer_email=customer.email,
            customer_phone=customer.phone,
            idempotency_key="key_seat_a_" + uuid.uuid4().hex,
        )
        assert "error" not in res1

        db.session.refresh(seat)
        assert seat.status == "LOCKED"

        # 2. Second user attempts to reserve the identical seat
        res2 = booking_service.create_reservation(
            user=organizer,
            item_type="event",
            item_id=seat.event_id,
            ticket_selections=[{"ticket_type_id": tt.id, "quantity": 1}],
            seat_ids=[seat.id],
            visit_date="2026-06-15",
            time_slot="18:00",
            customer_name="Second Traveler",
            customer_email="second@example.com",
            customer_phone="+91 99999 88888",
            idempotency_key="key_seat_b_" + uuid.uuid4().hex,
        )

        assert "error" in res2
        assert res2["error"] == "Sorry! This seat has already been booked. Please select another seat."


def test_idempotent_reservation_replay(app):
    """Replaying an identical idempotency key returns the existing booking without decrementing inventory twice."""
    with app.app_context():
        customer = User.query.filter_by(role="CUSTOMER").first()
        tt = TicketType.query.first()
        idem_key = "idemp_replay_" + uuid.uuid4().hex

        # First reservation
        res1 = booking_service.create_reservation(
            user=customer,
            item_type="event" if tt.event_id else "destination",
            item_id=tt.event_id or tt.destination_id,
            ticket_selections=[{"ticket_type_id": tt.id, "quantity": 1}],
            seat_ids=[],
            visit_date="2026-07-01",
            time_slot="Morning",
            customer_name=customer.full_name,
            customer_email=customer.email,
            customer_phone=customer.phone,
            idempotency_key=idem_key,
        )
        assert "error" not in res1
        b_id_1 = res1["booking_id"]

        avail_after_first = tt.quantity_available

        # Replay same request
        res2 = booking_service.create_reservation(
            user=customer,
            item_type="event" if tt.event_id else "destination",
            item_id=tt.event_id or tt.destination_id,
            ticket_selections=[{"ticket_type_id": tt.id, "quantity": 1}],
            seat_ids=[],
            visit_date="2026-07-01",
            time_slot="Morning",
            customer_name=customer.full_name,
            customer_email=customer.email,
            customer_phone=customer.phone,
            idempotency_key=idem_key,
        )
        assert "error" not in res2
        assert res2["booking_id"] == b_id_1

        db.session.refresh(tt)
        assert tt.quantity_available == avail_after_first


def test_full_payment_ticket_issuance_and_gate_scan(app):
    """Lifecycle test: Reserve -> Pay -> Generate Digital Tickets -> Verify at Turnstile -> Reject Duplicate Scan."""
    with app.app_context():
        customer = User.query.filter_by(role="CUSTOMER").first()
        organizer = User.query.filter_by(role="ORGANIZER").first()
        tt = TicketType.query.first()

        # 1. Reserve
        res = booking_service.create_reservation(
            user=customer,
            item_type="event" if tt.event_id else "destination",
            item_id=tt.event_id or tt.destination_id,
            ticket_selections=[{"ticket_type_id": tt.id, "quantity": 1}],
            seat_ids=[],
            visit_date="2026-08-10",
            time_slot="Standard",
            customer_name=customer.full_name,
            customer_email=customer.email,
            customer_phone=customer.phone,
            idempotency_key="life_key_" + uuid.uuid4().hex,
        )
        booking = db.session.get(Booking, res["booking_id"])

        # 2. Simulate Payment
        pay_res = payment_service.simulate_payment(booking)
        assert pay_res.get("status") == "SUCCESS"
        assert booking.status == "CONFIRMED"

        # 3. Generate Digital Tickets
        tickets = ticket_service.generate_tickets(booking)
        assert len(tickets) == 1
        ticket = tickets[0]
        assert ticket.status == "VALID"
        assert ticket.qr_token.startswith("TKT:")

        # 4. First Turnstile Gate Scan -> Must be VALID
        scan1 = ticket_service.verify_ticket(
            qr_token=ticket.qr_token,
            scanned_by=organizer.id,
            terminal_info="Gate 4 West Turnstile",
        )
        assert scan1["valid"] is True
        assert scan1["result"] == "VALID"

        db.session.refresh(ticket)
        assert ticket.status == "USED"

        # 5. Second Turnstile Gate Scan -> Must be ALREADY_USED (duplicate entry prevented)
        scan2 = ticket_service.verify_ticket(
            qr_token=ticket.qr_token,
            scanned_by=organizer.id,
            terminal_info="Gate 4 West Turnstile",
        )
        assert scan2["valid"] is False
        assert scan2["result"] == "ALREADY_USED"


def test_multilingual_ai_assistant_grounding(app):
    """AI Assistant must answer queries using real database records in supported languages."""
    with app.app_context():
        # English
        reply_en = ai_service.chat("Show tourist places in Paris", session_id="test_sess_1", language="en")
        assert "Eiffel" in reply_en or "Louvre" in reply_en or "Paris" in reply_en

        # Hindi
        reply_hi = ai_service.chat("ताज महल के बारे में बताओ", session_id="test_sess_2", language="hi")
        assert len(reply_hi) > 20

        # Kannada
        reply_kn = ai_service.chat("ಕಾರ್ಯಕ್ರಮಗಳು ಮತ್ತು ಪ್ರವಾಸಿ ತಾಣಗಳು", session_id="test_sess_3", language="kn")
        assert len(reply_kn) > 20


def test_last_ticket_oversell_prevention(app):
    """When only 1 ticket remains, a second reservation for that ticket must fail immediately."""
    with app.app_context():
        customer = User.query.filter_by(role="CUSTOMER").first()
        organizer = User.query.filter_by(role="ORGANIZER").first()

        # Create a ticket type with total capacity = 1
        tt = TicketType(
            name="Exclusive Backstage Pass",
            price=25000.0,
            quantity_total=1,
            quantity_sold=0,
            quantity_locked=0,
            max_per_booking=1,
            description="Ultra limited pass",
        )
        db.session.add(tt)
        db.session.commit()

        # User A reserves the 1 ticket
        res1 = booking_service.create_reservation(
            user=customer,
            ticket_selections=[{"ticket_type_id": tt.id, "quantity": 1}],
            customer_name="User A",
            customer_email="usera@example.com",
            customer_phone="+91 90000 11111",
            idempotency_key="last_tkt_a_" + uuid.uuid4().hex,
        )
        assert "error" not in res1

        # User B attempts to reserve the same ticket
        res2 = booking_service.create_reservation(
            user=organizer,
            ticket_selections=[{"ticket_type_id": tt.id, "quantity": 1}],
            customer_name="User B",
            customer_email="userb@example.com",
            customer_phone="+91 90000 22222",
            idempotency_key="last_tkt_b_" + uuid.uuid4().hex,
        )
        assert "error" in res2
        assert "left" in res2["error"].lower() or "available" in res2["error"].lower()


def test_invalid_and_tampered_qr_ticket(app):
    """Forged or tampered QR signatures must be rejected by turnstile gate validation."""
    with app.app_context():
        # Non-existent token
        fake_scan = ticket_service.verify_ticket(qr_token="TKT:fake_uid:fake_ref:12345:tampered_digest")
        assert fake_scan["valid"] is False
        assert fake_scan["result"] == "INVALID"


def test_expired_hold_cleanup(app):
    """Unpaid reservation holds past 10 minutes must release reserved quantities back to available."""
    with app.app_context():
        customer = User.query.filter_by(role="CUSTOMER").first()
        tt = TicketType.query.first()
        initial_avail = tt.quantity_available

        res = booking_service.create_reservation(
            user=customer,
            ticket_selections=[{"ticket_type_id": tt.id, "quantity": 2}],
            customer_name=customer.full_name,
            customer_email=customer.email,
            customer_phone=customer.phone,
            idempotency_key="expire_test_" + uuid.uuid4().hex,
        )
        booking = db.session.get(Booking, res["booking_id"])

        # Manually backdate hold_expires_at to simulate expiry
        booking.hold_expires_at = datetime.now(timezone.utc) - timedelta(minutes=15)
        db.session.commit()

        # Run sweep
        expired_count = booking_service.expire_stale_holds()
        assert expired_count >= 1

        db.session.refresh(booking)
        assert booking.status == "EXPIRED"

        db.session.refresh(tt)
        assert tt.quantity_available == initial_avail


def test_user_registration_and_authentication(client, app):
    """Test user registration, duplicate prevention, and login flow."""
    with app.app_context():
        # 1. Successful customer registration
        unique_email = f"user_{uuid.uuid4().hex[:8]}@example.com"
        res_reg = client.post("/auth/register", data={
            "username": f"user_{uuid.uuid4().hex[:6]}",
            "email": unique_email,
            "full_name": "Test Traveler",
            "phone": "+91 98765 00000",
            "password": "Password123!",
            "confirm_password": "Password123!",
            "role": "CUSTOMER",
        }, follow_redirects=True)
        assert res_reg.status_code == 200
        assert b"Registration successful" in res_reg.data

        # 2. Reject duplicate email registration
        res_dup = client.post("/auth/register", data={
            "username": f"user_{uuid.uuid4().hex[:6]}",
            "email": unique_email,
            "full_name": "Test Traveler",
            "phone": "+91 98765 00000",
            "password": "Password123!",
            "confirm_password": "Password123!",
            "role": "CUSTOMER",
        }, follow_redirects=True)
        assert b"Email is already registered" in res_dup.data

        # 3. Successful login
        res_login = client.post("/auth/login", data={
            "login_id": unique_email,
            "password": "Password123!",
        }, follow_redirects=True)
        assert res_login.status_code == 200
        assert b"Welcome back" in res_login.data

        # 4. Invalid credentials rejected
        res_bad = client.post("/auth/login", data={
            "login_id": unique_email,
            "password": "WrongPassword999",
        }, follow_redirects=True)
        assert b"Invalid credentials" in res_bad.data


def test_global_search_and_filtering(client, app):
    """Test searching destinations, events, and experiences by query, country, city."""
    with app.app_context():
        # Search query for Paris
        res_search = client.get("/search?q=Paris")
        assert res_search.status_code == 200
        assert b"Paris" in res_search.data

        # Filter destinations by country
        res_dest = client.get("/destinations?country=France")
        assert res_dest.status_code == 200

        # Filter events by city
        res_ev = client.get("/events?city=Bengaluru")
        assert res_ev.status_code == 200


def test_expired_seat_lock_auto_released_on_the_fly(app):
    """When a seat lock has expired, a new reservation must automatically release the expired lock and succeed."""
    with app.app_context():
        customer = User.query.filter_by(role="CUSTOMER").first()
        organizer = User.query.filter_by(role="ORGANIZER").first()

        seat = Seat.query.filter_by(status="AVAILABLE").first()
        assert seat is not None
        tt = TicketType.query.filter_by(event_id=seat.event_id).first()

        # 1. Customer locks the seat
        res1 = booking_service.create_reservation(
            user=customer,
            item_type="event",
            item_id=seat.event_id,
            ticket_selections=[{"ticket_type_id": tt.id, "quantity": 1}],
            seat_ids=[seat.id],
            idempotency_key="lock_exp_test_a_" + uuid.uuid4().hex,
        )
        assert "error" not in res1

        # 2. Backdate the seat lock past 10 minutes
        lock = SeatLock.query.filter_by(seat_id=seat.id, is_released=False).first()
        assert lock is not None
        lock.expires_at = datetime.now(timezone.utc) - timedelta(minutes=15)
        db.session.commit()

        # 3. Organizer attempts to book the seat -> Expired lock is auto-released and booking succeeds!
        res2 = booking_service.create_reservation(
            user=organizer,
            item_type="event",
            item_id=seat.event_id,
            ticket_selections=[{"ticket_type_id": tt.id, "quantity": 1}],
            seat_ids=[seat.id],
            idempotency_key="lock_exp_test_b_" + uuid.uuid4().hex,
        )
        assert "error" not in res2
        assert "booking_id" in res2


def test_booking_cancellation_and_inventory_restoration(app):
    """Cancelling a booking releases inventory and seats back to available."""
    with app.app_context():
        customer = User.query.filter_by(role="CUSTOMER").first()
        tt = TicketType.query.first()
        initial_avail = tt.quantity_available

        res = booking_service.create_reservation(
            user=customer,
            ticket_selections=[{"ticket_type_id": tt.id, "quantity": 2}],
            idempotency_key="cancel_test_" + uuid.uuid4().hex,
        )
        booking = db.session.get(Booking, res["booking_id"])

        # Cancel the pending reservation
        cancel_res = booking_service.cancel_booking(booking.id, reason="Changed travel dates")
        assert cancel_res.get("success") is True
        assert booking.status == "CANCELLED"

        db.session.refresh(tt)
        assert tt.quantity_available == initial_avail


def test_tampered_razorpay_signature_rejection(app):
    """Payment verification with tampered or mismatched Razorpay signatures must fail."""
    with app.app_context():
        customer = User.query.filter_by(role="CUSTOMER").first()
        exp = Experience.query.filter_by(booking_enabled=True).first()
        tt = TicketType.query.filter_by(experience_id=exp.id).first()

        res = booking_service.create_reservation(
            user=customer,
            item_type="experience",
            item_id=exp.id,
            ticket_selections=[{"ticket_type_id": tt.id, "quantity": 1}],
            idempotency_key="rzp_fail_" + uuid.uuid4().hex,
        )
        booking = db.session.get(Booking, res["booking_id"])

        # Create a payment order configured as Razorpay
        payment = Payment(
            booking_id=booking.id,
            payment_gateway="RAZORPAY",
            gateway_order_id="order_fake_123",
            amount=booking.grand_total,
            currency="INR",
            status="PENDING",
        )
        db.session.add(payment)
        db.session.commit()

        # Temporarily mock Razorpay credentials on app config to test signature validation
        app.config["RAZORPAY_KEY_ID"] = "rzp_test_mock_key"
        app.config["RAZORPAY_KEY_SECRET"] = "rzp_secret_mock_12345"

        verify_res = payment_service.verify_payment(
            booking=booking,
            razorpay_order_id="order_fake_123",
            razorpay_payment_id="pay_fake_999",
            razorpay_signature="invalid_tampered_hex_signature",
        )
        assert verify_res["status"] == "FAILED"
        assert "Invalid Razorpay signature" in verify_res.get("error", "")

        # Reset config
        app.config["RAZORPAY_KEY_ID"] = ""
        app.config["RAZORPAY_KEY_SECRET"] = ""


def test_customer_ticket_pdf_download_route(client, app):
    """Test customer ticket download route generates and serves PDF successfully."""
    with app.app_context():
        customer = User.query.filter_by(role="CUSTOMER").first()
        exp = Experience.query.filter_by(booking_enabled=True).first()
        tt = TicketType.query.filter_by(experience_id=exp.id).first()

        res = booking_service.create_reservation(
            user=customer,
            item_type="experience",
            item_id=exp.id,
            ticket_selections=[{"ticket_type_id": tt.id, "quantity": 1}],
            customer_name=customer.full_name,
            customer_email=customer.email,
            customer_phone=customer.phone,
            idempotency_key="pdf_test_" + uuid.uuid4().hex,
        )
        booking = db.session.get(Booking, res["booking_id"])
        payment_service.simulate_payment(booking)
        tickets = ticket_service.generate_tickets(booking)
        assert len(tickets) >= 1
        ticket = tickets[0]

        # Login as customer
        with client.session_transaction() as sess:
            sess["_user_id"] = str(customer.id)
            sess["_fresh"] = True

        dl_res = client.get(f"/dashboard/tickets/{ticket.ticket_uid}/download")
        assert dl_res.status_code == 200
        assert dl_res.content_type == "application/pdf"
        assert len(dl_res.data) > 100


def test_concurrent_multi_thread_seat_booking_prevention(app):
    """Simulate 10 concurrent threads attempting to book the exact same seat simultaneously."""
    from concurrent.futures import ThreadPoolExecutor, as_completed
    with app.app_context():
        # Find an available seat
        seat = Seat.query.filter_by(status="AVAILABLE").first()
        assert seat is not None
        tt = TicketType.query.filter_by(event_id=seat.event_id).first()
        customer = User.query.filter_by(role="CUSTOMER").first()

        def try_book(thread_idx):
            with app.app_context():
                return booking_service.create_reservation(
                    user_id=customer.id,
                    item_type="event",
                    item_id=seat.event_id,
                    ticket_selections=[{"ticket_type_id": tt.id, "quantity": 1}],
                    seat_ids=[seat.id],
                    customer_name=f"Concurrent User {thread_idx}",
                    customer_email=f"concurrent{thread_idx}@example.com",
                    idempotency_key=f"conc_seat_{seat.id}_{thread_idx}_{uuid.uuid4().hex[:8]}",
                )

        results = []
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(try_book, i) for i in range(10)]
            for f in as_completed(futures):
                results.append(f.result())

        successes = [r for r in results if "error" not in r]
        errors = [r for r in results if "error" in r]

        assert len(successes) == 1, f"Expected exactly 1 success, got {len(successes)}"
        assert len(errors) == 9
        for err in errors:
            assert "already been booked" in err["error"] or "locked" in err["error"].lower()


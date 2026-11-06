import pytest
from concurrent.futures import ThreadPoolExecutor, as_completed
from database import get_db, init_database
from auth import (
    create_access_token, verify_access_token, hash_password, verify_password,
    sign_ticket_qr, verify_ticket_qr
)
from booking_engine import (
    calculate_quote, create_booking_reservation, process_simulated_payment,
    get_confirmed_ticket, scan_ticket_at_gate, cancel_and_refund_booking,
    expire_stale_reservations
)
from ai_agent import deterministic_concierge, search_experiences

@pytest.fixture(scope="session", autouse=True)
def setup_db():
    init_database()

def test_password_and_jwt_security():
    pwd = "SecureSecretPassword#2026"
    hashed = hash_password(pwd)
    assert verify_password(pwd, hashed)
    assert not verify_password("WrongPassword", hashed)

    token = create_access_token("usr-123", "tester@wayfarer.com", "SUPER_ADMIN", "Test Admin")
    decoded = verify_access_token(token)
    assert decoded["sub"] == "usr-123"
    assert decoded["email"] == "tester@wayfarer.com"
    assert decoded["role"] == "SUPER_ADMIN"

def test_quote_calculation():
    quote = calculate_quote(1, [{"ticket_type_id": "tt-1-gen", "quantity": 2}])
    assert quote["event_id"] == 1
    assert quote["visitors_count"] == 2
    assert quote["subtotal"] == 300
    assert quote["taxes_fees"] == 59
    assert quote["total_amount"] == 359

def test_idempotent_reservation():
    key = "test-idemp-key-unique-01"
    items = [{"ticket_type_id": "tt-1-gen", "quantity": 1}]
    res1 = create_booking_reservation(1, "Aarav", "aarav@test.com", "9876543210", items, idempotency_key=key)
    res2 = create_booking_reservation(1, "Aarav", "aarav@test.com", "9876543210", items, idempotency_key=key)
    assert res1["booking_id"] == res2["booking_id"]

def test_concurrent_reservations_prevent_overselling():
    import uuid
    # Reset event 3 and clear test bookings for it
    with get_db() as conn:
        conn.execute("DELETE FROM reservations WHERE event_id = 3")
        conn.execute("DELETE FROM booking_items WHERE booking_id IN (SELECT id FROM bookings WHERE event_id = 3)")
        conn.execute("DELETE FROM payments WHERE booking_id IN (SELECT id FROM bookings WHERE event_id = 3)")
        conn.execute("DELETE FROM bookings WHERE event_id = 3")
        conn.execute("UPDATE inventory SET available_quantity = 4, reserved_quantity = 0 WHERE ticket_type_id = 'tt-3-gen'")
        conn.execute("UPDATE events SET inventory = 4 WHERE id = 3")
        conn.commit()

    run_id = uuid.uuid4().hex[:6]
    def try_reserve(idx):
        try:
            items = [{"ticket_type_id": "tt-3-gen", "quantity": 1}]
            res = create_booking_reservation(3, f"User {idx}", f"user{idx}@test.com", None, items, idempotency_key=f"conc-{run_id}-{idx}")
            return res.get("status") == "PENDING_PAYMENT"
        except Exception:
            return False

    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = [pool.submit(try_reserve, i) for i in range(8)]
        results = [f.result() for f in as_completed(futures)]

    success_count = sum(1 for r in results if r is True)
    assert success_count == 4

    with get_db() as conn:
        inv = conn.execute("SELECT available_quantity, reserved_quantity FROM inventory WHERE ticket_type_id = 'tt-3-gen'").fetchone()
        assert inv["available_quantity"] == 0
        assert inv["reserved_quantity"] == 4

def test_full_payment_and_qr_gate_checkin():
    items = [{"ticket_type_id": "tt-1-gen", "quantity": 1}]
    res = create_booking_reservation(1, "Deepa", "deepa@test.com", None, items)
    b_id = res["booking_id"]

    # Verify payment
    pay = process_simulated_payment(b_id)
    assert pay["booking_status"] == "CONFIRMED"

    # Fetch confirmed ticket pass
    ticket = get_confirmed_ticket(b_id)
    assert ticket["status"] == "CONFIRMED"
    qr_token = ticket["qr_token"]
    assert qr_token is not None

    # First gate scan -> VALID
    scan_res = scan_ticket_at_gate(qr_token, "staff@wayfarer.com", "North Gate")
    assert scan_res["valid"] is True

    # Second gate scan -> ALREADY_USED
    double_scan = scan_ticket_at_gate(qr_token, "staff@wayfarer.com", "North Gate")
    assert double_scan["valid"] is False
    assert double_scan["reason"] == "ALREADY_USED"

def test_cancellation_and_refund_flow():
    items = [{"ticket_type_id": "tt-1-gen", "quantity": 1}]
    res = create_booking_reservation(1, "Rohan", "rohan@test.com", None, items)
    b_id = res["booking_id"]
    process_simulated_payment(b_id)

    cancel_res = cancel_and_refund_booking(b_id, "Flight rescheduled", "rohan@test.com")
    assert cancel_res["status"] == "REFUND_PENDING"
    assert cancel_res["refund_id"] is not None

def test_ai_concierge_multilingual():
    reply_en, tools_en, card_en = deterministic_concierge("I want to visit a museum in Bengaluru under ₹200", "en")
    assert "bengaluru" in reply_en.lower() or "found" in reply_en.lower()
    assert len(tools_en) > 0
    assert card_en is not None

    reply_hi, _, _ = deterministic_concierge("बेंगलुरु में संग्रहालय दिखाओ", "hi")
    assert len(reply_hi) > 5

    reply_kn, _, _ = deterministic_concierge("ಬೆಂಗಳೂರಿನಲ್ಲಿ ವಸ್ತುಸಂಗ್ರಹಾಲಯ", "kn")
    assert len(reply_kn) > 5

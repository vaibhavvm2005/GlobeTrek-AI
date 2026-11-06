"""GlobeTrek AI – Payment service.

Supports Razorpay (when configured) and a demo/simulated gateway.
"""
from __future__ import annotations

import hashlib
import hmac
import logging
import uuid
from datetime import datetime, timezone

from flask import current_app

from app.extensions import db
from app.models import Booking, Payment, Refund
from app.services import booking_service

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _razorpay_configured() -> bool:
    key = current_app.config.get("RAZORPAY_KEY_ID", "")
    secret = current_app.config.get("RAZORPAY_KEY_SECRET", "")
    return bool(key and secret)


def _get_razorpay_client():
    """Lazily import and return a Razorpay client."""
    import razorpay  # noqa: E402
    return razorpay.Client(
        auth=(
            current_app.config["RAZORPAY_KEY_ID"],
            current_app.config["RAZORPAY_KEY_SECRET"],
        )
    )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def create_payment_order(booking: Booking) -> dict:
    """Create a payment order (Razorpay or simulated).

    Returns a dict with keys:
        order_id, amount, currency, key_id, is_simulated
    """
    if booking.status != "PENDING":
        raise ValueError(f"Booking {booking.booking_ref} is not in PENDING state")

    # Prevent duplicate payment records
    if booking.payment:
        existing = booking.payment
        return {
            "order_id": existing.gateway_order_id,
            "amount": existing.amount,
            "currency": existing.currency,
            "key_id": current_app.config.get("RAZORPAY_KEY_ID", ""),
            "is_simulated": existing.payment_gateway == "SIMULATED",
        }

    amount_paise = int(round(booking.grand_total * 100))  # Razorpay expects paise

    try:
        if _razorpay_configured():
            client = _get_razorpay_client()
            order_data = client.order.create({
                "amount": amount_paise,
                "currency": booking.currency,
                "receipt": booking.booking_ref,
                "notes": {"booking_ref": booking.booking_ref},
            })
            order_id = order_data["id"]
            gateway = "RAZORPAY"
        else:
            order_id = f"sim_{uuid.uuid4().hex[:16]}"
            gateway = "SIMULATED"

        payment = Payment(
            booking_id=booking.id,
            payment_gateway=gateway,
            gateway_order_id=order_id,
            amount=booking.grand_total,
            currency=booking.currency,
            status="PENDING",
            idempotency_key=f"pay_{booking.booking_ref}",
        )
        db.session.add(payment)
        db.session.commit()

        logger.info(
            "Payment order created: %s for booking %s (gateway=%s)",
            order_id, booking.booking_ref, gateway,
        )

        return {
            "order_id": order_id,
            "amount": booking.grand_total,
            "amount_paise": amount_paise,
            "currency": booking.currency,
            "key_id": current_app.config.get("RAZORPAY_KEY_ID", ""),
            "is_simulated": gateway == "SIMULATED",
            "booking_ref": booking.booking_ref,
        }

    except Exception:
        db.session.rollback()
        logger.exception("create_payment_order failed for booking %s", booking.booking_ref)
        raise


def verify_payment(
    booking_or_id: int | Booking | None = None,
    razorpay_payment_id: str = "",
    razorpay_order_id: str = "",
    razorpay_signature: str = "",
    booking: Booking | None = None,
) -> dict:
    """Verify the gateway callback and confirm the booking.

    For Razorpay: validates HMAC signature.
    For simulated: accepts directly.
    """
    try:
        target = booking or booking_or_id
        if hasattr(target, "id"):
            bk = target
        else:
            bk = db.session.get(Booking, int(target))
        if bk is None:
            return {"error": "Booking not found", "status": "FAILED"}

        payment = bk.payment
        if payment is None:
            return {"error": "No payment record for this booking", "status": "FAILED"}

        # Idempotency – already processed
        if payment.status == "SUCCESS":
            logger.info("Payment already verified for booking %s", bk.booking_ref)
            return {"status": "SUCCESS", "payment": payment}

        if payment.payment_gateway == "RAZORPAY" and _razorpay_configured():
            # Verify Razorpay signature
            secret = current_app.config["RAZORPAY_KEY_SECRET"]
            body = f"{razorpay_order_id}|{razorpay_payment_id}"
            expected = hmac.new(
                secret.encode(),
                body.encode(),
                hashlib.sha256,
            ).hexdigest()

            if not hmac.compare_digest(expected, razorpay_signature):
                payment.status = "FAILED"
                db.session.commit()
                return {"error": "Invalid Razorpay signature", "status": "FAILED"}

            payment.gateway_payment_id = razorpay_payment_id
            payment.gateway_signature = razorpay_signature

        # Mark payment as successful
        payment.status = "SUCCESS"
        payment.method = "RAZORPAY" if payment.payment_gateway == "RAZORPAY" else "SIMULATED"
        payment.verified_at = datetime.now(timezone.utc)

        db.session.commit()

        # Confirm booking & inventory
        booking_service.confirm_booking(bk.id)

        logger.info("Payment verified for booking %s", bk.booking_ref)
        return {"status": "SUCCESS", "payment": payment}

    except Exception as exc:
        db.session.rollback()
        logger.exception("verify_payment failed")
        return {"error": str(exc), "status": "FAILED"}


def simulate_payment(booking_or_id: int | Booking) -> dict:
    """Instant success for demo mode (no real gateway)."""
    try:
        if hasattr(booking_or_id, "id"):
            booking = booking_or_id
        else:
            booking = db.session.get(Booking, int(booking_or_id))

        if booking is None:
            return {"error": "Booking not found", "status": "FAILED"}

        payment = booking.payment
        if payment is None:
            # Create the record on the fly
            payment = Payment(
                booking_id=booking.id,
                payment_gateway="SIMULATED",
                gateway_order_id=f"sim_{uuid.uuid4().hex[:16]}",
                gateway_payment_id=f"sim_pay_{uuid.uuid4().hex[:12]}",
                amount=booking.grand_total,
                currency=booking.currency,
                status="SUCCESS",
                method="SIMULATED",
                verified_at=datetime.now(timezone.utc),
                idempotency_key=f"simpay_{booking.booking_ref}",
            )
            db.session.add(payment)
        else:
            if payment.status == "SUCCESS":
                return {"status": "SUCCESS", "payment": payment}
            payment.status = "SUCCESS"
            payment.method = "SIMULATED"
            payment.gateway_payment_id = f"sim_pay_{uuid.uuid4().hex[:12]}"
            payment.verified_at = datetime.now(timezone.utc)

        db.session.commit()

        # Confirm booking
        booking_service.confirm_booking(booking.id)

        logger.info("Simulated payment for booking %s", booking.booking_ref)
        return {"status": "SUCCESS", "payment": payment}

    except Exception as exc:
        db.session.rollback()
        logger.exception("simulate_payment failed")
        return {"error": str(exc), "status": "FAILED"}


def process_refund(booking_id: int) -> Refund:
    """Create or return an existing refund record for the booking."""
    try:
        booking = db.session.get(Booking, booking_id)
        if booking is None:
            raise ValueError("Booking not found")

        # Already has a refund
        if booking.refund:
            return booking.refund

        payment = booking.payment
        refund = Refund(
            booking_id=booking.id,
            payment_id=payment.id if payment else None,
            amount=booking.grand_total,
            reason="Refund requested",
            status="PENDING",
        )
        db.session.add(refund)

        if booking.status == "CONFIRMED":
            booking.status = "REFUNDED"

        db.session.commit()
        logger.info("Refund created for booking %s", booking.booking_ref)
        return refund

    except Exception:
        db.session.rollback()
        logger.exception("process_refund failed for booking_id=%s", booking_id)
        raise

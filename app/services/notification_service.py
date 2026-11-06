"""GlobeTrek AI – Notification service.

Creates in-app notifications and attempts email delivery via Flask-Mail.
"""
from __future__ import annotations

import json
import logging

from flask import current_app
from flask_mail import Message as MailMessage

from app.extensions import db, mail
from app.models import Notification, Booking

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Core helper
# ---------------------------------------------------------------------------

def notify(
    user_id: int,
    type: str,
    title: str,
    message: str,
    data: dict | None = None,
) -> Notification:
    """Create an in-app notification record."""
    try:
        notif = Notification(
            user_id=user_id,
            type=type,
            title=title,
            message=message,
            data=json.dumps(data or {}),
        )
        db.session.add(notif)
        db.session.commit()
        return notif
    except Exception:
        db.session.rollback()
        logger.exception("notify() failed for user %s", user_id)
        raise


def _send_email(subject: str, recipients: list[str], body: str, html: str = ""):
    """Best-effort email send; silently fails if mail is not configured."""
    try:
        sender = current_app.config.get("MAIL_DEFAULT_SENDER", "")
        username = current_app.config.get("MAIL_USERNAME", "")
        if not username and not sender:
            logger.debug("Mail not configured – skipping email")
            return
        msg = MailMessage(
            subject=subject,
            recipients=recipients,
            body=body,
            html=html or None,
            sender=sender,
        )
        mail.send(msg)
        logger.info("Email sent to %s: %s", recipients, subject)
    except Exception:
        logger.warning("Email send failed (non-fatal): %s", subject, exc_info=True)


# ---------------------------------------------------------------------------
# High-level booking notifications
# ---------------------------------------------------------------------------

def send_booking_confirmation(booking: Booking) -> None:
    """Notify the user that their booking is confirmed."""
    item_name = booking.item_name
    title = "Booking Confirmed! 🎉"
    message = (
        f"Your booking for {item_name} has been confirmed.\n"
        f"Booking Ref: {booking.booking_ref}\n"
        f"Amount: ₹{booking.grand_total:.2f}\n"
        f"Visit Date: {booking.visit_date or 'See ticket'}\n"
        f"Time Slot: {booking.time_slot or 'N/A'}"
    )

    notify(
        user_id=booking.user_id,
        type="BOOKING_CONFIRMED",
        title=title,
        message=message,
        data={
            "booking_id": booking.id,
            "booking_ref": booking.booking_ref,
        },
    )

    # Attempt email
    email = booking.customer_email or (booking.user.email if booking.user else "")
    if email:
        html = f"""
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;">
            <div style="background:#2563eb;padding:20px;color:white;text-align:center;">
                <h1 style="margin:0;">GlobeTrek AI</h1>
                <p style="margin:5px 0 0;">Booking Confirmation</p>
            </div>
            <div style="padding:20px;background:#f9fafb;">
                <h2>🎉 Booking Confirmed!</h2>
                <p><strong>Event/Destination:</strong> {item_name}</p>
                <p><strong>Booking Reference:</strong> {booking.booking_ref}</p>
                <p><strong>Amount Paid:</strong> ₹{booking.grand_total:.2f}</p>
                <p><strong>Date:</strong> {booking.visit_date or 'See ticket'}</p>
                <p>Your digital tickets are ready in your account. Enjoy!</p>
            </div>
            <div style="padding:10px;text-align:center;color:#888;font-size:12px;">
                GlobeTrek AI • Your gateway to experiences
            </div>
        </div>
        """
        _send_email(
            subject=f"Booking Confirmed – {item_name}",
            recipients=[email],
            body=message,
            html=html,
        )


def send_payment_success(booking: Booking) -> None:
    """Notify the user of successful payment."""
    notify(
        user_id=booking.user_id,
        type="PAYMENT_SUCCESS",
        title="Payment Successful ✅",
        message=(
            f"We received ₹{booking.grand_total:.2f} for your booking "
            f"{booking.booking_ref}."
        ),
        data={
            "booking_id": booking.id,
            "booking_ref": booking.booking_ref,
            "amount": booking.grand_total,
        },
    )


def send_payment_failed(booking: Booking) -> None:
    """Notify the user of a failed payment."""
    notify(
        user_id=booking.user_id,
        type="PAYMENT_FAILED",
        title="Payment Failed ❌",
        message=(
            f"The payment for booking {booking.booking_ref} could not be processed. "
            f"Please try again or use a different payment method."
        ),
        data={
            "booking_id": booking.id,
            "booking_ref": booking.booking_ref,
        },
    )


def send_cancellation(booking: Booking) -> None:
    """Notify the user that their booking was cancelled."""
    item_name = booking.item_name
    notify(
        user_id=booking.user_id,
        type="BOOKING_CANCELLED",
        title="Booking Cancelled",
        message=(
            f"Your booking for {item_name} (Ref: {booking.booking_ref}) "
            f"has been cancelled. If you paid, a refund will be processed."
        ),
        data={
            "booking_id": booking.id,
            "booking_ref": booking.booking_ref,
        },
    )

    email = booking.customer_email or (booking.user.email if booking.user else "")
    if email:
        _send_email(
            subject=f"Booking Cancelled – {item_name}",
            recipients=[email],
            body=(
                f"Hi {booking.customer_name or 'there'},\n\n"
                f"Your booking for {item_name} (Ref: {booking.booking_ref}) "
                f"has been cancelled.\n"
                f"If you made a payment, a refund of ₹{booking.grand_total:.2f} "
                f"will be processed within 5-7 business days.\n\n"
                f"– GlobeTrek AI"
            ),
        )


# ---------------------------------------------------------------------------
# Read / count helpers
# ---------------------------------------------------------------------------

def mark_read(notification_id: int, user_id: int) -> bool:
    """Mark a notification as read. Returns True if updated."""
    try:
        notif = Notification.query.filter_by(
            id=notification_id, user_id=user_id,
        ).first()
        if notif is None:
            return False
        notif.is_read = True
        db.session.commit()
        return True
    except Exception:
        db.session.rollback()
        logger.exception("mark_read failed")
        return False


def get_unread_count(user_id: int) -> int:
    """Return the number of unread notifications for the user."""
    try:
        return Notification.query.filter_by(
            user_id=user_id, is_read=False,
        ).count()
    except Exception:
        logger.exception("get_unread_count failed")
        return 0

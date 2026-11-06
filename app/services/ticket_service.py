"""GlobeTrek AI – Digital ticket service.

Generates QR-code images, PDF tickets, and handles gate-scan verification.
"""
from __future__ import annotations

import hashlib
import hmac
import logging
import os
import time
import uuid
from datetime import datetime, timezone

from flask import current_app

from app.extensions import db
from app.models import Booking, BookingItem, DigitalTicket, TicketScan, Seat

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _signing_secret() -> str:
    return current_app.config.get("TICKET_SIGNING_SECRET", "demo-signing-secret")


def _upload_folder() -> str:
    return current_app.config.get(
        "UPLOAD_FOLDER",
        os.path.join(current_app.root_path, "static", "uploads"),
    )


def _make_qr_token(ticket_uid: str, booking_ref: str) -> str:
    """Build an HMAC-SHA256 signed token.

    Format: ``TKT:<ticket_uid>:<booking_ref>:<timestamp>:<signature>``
    """
    ts = str(int(time.time()))
    payload = f"TKT:{ticket_uid}:{booking_ref}:{ts}"
    sig = hmac.new(
        _signing_secret().encode(),
        payload.encode(),
        hashlib.sha256,
    ).hexdigest()
    return f"{payload}:{sig}"


def _verify_token_signature(qr_token: str) -> bool:
    """Validate the HMAC signature in a QR token string."""
    parts = qr_token.rsplit(":", 1)
    if len(parts) != 2:
        return False
    payload, sig = parts
    expected = hmac.new(
        _signing_secret().encode(),
        payload.encode(),
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, sig)


def _generate_qr_image(data: str, filename: str) -> str:
    """Generate a QR-code PNG and return its path relative to static/uploads."""
    try:
        import qrcode  # noqa: E402
        from qrcode.constants import ERROR_CORRECT_M  # noqa: E402

        qr_dir = os.path.join(_upload_folder(), "qr")
        os.makedirs(qr_dir, exist_ok=True)

        img = qrcode.QRCode(
            version=1,
            error_correction=ERROR_CORRECT_M,
            box_size=10,
            border=4,
        )
        img.add_data(data)
        img.make(fit=True)
        pil_img = img.make_image(fill_color="black", back_color="white")

        filepath = os.path.join(qr_dir, filename)
        pil_img.save(filepath)
        return f"uploads/qr/{filename}"

    except ImportError:
        logger.warning("qrcode library not installed – QR image skipped")
        return ""
    except Exception:
        logger.exception("QR image generation failed for %s", filename)
        return ""


def _generate_pdf_ticket(ticket: DigitalTicket) -> str:
    """Generate a simple PDF ticket using ReportLab. Returns relative path."""
    try:
        from reportlab.lib.pagesizes import A6  # noqa: E402
        from reportlab.lib.units import mm  # noqa: E402
        from reportlab.pdfgen import canvas  # noqa: E402
        from reportlab.lib import colors  # noqa: E402

        pdf_dir = os.path.join(_upload_folder(), "tickets")
        os.makedirs(pdf_dir, exist_ok=True)

        filename = f"ticket_{ticket.ticket_uid}.pdf"
        filepath = os.path.join(pdf_dir, filename)

        width, height = A6
        c = canvas.Canvas(filepath, pagesize=A6)

        # Header
        c.setFillColor(colors.HexColor("#2563eb"))
        c.rect(0, height - 30 * mm, width, 30 * mm, fill=1, stroke=0)
        c.setFillColor(colors.white)
        c.setFont("Helvetica-Bold", 14)
        c.drawCentredString(width / 2, height - 15 * mm, "GlobeTrek AI")
        c.setFont("Helvetica", 9)
        c.drawCentredString(width / 2, height - 22 * mm, "Digital Ticket")

        # Body
        c.setFillColor(colors.black)
        y = height - 40 * mm
        line_gap = 7 * mm

        def _line(label, value):
            nonlocal y
            c.setFont("Helvetica-Bold", 8)
            c.drawString(10 * mm, y, label)
            c.setFont("Helvetica", 8)
            c.drawString(40 * mm, y, str(value or "—"))
            y -= line_gap

        _line("Event:", ticket.event_title)
        _line("Name:", ticket.holder_name)
        _line("Date:", ticket.visit_date)
        _line("Time:", ticket.time_slot)
        _line("Type:", ticket.ticket_type_name)
        _line("Seat:", ticket.seat_info or "General Admission")
        _line("Ticket ID:", ticket.ticket_uid[:16] + "...")

        # QR image
        qr_abs = os.path.join(_upload_folder(), "qr", f"qr_{ticket.ticket_uid}.png")
        if os.path.exists(qr_abs):
            try:
                c.drawImage(qr_abs, (width - 30 * mm) / 2, 8 * mm, 30 * mm, 30 * mm)
            except Exception:
                pass

        # Footer
        c.setFont("Helvetica", 6)
        c.setFillColor(colors.gray)
        c.drawCentredString(width / 2, 4 * mm, "Present this ticket at the gate • Do not share your QR code")

        c.save()
        return f"uploads/tickets/{filename}"

    except ImportError:
        logger.warning("reportlab not installed – PDF ticket skipped")
        return ""
    except Exception:
        logger.exception("PDF ticket generation failed for %s", ticket.ticket_uid)
        return ""


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def generate_tickets(booking: Booking) -> list[DigitalTicket]:
    """Create DigitalTicket records (with QR + PDF) for every BookingItem."""
    if booking.status != "CONFIRMED":
        raise ValueError("Cannot generate tickets for a non-confirmed booking")

    # Don't regenerate
    existing = DigitalTicket.query.filter_by(booking_id=booking.id).all()
    if existing:
        return existing

    tickets: list[DigitalTicket] = []

    try:
        event_title = ""
        if booking.event:
            event_title = booking.event.title
        elif booking.destination:
            event_title = booking.destination.name
        elif getattr(booking, "experience", None):
            event_title = booking.experience.experience_name

        visit_str = booking.visit_date.isoformat() if booking.visit_date else ""

        for item in booking.items:
            # For seated events each item.quantity == 1; for GA expand qty
            count = item.quantity
            for _ in range(count):
                uid = uuid.uuid4().hex
                qr_token = _make_qr_token(uid, booking.booking_ref)

                seat_info = ""
                if item.seat_id:
                    seat = db.session.get(Seat, item.seat_id)
                    if seat:
                        seat_info = f"{seat.section or ''}{seat.row_label}{seat.seat_number}".strip()

                ticket = DigitalTicket(
                    ticket_uid=uid,
                    booking_id=booking.id,
                    booking_item_id=item.id,
                    event_title=event_title,
                    holder_name=booking.customer_name,
                    visit_date=visit_str,
                    time_slot=booking.time_slot or "",
                    ticket_type_name=item.ticket_type.name if item.ticket_type else "",
                    seat_info=seat_info,
                    qr_token=qr_token,
                    status="VALID",
                )

                # Generate assets
                qr_path = _generate_qr_image(qr_token, f"qr_{uid}.png")
                ticket.qr_image_path = qr_path

                db.session.add(ticket)
                db.session.flush()  # get ticket.id

                pdf_path = _generate_pdf_ticket(ticket)
                ticket.pdf_path = pdf_path

                tickets.append(ticket)

        db.session.commit()
        logger.info(
            "Generated %d ticket(s) for booking %s", len(tickets), booking.booking_ref,
        )
        return tickets

    except Exception:
        db.session.rollback()
        logger.exception("generate_tickets failed for booking %s", booking.booking_ref)
        raise


def verify_ticket(qr_token_or_uid: str = "", qr_token: str = "",
                  scanned_by: int | None = None,
                  terminal_info: str = "") -> dict:
    """Verify a ticket by QR token or ticket_uid.

    Returns:
        {"valid": bool, "result": str, "ticket": dict | None, "message": str}
    """
    token_query = qr_token or qr_token_or_uid
    try:
        # Try lookup by ticket_uid first (short codes)
        ticket = DigitalTicket.query.filter_by(ticket_uid=token_query).first()

        if ticket is None:
            # Try by full qr_token
            ticket = DigitalTicket.query.filter_by(qr_token=token_query).first()

        if ticket is None:
            _record_scan(None, scanned_by, "INVALID", terminal_info)
            return {
                "valid": False,
                "result": "INVALID",
                "ticket": None,
                "message": "Ticket not found",
            }

        # Verify HMAC signature
        if not _verify_token_signature(ticket.qr_token):
            _record_scan(ticket.id, scanned_by, "INVALID", terminal_info)
            return {
                "valid": False,
                "result": "INVALID",
                "ticket": ticket.to_dict() if ticket else None,
                "message": "Ticket signature verification failed",
            }

        # Check status
        if ticket.status == "CANCELLED":
            _record_scan(ticket.id, scanned_by, "INVALID", terminal_info)
            return {
                "valid": False,
                "result": "CANCELLED",
                "ticket": ticket.to_dict() if ticket else None,
                "message": "This ticket has been cancelled",
            }

        if ticket.status == "EXPIRED":
            _record_scan(ticket.id, scanned_by, "EXPIRED", terminal_info)
            return {
                "valid": False,
                "result": "EXPIRED",
                "ticket": ticket.to_dict() if ticket else None,
                "message": "This ticket has expired",
            }

        if ticket.status == "USED":
            # Check for prior scan
            last_scan = TicketScan.query.filter_by(
                ticket_id=ticket.id,
                scan_result="VALID",
            ).order_by(TicketScan.scanned_at.desc()).first()
            _record_scan(ticket.id, scanned_by, "ALREADY_USED", terminal_info)
            return {
                "valid": False,
                "result": "ALREADY_USED",
                "ticket": ticket.to_dict() if ticket else None,
                "message": (
                    f"Ticket already used"
                    + (f" at {last_scan.scanned_at.strftime('%H:%M')}" if last_scan and last_scan.scanned_at else "")
                ),
            }

        # Ticket is VALID – mark as USED
        ticket.status = "USED"
        _record_scan(ticket.id, scanned_by, "VALID", terminal_info)
        db.session.commit()

        return {
            "valid": True,
            "result": "VALID",
            "ticket": ticket.to_dict() if ticket else None,
            "message": "Ticket verified successfully",
        }

    except Exception:
        db.session.rollback()
        logger.exception("verify_ticket failed")
        return {
            "valid": False,
            "result": "ERROR",
            "ticket": None,
            "message": "An error occurred during verification",
        }


def _record_scan(ticket_id: int | None, scanned_by: int | None,
                 result: str, terminal_info: str):
    """Persist a TicketScan record (best-effort)."""
    if ticket_id is None:
        return
    try:
        scan = TicketScan(
            ticket_id=ticket_id,
            scanned_by=scanned_by,
            scan_result=result,
            terminal_info=terminal_info or "",
        )
        db.session.add(scan)
        # commit will happen in the caller
    except Exception:
        logger.exception("_record_scan failed")


def get_ticket_pdf_path(ticket_uid: str) -> str | None:
    """Return the absolute file-system path for a ticket PDF, or None."""
    ticket = DigitalTicket.query.filter_by(ticket_uid=ticket_uid).first()
    if ticket is None or not ticket.pdf_path:
        return None
    abs_path = os.path.join(
        current_app.root_path, "static", ticket.pdf_path,
    )
    if os.path.exists(abs_path):
        return abs_path
    return None

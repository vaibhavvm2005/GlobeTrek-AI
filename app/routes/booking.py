"""Booking routes – ticket selection, reservation, payment, cancellation."""

from flask import (
    Blueprint, render_template, redirect, url_for, flash, request, current_app, abort
)
from flask_login import login_required, current_user

from app.extensions import db
from app.models import (
    Event, Destination, Experience, TicketType, Seat, Booking, BookingItem,
    Payment, DigitalTicket, Notification,
)
from app.services import booking_service, payment_service, ticket_service, notification_service

booking = Blueprint("booking", __name__, url_prefix="/booking")


# --------------------------------------------------------------------------- #
# Ticket selection page
# --------------------------------------------------------------------------- #

@booking.route("/select/<type>/<int:id>")
@login_required
def select_tickets(type, id):
    if type == "event":
        item = Event.query.get_or_404(id)
        ticket_types = TicketType.query.filter_by(event_id=item.id, is_active=True).all()
        seats = []
        if item.venue and item.venue.has_seating:
            seats = (
                Seat.query
                .filter_by(event_id=item.id, status="AVAILABLE", is_active=True)
                .order_by(Seat.section, Seat.row_label, Seat.seat_number)
                .all()
            )
    elif type == "destination":
        item = Destination.query.get_or_404(id)
        ticket_types = TicketType.query.filter_by(destination_id=item.id, is_active=True).all()
        seats = []
    elif type == "experience":
        item = Experience.query.get_or_404(id)
        if not item.booking_enabled:
            flash("This experience is currently in discovery mode. Online ticketing will open soon.", "info")
            return redirect(url_for("main.experience_detail", id=item.id))
        ticket_types = TicketType.query.filter_by(experience_id=item.id, is_active=True).all()
        if not ticket_types:
            default_tt = TicketType(
                experience_id=item.id,
                name="General Admission",
                price=item.ticket_price,
                quantity_total=item.availability,
                max_per_booking=10,
            )
            db.session.add(default_tt)
            db.session.commit()
            ticket_types = [default_tt]
        seats = []
    else:
        abort(404)

    return render_template(
        "booking/select_tickets.html",
        item=item,
        item_type=type,
        ticket_types=ticket_types,
        seats=seats,
    )


# --------------------------------------------------------------------------- #
# Reserve (create booking)
# --------------------------------------------------------------------------- #

@booking.route("/reserve", methods=["POST"])
@login_required
def reserve():
    try:
        item_type = request.form.get("item_type", "")
        item_id = request.form.get("item_id", 0, type=int)
        visit_date = request.form.get("visit_date", "")
        time_slot = request.form.get("time_slot", "")
        customer_name = request.form.get("customer_name", current_user.full_name)
        customer_email = request.form.get("customer_email", current_user.email)
        customer_phone = request.form.get("customer_phone", current_user.phone)
        idempotency_key = request.form.get("idempotency_key", "")

        # Collect ticket selections
        ticket_selections = []
        for key, value in request.form.items():
            if key.startswith("ticket_qty_"):
                tt_id = int(key.replace("ticket_qty_", ""))
                qty = int(value)
                if qty > 0:
                    ticket_selections.append({"ticket_type_id": tt_id, "quantity": qty})

        # Collect seat selections
        seat_ids = request.form.getlist("seat_ids", type=int)

        if not ticket_selections:
            flash("Please select at least one ticket.", "warning")
            return redirect(url_for("booking.select_tickets", type=item_type, id=item_id))

        result = booking_service.create_reservation(
            user=current_user,
            item_type=item_type,
            item_id=item_id,
            ticket_selections=ticket_selections,
            seat_ids=seat_ids,
            visit_date=visit_date,
            time_slot=time_slot,
            customer_name=customer_name,
            customer_email=customer_email,
            customer_phone=customer_phone,
            idempotency_key=idempotency_key,
        )

        if result.get("error"):
            flash(result["error"], "danger")
            return redirect(url_for("booking.select_tickets", type=item_type, id=item_id))

        return redirect(url_for("booking.summary", id=result["booking_id"]))

    except Exception as exc:
        current_app.logger.exception("Reservation error")
        flash(f"An error occurred: {exc}", "danger")
        item_type = request.form.get("item_type", "event")
        item_id = request.form.get("item_id", 0, type=int)
        return redirect(url_for("booking.select_tickets", type=item_type, id=item_id))


# --------------------------------------------------------------------------- #
# Booking summary
# --------------------------------------------------------------------------- #

@booking.route("/<int:id>/summary")
@login_required
def summary(id):
    bk = Booking.query.get_or_404(id)
    if bk.user_id != current_user.id and not current_user.is_admin:
        abort(403)

    return render_template("booking/summary.html", booking=bk)


# --------------------------------------------------------------------------- #
# Payment page
# --------------------------------------------------------------------------- #

@booking.route("/<int:id>/payment")
@login_required
def payment_page(id):
    bk = Booking.query.get_or_404(id)
    if bk.user_id != current_user.id:
        abort(403)
    if bk.status not in ("PENDING",):
        flash("This booking cannot be paid for.", "warning")
        return redirect(url_for("booking.summary", id=bk.id))

    payment_info = payment_service.create_payment_order(bk)

    return render_template(
        "booking/payment.html",
        booking=bk,
        payment_info=payment_info,
    )


# --------------------------------------------------------------------------- #
# Process payment
# --------------------------------------------------------------------------- #

@booking.route("/<int:id>/pay", methods=["POST"])
@login_required
def pay(id):
    bk = Booking.query.get_or_404(id)
    if bk.user_id != current_user.id:
        abort(403)
    if bk.status not in ("PENDING",):
        flash("This booking cannot be paid for.", "warning")
        return redirect(url_for("booking.summary", id=bk.id))

    is_simulated = request.form.get("simulated", "false") == "true"

    try:
        if is_simulated:
            pay_result = payment_service.simulate_payment(bk)
        else:
            razorpay_payment_id = request.form.get("razorpay_payment_id", "")
            razorpay_order_id = request.form.get("razorpay_order_id", "")
            razorpay_signature = request.form.get("razorpay_signature", "")
            pay_result = payment_service.verify_payment(
                booking=bk,
                razorpay_payment_id=razorpay_payment_id,
                razorpay_order_id=razorpay_order_id,
                razorpay_signature=razorpay_signature,
            )

        if pay_result.get("error"):
            flash(pay_result["error"], "danger")
            return redirect(url_for("booking.payment_page", id=bk.id))

        # Generate digital tickets
        ticket_service.generate_tickets(bk)

        # Send confirmation notification
        notification_service.send_booking_confirmation(bk)

        flash("Payment successful! Your tickets are ready.", "success")
        return redirect(url_for("booking.success", id=bk.id))

    except Exception as exc:
        current_app.logger.exception("Payment error")
        flash(f"Payment processing error: {exc}", "danger")
        return redirect(url_for("booking.payment_page", id=bk.id))


# --------------------------------------------------------------------------- #
# Success page
# --------------------------------------------------------------------------- #

@booking.route("/<int:id>/success")
@login_required
def success(id):
    bk = Booking.query.get_or_404(id)
    if bk.user_id != current_user.id and not current_user.is_admin:
        abort(403)

    tickets = DigitalTicket.query.filter_by(booking_id=bk.id).all()

    return render_template("booking/success.html", booking=bk, tickets=tickets)


# --------------------------------------------------------------------------- #
# Cancel booking
# --------------------------------------------------------------------------- #

@booking.route("/<int:id>/cancel", methods=["POST"])
@login_required
def cancel(id):
    bk = Booking.query.get_or_404(id)
    if bk.user_id != current_user.id and not current_user.is_admin:
        abort(403)

    result = booking_service.cancel_booking(bk, current_user)

    if result.get("error"):
        flash(result["error"], "danger")
    else:
        flash("Booking cancelled successfully.", "success")

    return redirect(url_for("customer.bookings"))

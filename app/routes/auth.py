"""Authentication routes – login, register, logout, profile, forgot-password."""

from flask import (
    Blueprint, render_template, redirect, url_for, flash, request, current_app
)
from flask_login import login_user, logout_user, login_required, current_user

from app.extensions import db
from app.models import User

auth = Blueprint("auth", __name__, url_prefix="/auth")


# --------------------------------------------------------------------------- #
# Login
# --------------------------------------------------------------------------- #

@auth.route("/login", methods=["GET", "POST"])
def login():
    if current_user.is_authenticated and request.method == "GET":
        return redirect(url_for("main.index"))

    if request.method == "POST":
        login_id = request.form.get("login_id", "").strip()
        password = request.form.get("password", "")
        remember = bool(request.form.get("remember"))

        user = User.query.filter(
            (User.email == login_id) | (User.username == login_id)
        ).first()

        if user is None or not user.check_password(password):
            flash("Invalid credentials. Please try again.", "danger")
            return render_template("auth/login.html", login_id=login_id)

        if not user.is_active:
            flash("Your account has been deactivated. Contact support.", "warning")
            return render_template("auth/login.html", login_id=login_id)

        login_user(user, remember=remember)
        flash(f"Welcome back, {user.full_name}!", "success")

        next_page = request.args.get("next")
        return redirect(next_page or url_for("main.index"))

    return render_template("auth/login.html", login_id="")


# --------------------------------------------------------------------------- #
# Register
# --------------------------------------------------------------------------- #

@auth.route("/register", methods=["GET", "POST"])
def register():
    if current_user.is_authenticated:
        return redirect(url_for("main.index"))

    if request.method == "POST":
        username = request.form.get("username", "").strip()
        email = request.form.get("email", "").strip().lower()
        full_name = request.form.get("full_name", "").strip()
        phone = request.form.get("phone", "").strip()
        password = request.form.get("password", "")
        confirm = request.form.get("confirm_password", "")
        role = request.form.get("role", "CUSTOMER").upper()

        # --- validation ---
        errors = []
        if not username or not email or not full_name or not password:
            errors.append("All required fields must be filled in.")
        if password != confirm:
            errors.append("Passwords do not match.")
        if len(password) < 6:
            errors.append("Password must be at least 6 characters.")
        if role not in ("CUSTOMER", "ORGANIZER"):
            errors.append("Invalid role selection.")
        if User.query.filter_by(email=email).first():
            errors.append("Email is already registered.")
        if User.query.filter_by(username=username).first():
            errors.append("Username is already taken.")

        if errors:
            for e in errors:
                flash(e, "danger")
            return render_template(
                "auth/register.html",
                username=username, email=email, full_name=full_name,
                phone=phone, role=role,
            )

        user = User(
            username=username,
            email=email,
            full_name=full_name,
            phone=phone,
            role=role,
        )
        user.set_password(password)
        db.session.add(user)
        db.session.commit()

        flash("Registration successful! Please log in.", "success")
        return redirect(url_for("auth.login"))

    return render_template(
        "auth/register.html",
        username="", email="", full_name="", phone="", role="CUSTOMER",
    )


# --------------------------------------------------------------------------- #
# Logout
# --------------------------------------------------------------------------- #

@auth.route("/logout")
@login_required
def logout():
    logout_user()
    flash("You have been logged out.", "info")
    return redirect(url_for("main.index"))


# --------------------------------------------------------------------------- #
# Profile
# --------------------------------------------------------------------------- #

@auth.route("/profile", methods=["GET", "POST"])
@login_required
def profile():
    if request.method == "POST":
        current_user.full_name = request.form.get("full_name", current_user.full_name).strip()
        current_user.phone = request.form.get("phone", current_user.phone).strip()
        current_user.avatar = request.form.get("avatar", current_user.avatar).strip()

        new_password = request.form.get("new_password", "").strip()
        if new_password:
            if len(new_password) < 6:
                flash("Password must be at least 6 characters.", "danger")
                return render_template("auth/profile.html", user=current_user)
            current_user.set_password(new_password)

        db.session.commit()
        flash("Profile updated successfully.", "success")
        return redirect(url_for("auth.profile"))

    return render_template("auth/profile.html", user=current_user)


# --------------------------------------------------------------------------- #
# Forgot password (stub)
# --------------------------------------------------------------------------- #

@auth.route("/forgot-password", methods=["GET", "POST"])
def forgot_password():
    if request.method == "POST":
        email = request.form.get("email", "").strip().lower()
        # Always show success to prevent user enumeration
        flash(
            "If an account with that email exists, a password-reset link has been sent.",
            "success",
        )
        return redirect(url_for("auth.login"))

    return render_template("auth/forgot_password.html")

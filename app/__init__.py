"""GlobeTrek AI – Flask Application Factory."""
import os
from flask import Flask, render_template
from app.config import Config
from app.extensions import db, login_manager, mail, csrf, migrate


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize extensions
    db.init_app(app)
    login_manager.init_app(app)
    mail.init_app(app)
    csrf.init_app(app)
    migrate.init_app(app, db)

    # Ensure upload directories exist
    upload_folder = app.config.get("UPLOAD_FOLDER")
    if upload_folder:
        os.makedirs(os.path.join(upload_folder, "qr"), exist_ok=True)
        os.makedirs(os.path.join(upload_folder, "tickets"), exist_ok=True)

    # Register blueprints
    from app.routes.main import main as main_bp
    from app.routes.auth import auth as auth_bp
    from app.routes.booking import booking as booking_bp
    from app.routes.customer import customer as customer_bp
    from app.routes.organizer import organizer as organizer_bp
    from app.routes.admin import admin as admin_bp
    from app.routes.api import api as api_bp

    app.register_blueprint(main_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(booking_bp)
    app.register_blueprint(customer_bp)
    app.register_blueprint(organizer_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(api_bp)

    # Context processors for global template variables
    @app.context_processor
    def inject_globals():
        from flask_login import current_user
        from app.models import Notification

        unread_notifications_count = 0
        if current_user and current_user.is_authenticated:
            try:
                unread_notifications_count = Notification.query.filter_by(
                    user_id=current_user.id, is_read=False
                ).count()
            except Exception:
                unread_notifications_count = 0

        return {
            "app_name": "GlobeTrek AI",
            "tagline": "Discover the World. Experience More. Book Smarter.",
            "unread_notifications_count": unread_notifications_count,
        }

    # Error handlers
    @app.errorhandler(403)
    def forbidden(e):
        return render_template("errors/403.html"), 403

    @app.errorhandler(404)
    def page_not_found(e):
        return render_template("errors/404.html"), 404

    @app.errorhandler(500)
    def internal_server_error(e):
        return render_template("errors/500.html"), 500

    return app


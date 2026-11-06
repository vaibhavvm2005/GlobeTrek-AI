"""GlobeTrek AI – Server Entrypoint."""
import os
from app import create_app
from app.extensions import db
from app.seed import seed_database

app = create_app()

with app.app_context():
    db.create_all()
    seed_database()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)


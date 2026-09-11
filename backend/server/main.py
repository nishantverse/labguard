"""
LabGuard — Flask Application Entry Point
=========================================
Run from the backend/ directory:
    python -m server.main

Or with a custom host/port:
    LABGUARD_HOST=0.0.0.0 LABGUARD_PORT=8080 python -m server.main
"""

import logging
import sys
import os
from flask_cors import CORS

_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

from flask import Flask, jsonify

from database.database import init_db
from server.routes.computers import computers_bp
from server.routes.heartbeat import heartbeat_bp
from server.routes.events import events_bp
from server.routes.alerts import alerts_bp
from server.routes.dashboard import dashboard_bp
from config import SERVER_HOST, SERVER_PORT, DEBUG

logging.basicConfig(
    level=logging.DEBUG if DEBUG else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# Import single SocketIO instance defined in server.ws
from server.ws import socketio


def create_app() -> Flask:
    """Application factory — creates and configures the Flask app."""
    app = Flask(__name__)
    CORS(app)

    # Initialize SocketIO with threading async mode
    socketio.init_app(app, cors_allowed_origins="*", async_mode="threading")

    # Initialize DB schema on startup (idempotent)
    init_db()

    # ── Register blueprints ──────────────────────────────────────────────
    app.register_blueprint(computers_bp)
    app.register_blueprint(heartbeat_bp)
    app.register_blueprint(events_bp)
    app.register_blueprint(alerts_bp)
    app.register_blueprint(dashboard_bp)

    # ── Root endpoint ────────────────────────────────────────────────────
    @app.route("/")
    def index():
        return jsonify(
            {
                "success": True,
                "data": {
                    "name": "LabGuard API",
                    "version": "1.1.0",
                    "status": "running",
                    "websocket": "enabled",
                    "docs": "See README.md for the full API contract",
                },
            }
        )

    # ── Global error handlers ────────────────────────────────────────────
    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({"success": False, "error": "Bad request"}), 400

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"success": False, "error": "Resource not found"}), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({"success": False, "error": "Method not allowed"}), 405

    @app.errorhandler(500)
    def internal_error(e):
        logger.error(f"Unhandled server error: {e}")
        return jsonify({"success": False, "error": "Internal server error"}), 500

    # ── SocketIO event handlers ──────────────────────────────────────────
    @socketio.on("connect")
    def handle_connect():
        logger.info("WebSocket client connected")

    @socketio.on("disconnect")
    def handle_disconnect():
        logger.info("WebSocket client disconnected")

    return app


# Module-level app instance for Flask CLI / WSGI servers (gunicorn etc.)
app = create_app()


if __name__ == "__main__":
    logger.info(f"Starting LabGuard server on {SERVER_HOST}:{SERVER_PORT} (debug={DEBUG})")
    socketio.run(app, host=SERVER_HOST, port=SERVER_PORT, debug=DEBUG,
                 allow_unsafe_werkzeug=True)
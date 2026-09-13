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

from flask import Flask, jsonify, request

from database.database import init_db
from server.routes.computers import computers_bp
from server.routes.heartbeat import heartbeat_bp
from server.routes.events import events_bp
from server.routes.alerts import alerts_bp
from server.routes.dashboard import dashboard_bp
from server.routes.install import install_bp
from config import SERVER_HOST, SERVER_PORT, DEBUG

logging.basicConfig(
    level=logging.DEBUG if DEBUG else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
# Suppress noisy library debug logs (watchdog inotify scanning, engineio ping/pong)
logging.getLogger("watchdog").setLevel(logging.WARNING)
logging.getLogger("engineio").setLevel(logging.WARNING)
logging.getLogger("socketio").setLevel(logging.WARNING)

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
    app.register_blueprint(install_bp)

    # ── Root endpoint ────────────────────────────────────────────────────
    @app.route("/")
    def index():
        host_url = request.host_url.rstrip("/")
        return jsonify(
            {
                "success": True,
                "data": {
                    "name": "LabGuard API",
                    "version": "1.1.0",
                    "status": "running",
                    "websocket": "enabled",
                    "agent_install": {
                        "linux": f"curl -sSL {host_url}/script.sh | bash",
                        "windows": f"irm {host_url}/script.ps1 | iex",
                    },
                    "docs": "See README.md and HOW_TO_USE.md for details",
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


def _get_lan_ip() -> str:
    """Detect the local outbound IP address for network discovery."""
    import socket
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except Exception:
        return "127.0.0.1"


if __name__ == "__main__":
    lan_ip = _get_lan_ip()
    network_url = f"http://{lan_ip}:{SERVER_PORT}"
    banner = f"""
======================================================================
🛡️  LabGuard Server is live!
   Local URL   : http://127.0.0.1:{SERVER_PORT}
   Network URL : {network_url}

📦 Client Agent One-Line Auto-Installers:
   (Run on any computer in your lab to automatically install & link)

   🐧 Linux:
      curl -sSL {network_url}/script.sh | bash

   🪟 Windows (PowerShell):
      irm {network_url}/script.ps1 | iex
======================================================================
"""
    print(banner)
    logger.info(f"Starting LabGuard server on {SERVER_HOST}:{SERVER_PORT} (debug={DEBUG})")
    socketio.run(app, host=SERVER_HOST, port=SERVER_PORT, debug=DEBUG,
                 allow_unsafe_werkzeug=True)
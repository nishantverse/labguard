"""
Heartbeat Route
===============
POST /api/heartbeat

Called by the LabGuard Agent on a regular interval.
If the computer exists → updates ip_address, status, last_seen.
If the computer is new  → auto-registers it and marks it online.

Request body:
    {"hostname": "LAB-PC-01", "ip_address": "192.168.1.50"}
"""

from flask import Blueprint, request

from database.database import get_db
from server.routes.helpers import success, error
from server.ws import broadcast
from server.routes.dashboard import get_dashboard_summary

heartbeat_bp = Blueprint("heartbeat", __name__)


@heartbeat_bp.route("/api/heartbeat", methods=["POST"])
def heartbeat():
    data = request.get_json(silent=True)
    if not data:
        return error("Request body must be JSON", 400)

    hostname = (data.get("hostname") or "").strip().lower()
    if not hostname:
        return error("hostname is required", 400)

    ip_address = (data.get("ip_address") or "").strip() or None

    db = get_db()
    try:
        computer = db.execute(
            "SELECT id FROM computers WHERE LOWER(hostname) = ?", (hostname,)
        ).fetchone()

        if computer:
            db.execute(
                """
                UPDATE computers
                SET ip_address = ?,
                    status     = 'online',
                    last_seen  = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (ip_address, computer["id"]),
            )
            computer_id = computer["id"]
        else:
            # Auto-register on first heartbeat
            cursor = db.execute(
                """
                INSERT INTO computers (hostname, ip_address, status, last_seen)
                VALUES (?, ?, 'online', CURRENT_TIMESTAMP)
                """,
                (hostname, ip_address),
            )
            computer_id = cursor.lastrowid

        db.commit()
        # Broadcast computer status update via WebSocket
        broadcast('computer_status', {'computer_id': computer_id, 'hostname': hostname, 'status': 'online'})
        try:
            broadcast('dashboard_update', get_dashboard_summary())
        except Exception:
            pass
        return success({"computer_id": computer_id, "hostname": hostname, "status": "online"})
    except Exception:
        return error("Heartbeat processing failed", 500)
    finally:
        db.close()


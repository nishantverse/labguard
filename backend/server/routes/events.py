"""
Events Route
============
GET  /api/events              — List events (filters: computer_id, event_type, limit)
GET  /api/events/<id>         — Get one event
POST /api/events              — Create an event; triggers alert rules automatically

Valid event_type values (expand VALID_EVENT_TYPES as the project grows):
    usb_connected, usb_disconnected, suspicious_file,
    unauthorized_access, large_file_detected, computer_offline,
    folder_change, agent_started, agent_stopped
"""

import json
import logging

from flask import Blueprint, request

from database.database import get_db
from server.routes.helpers import success, error, fmt_ts
from server.services.alert_service import process_event, ALERT_RULES
from server.ws import broadcast
from server.routes.dashboard import get_dashboard_summary

logger = logging.getLogger(__name__)
events_bp = Blueprint("events", __name__)

# All recognised event types. Extend this set when adding new monitoring modules.
VALID_EVENT_TYPES = {
    "usb_connected",
    "usb_disconnected",
    "suspicious_file",
    "unauthorized_access",
    "large_file_detected",
    "computer_offline",
    "folder_change",
    "agent_started",
    "agent_stopped",
}


# ── Helpers ──────────────────────────────────────────────────────────────────

def _format(row) -> dict:
    """Deserialize the metadata JSON string back to a dict and normalize timestamps."""
    d = dict(row)
    if d.get("metadata"):
        try:
            d["metadata"] = json.loads(d["metadata"])
        except (json.JSONDecodeError, TypeError):
            pass  # Leave as raw string if unparseable
    d["timestamp"] = fmt_ts(d.get("timestamp"))
    return d


# ── Routes ───────────────────────────────────────────────────────────────────

@events_bp.route("/api/events", methods=["GET"])
def list_events():
    computer_id = request.args.get("computer_id")
    event_type  = request.args.get("event_type")
    try:
        limit = min(int(request.args.get("limit", 100)), 500)
    except ValueError:
        return error("limit must be an integer", 400)

    db = get_db()
    try:
        sql = """
            SELECT e.*, c.hostname
            FROM events e
            JOIN computers c ON e.computer_id = c.id
            WHERE 1=1
        """
        params: list = []

        if computer_id:
            sql += " AND e.computer_id = ?"
            params.append(computer_id)
        if event_type:
            sql += " AND e.event_type = ?"
            params.append(event_type)

        sql += " ORDER BY e.timestamp DESC LIMIT ?"
        params.append(limit)

        rows = db.execute(sql, params).fetchall()
        return success([_format(r) for r in rows])
    except Exception:
        return error("Failed to retrieve events", 500)
    finally:
        db.close()


@events_bp.route("/api/events/<int:event_id>", methods=["GET"])
def get_event(event_id):
    db = get_db()
    try:
        row = db.execute(
            """
            SELECT e.*, c.hostname
            FROM events e
            JOIN computers c ON e.computer_id = c.id
            WHERE e.id = ?
            """,
            (event_id,),
        ).fetchone()
        if row is None:
            return error(f"Event {event_id} not found", 404)
        return success(_format(row))
    except Exception:
        return error("Failed to retrieve event", 500)
    finally:
        db.close()


@events_bp.route("/api/events", methods=["POST"])
def create_event():
    data = request.get_json(silent=True)
    if not data:
        return error("Request body must be JSON", 400)

    # ── Validate required fields ──────────────────────────────────────────
    hostname = (data.get("hostname") or "").strip().lower()
    if not hostname:
        return error("hostname is required", 400)

    event_type = (data.get("event_type") or "").strip()
    if not event_type:
        return error("event_type is required", 400)
    if event_type not in VALID_EVENT_TYPES:
        return error(
            f"Invalid event_type '{event_type}'. "
            f"Valid types: {sorted(VALID_EVENT_TYPES)}",
            400,
        )

    description = (data.get("description") or "").strip() or None

    metadata = data.get("metadata")
    metadata_str = None
    if metadata is not None:
        if not isinstance(metadata, dict):
            return error("metadata must be a JSON object", 400)
        metadata_str = json.dumps(metadata)

    db = get_db()
    try:
        # ── Resolve computer ──────────────────────────────────────────────
        computer = db.execute(
            "SELECT id, hostname FROM computers WHERE LOWER(hostname) = ?", (hostname,)
        ).fetchone()
        if computer is None:
            return error(
                f"Unknown computer '{hostname}'. "
                "The computer must send a heartbeat or be registered before posting events.",
                404,
            )

        computer_id = computer["id"]

        # ── Insert event ──────────────────────────────────────────────────
        cursor = db.execute(
            """
            INSERT INTO events (computer_id, event_type, description, metadata)
            VALUES (?, ?, ?, ?)
            """,
            (computer_id, event_type, description, metadata_str),
        )
        db.commit()
        event_id = cursor.lastrowid

        # ── Trigger alert rules ───────────────────────────────────────────
        alert_id = process_event(
            db=db,
            event_id=event_id,
            computer_id=computer_id,
            event_type=event_type,
            description=description or "",
            hostname=hostname,
        )

        # ── Return created event ──────────────────────────────────────────
        row = db.execute(
            """
            SELECT e.*, c.hostname
            FROM events e
            JOIN computers c ON e.computer_id = c.id
            WHERE e.id = ?
            """,
            (event_id,),
        ).fetchone()

        result = _format(row)
        if alert_id is not None:
            result["alert_created"] = True
            result["alert_id"] = alert_id
        else:
            result["alert_created"] = False

        # ── Broadcast real-time updates ────────────────────────────────
        broadcast('new_event', result)
        try:
            broadcast('dashboard_update', get_dashboard_summary())
        except Exception:
            pass  # Dashboard broadcast failure shouldn't break event creation

        return success(result, 201)
    except Exception as exc:
        logger.error(f"Error creating event: {exc}")
        return error("Failed to create event", 500)
    finally:
        db.close()


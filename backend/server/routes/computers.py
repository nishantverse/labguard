"""
Computers Route
===============
GET    /api/computers          — List all registered computers
GET    /api/computers/<id>     — Get one computer
POST   /api/computers          — Register a computer (explicit)
DELETE /api/computers/<id>     — Remove a computer + its events/alerts

Online status is computed passively at query time from last_seen vs the
configured HEARTBEAT_TIMEOUT_SECONDS — the database status column is NOT
used for the "online" field in responses.
"""

from flask import Blueprint, request
from datetime import datetime, timedelta, timezone

from database.database import get_db
from server.routes.helpers import success, error, fmt_ts
from config import HEARTBEAT_TIMEOUT_SECONDS

computers_bp = Blueprint("computers", __name__)


# ── Helpers ──────────────────────────────────────────────────────────────────

def _is_online(last_seen_str: str | None) -> bool:
    """
    Return True if last_seen is within the configured heartbeat timeout.
    Uses UTC for comparison; SQLite CURRENT_TIMESTAMP stores UTC.
    """
    if not last_seen_str:
        return False
    try:
        last_seen = datetime.fromisoformat(last_seen_str)
        if last_seen.tzinfo is None:
            last_seen = last_seen.replace(tzinfo=timezone.utc)
        cutoff = datetime.now(timezone.utc) - timedelta(seconds=HEARTBEAT_TIMEOUT_SECONDS)
        return last_seen >= cutoff
    except Exception:
        return False


def _format(row) -> dict:
    """
    Convert a DB Row to a plain dict with:
      - 'online': computed live from last_seen vs timeout
      - 'status': kept in sync with 'online' so they never contradict
      - timestamps: ISO 8601 with 'Z' suffix (UTC) for correct frontend display
    """
    d = dict(row)
    online = _is_online(d.get("last_seen"))
    d["online"] = online
    # Keep status consistent with the computed live value so the response
    # never shows "status: online" alongside "online: false".
    d["status"] = "online" if online else "offline"
    d["last_seen"]     = fmt_ts(d.get("last_seen"))
    d["registered_at"] = fmt_ts(d.get("registered_at"))
    return d


# ── Routes ───────────────────────────────────────────────────────────────────

@computers_bp.route("/api/computers", methods=["GET"])
def list_computers():
    db = get_db()
    try:
        rows = db.execute(
            "SELECT * FROM computers ORDER BY hostname ASC"
        ).fetchall()
        return success([_format(r) for r in rows])
    except Exception as exc:
        return error("Failed to retrieve computers", 500)
    finally:
        db.close()


@computers_bp.route("/api/computers/<int:computer_id>", methods=["GET"])
def get_computer(computer_id):
    db = get_db()
    try:
        row = db.execute(
            "SELECT * FROM computers WHERE id = ?", (computer_id,)
        ).fetchone()
        if row is None:
            return error(f"Computer {computer_id} not found", 404)
        return success(_format(row))
    except Exception:
        return error("Failed to retrieve computer", 500)
    finally:
        db.close()


@computers_bp.route("/api/computers", methods=["POST"])
def register_computer():
    data = request.get_json(silent=True)
    if not data:
        return error("Request body must be JSON", 400)

    hostname = (data.get("hostname") or "").strip()
    if not hostname:
        return error("hostname is required", 400)

    ip_address = (data.get("ip_address") or "").strip() or None

    db = get_db()
    try:
        existing = db.execute(
            "SELECT id FROM computers WHERE hostname = ?", (hostname,)
        ).fetchone()
        if existing:
            return error(f"A computer with hostname '{hostname}' is already registered", 409)

        cursor = db.execute(
            "INSERT INTO computers (hostname, ip_address, status) VALUES (?, ?, 'offline')",
            (hostname, ip_address),
        )
        db.commit()

        row = db.execute(
            "SELECT * FROM computers WHERE id = ?", (cursor.lastrowid,)
        ).fetchone()
        return success(_format(row), 201)
    except Exception:
        return error("Failed to register computer", 500)
    finally:
        db.close()


@computers_bp.route("/api/computers/<int:computer_id>", methods=["DELETE"])
def delete_computer(computer_id):
    db = get_db()
    try:
        row = db.execute(
            "SELECT id FROM computers WHERE id = ?", (computer_id,)
        ).fetchone()
        if row is None:
            return error(f"Computer {computer_id} not found", 404)

        # Remove dependents first (SQLite FK cascade is off by default)
        db.execute("DELETE FROM alerts WHERE computer_id = ?", (computer_id,))
        db.execute("DELETE FROM events  WHERE computer_id = ?", (computer_id,))
        db.execute("DELETE FROM computers WHERE id = ?",        (computer_id,))
        db.commit()
        return success({"message": f"Computer {computer_id} deleted"})
    except Exception:
        return error("Failed to delete computer", 500)
    finally:
        db.close()


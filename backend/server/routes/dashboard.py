"""
Dashboard Route
===============
GET /api/dashboard/summary

Returns aggregate metrics for the admin dashboard:
  - total_computers
  - online_computers   (last_seen within HEARTBEAT_TIMEOUT_SECONDS)
  - offline_computers
  - active_alerts      (acknowledged = 0)
  - recent_events      (10 most recent, with metadata parsed)

All values are computed from live database queries — no hardcoded data.
"""

import json
from datetime import datetime, timedelta, timezone

from flask import Blueprint

from database.database import get_db
from server.routes.helpers import success, error, fmt_ts
from config import HEARTBEAT_TIMEOUT_SECONDS

dashboard_bp = Blueprint("dashboard", __name__)


@dashboard_bp.route("/api/dashboard/summary", methods=["GET"])
def dashboard_summary():
    db = get_db()
    try:
        # Compute UTC cutoff timestamp in SQLite-compatible format
        cutoff = (
            datetime.now(timezone.utc) - timedelta(seconds=HEARTBEAT_TIMEOUT_SECONDS)
        ).strftime("%Y-%m-%d %H:%M:%S")

        total_computers = db.execute(
            "SELECT COUNT(*) FROM computers"
        ).fetchone()[0]

        online_computers = db.execute(
            "SELECT COUNT(*) FROM computers WHERE last_seen >= ?", (cutoff,)
        ).fetchone()[0]

        active_alerts = db.execute(
            "SELECT COUNT(*) FROM alerts WHERE acknowledged = 0"
        ).fetchone()[0]

        recent_event_rows = db.execute(
            """
            SELECT e.id, e.event_type, e.description, e.metadata, e.timestamp, c.hostname
            FROM events e
            JOIN computers c ON e.computer_id = c.id
            ORDER BY e.timestamp DESC
            LIMIT 10
            """
        ).fetchall()

        recent_events = []
        for row in recent_event_rows:
            d = dict(row)
            if d.get("metadata"):
                try:
                    d["metadata"] = json.loads(d["metadata"])
                except (json.JSONDecodeError, TypeError):
                    pass
            d["timestamp"] = fmt_ts(d.get("timestamp"))
            recent_events.append(d)

        return success(
            {
                "total_computers":  total_computers,
                "online_computers": online_computers,
                "offline_computers": total_computers - online_computers,
                "active_alerts":    active_alerts,
                "recent_events":    recent_events,
            }
        )
    except Exception:
        return error("Failed to retrieve dashboard summary", 500)
    finally:
        db.close()


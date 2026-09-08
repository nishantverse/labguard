"""
Alerts Route
============
GET   /api/alerts                          — List alerts (filters: acknowledged, severity, limit)
GET   /api/alerts/<id>                     — Get one alert
PATCH /api/alerts/<id>/acknowledge         — Mark an alert as acknowledged

Query parameters for GET /api/alerts:
    acknowledged=false   → only active alerts
    acknowledged=true    → only acknowledged alerts
    severity=HIGH        → filter by severity level
    limit=100            → max results (capped at 500)
"""

from flask import Blueprint, request

from database.database import get_db
from server.routes.helpers import success, error, fmt_ts
from server.services.alert_service import SEVERITIES

alerts_bp = Blueprint("alerts", __name__)


# ── Helpers ──────────────────────────────────────────────────────────────────

def _format(row) -> dict:
    d = dict(row)
    d["acknowledged"] = bool(d["acknowledged"])
    d["created_at"] = fmt_ts(d.get("created_at"))
    return d


# ── Routes ───────────────────────────────────────────────────────────────────

@alerts_bp.route("/api/alerts", methods=["GET"])
def list_alerts():
    acknowledged_param = request.args.get("acknowledged")
    severity_param     = request.args.get("severity", "").upper()
    try:
        limit = min(int(request.args.get("limit", 100)), 500)
    except ValueError:
        return error("limit must be an integer", 400)

    if severity_param and severity_param not in SEVERITIES:
        return error(f"Invalid severity. Valid values: {list(SEVERITIES)}", 400)

    db = get_db()
    try:
        sql = """
            SELECT a.*, c.hostname
            FROM alerts a
            JOIN computers c ON a.computer_id = c.id
            WHERE 1=1
        """
        params: list = []

        if acknowledged_param is not None:
            if acknowledged_param.lower() == "false":
                sql += " AND a.acknowledged = 0"
            elif acknowledged_param.lower() == "true":
                sql += " AND a.acknowledged = 1"

        if severity_param:
            sql += " AND a.severity = ?"
            params.append(severity_param)

        sql += " ORDER BY a.created_at DESC LIMIT ?"
        params.append(limit)

        rows = db.execute(sql, params).fetchall()
        return success([_format(r) for r in rows])
    except Exception:
        return error("Failed to retrieve alerts", 500)
    finally:
        db.close()


@alerts_bp.route("/api/alerts/<int:alert_id>", methods=["GET"])
def get_alert(alert_id):
    db = get_db()
    try:
        row = db.execute(
            """
            SELECT a.*, c.hostname
            FROM alerts a
            JOIN computers c ON a.computer_id = c.id
            WHERE a.id = ?
            """,
            (alert_id,),
        ).fetchone()
        if row is None:
            return error(f"Alert {alert_id} not found", 404)
        return success(_format(row))
    except Exception:
        return error("Failed to retrieve alert", 500)
    finally:
        db.close()


@alerts_bp.route("/api/alerts/<int:alert_id>/acknowledge", methods=["PATCH"])
def acknowledge_alert(alert_id):
    db = get_db()
    try:
        row = db.execute(
            "SELECT id, acknowledged FROM alerts WHERE id = ?", (alert_id,)
        ).fetchone()
        if row is None:
            return error(f"Alert {alert_id} not found", 404)

        if row["acknowledged"]:
            return success({"message": "Alert was already acknowledged", "alert_id": alert_id})

        db.execute(
            "UPDATE alerts SET acknowledged = 1 WHERE id = ?", (alert_id,)
        )
        db.commit()
        return success({"message": "Alert acknowledged", "alert_id": alert_id})
    except Exception:
        return error("Failed to acknowledge alert", 500)
    finally:
        db.close()


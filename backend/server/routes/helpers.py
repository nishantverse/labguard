"""
Shared response helpers for all route modules.
Ensures a consistent JSON envelope across every endpoint.

Success:  {"success": true,  "data": <payload>}
Error:    {"success": false, "error": "<message>"}
"""

from datetime import datetime, timezone

from flask import jsonify


def success(data, status: int = 200):
    """Return a successful JSON response."""
    return jsonify({"success": True, "data": data}), status


def error(message: str, status: int = 400):
    """Return an error JSON response."""
    return jsonify({"success": False, "error": message}), status


def fmt_ts(ts_str: str | None) -> str | None:
    """
    Convert a SQLite UTC timestamp string to the server's local timezone.

    SQLite CURRENT_TIMESTAMP stores 'YYYY-MM-DD HH:MM:SS' in UTC.
    This function:
      1. Parses it as UTC
      2. Converts to the server's local timezone via astimezone()
      3. Returns ISO 8601 with explicit offset, e.g. '2026-09-09T00:14:13+05:30'

    This means Postman and the browser both see local time correctly without
    any hardcoded offsets anywhere in the codebase.

    Returns None if the input is None or empty.
    Falls back to appending 'Z' (UTC) if parsing fails.
    """
    if not ts_str:
        return None
    try:
        # SQLite gives us 'YYYY-MM-DD HH:MM:SS' with no timezone — treat as UTC
        utc_dt = datetime.fromisoformat(ts_str).replace(tzinfo=timezone.utc)
        # Convert to the server's local timezone (e.g. IST = UTC+05:30)
        local_dt = utc_dt.astimezone()
        # Return as plain readable local time: "2026-09-09 00:20:20"
        return local_dt.strftime("%Y-%m-%d %H:%M:%S")
    except Exception:
        return ts_str  # safe fallback: return original string unchanged


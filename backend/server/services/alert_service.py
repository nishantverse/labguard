"""
Alert Service
=============
Converts detected events into alerts based on a simple rule table.

To add a new alert rule, add an entry to ALERT_RULES below.
No other code needs to change.

Severity levels (lowest → highest):
    INFO | LOW | MEDIUM | HIGH | CRITICAL
"""

import logging

logger = logging.getLogger(__name__)

# ── Severity constants ────────────────────────────────────────────────────────
SEVERITIES = ("INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL")

# ── Alert rules ───────────────────────────────────────────────────────────────
# Keys must match the event_type values accepted by the events route.
# message_template supports {hostname} and {description} placeholders.
ALERT_RULES: dict = {
    "usb_connected": {
        "severity": "HIGH",
        "message_template": "USB device connected on {hostname}: {description}",
    },
    "usb_disconnected": {
        "severity": "INFO",
        "message_template": "USB device disconnected on {hostname}",
    },
    "suspicious_file": {
        "severity": "CRITICAL",
        "message_template": "Suspicious file detected on {hostname}: {description}",
    },
    "unauthorized_access": {
        "severity": "HIGH",
        "message_template": "Unauthorized access attempt on {hostname}: {description}",
    },
    "large_file_detected": {
        "severity": "LOW",
        "message_template": "Large file detected on {hostname}: {description}",
    },
    "computer_offline": {
        "severity": "MEDIUM",
        "message_template": "Computer {hostname} appears to be offline",
    },
    "folder_change": {
        "severity": "LOW",
        "message_template": "Monitored folder changed on {hostname}: {description}",
    },
    # agent_started / agent_stopped → no alert by design (informational only)
}


def process_event(
    db,
    event_id: int,
    computer_id: int,
    event_type: str,
    description: str = "",
    hostname: str = "unknown",
) -> int | None:
    """
    Check whether the given event should generate an alert.
    If a matching rule exists, insert the alert into the database.

    Args:
        db:          Open SQLite connection (caller owns it).
        event_id:    ID of the already-inserted event row.
        computer_id: ID of the computer that reported the event.
        event_type:  The event type string.
        description: Human-readable description from the event.
        hostname:    Computer hostname for the alert message.

    Returns:
        The new alert's ID if one was created, otherwise None.
    """
    rule = ALERT_RULES.get(event_type)
    if rule is None:
        # No rule for this event type — not an error, just no alert needed
        return None

    severity = rule["severity"]
    message = rule["message_template"].format(
        hostname=hostname,
        description=description or "",
    )

    try:
        cursor = db.execute(
            """
            INSERT INTO alerts (computer_id, event_id, severity, message, acknowledged, created_at)
            VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP)
            """,
            (computer_id, event_id, severity, message),
        )
        db.commit()
        alert_id = cursor.lastrowid
        logger.info(
            f"Alert created (id={alert_id}, severity={severity}) "
            f"for event_type={event_type!r} on {hostname!r}"
        )
        return alert_id
    except Exception as exc:
        logger.error(f"Failed to create alert for event {event_id}: {exc}")
        return None


-- LabGuard Database Schema (SQLite)
-- ====================================
-- Reference/documentation file only.
-- The database is initialized automatically by database.py on startup.
-- Do NOT run this file manually unless rebuilding from scratch.

PRAGMA foreign_keys = ON;

-- ── computers ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS computers (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    hostname      TEXT    NOT NULL UNIQUE,
    ip_address    TEXT,
    status        TEXT    DEFAULT 'offline',       -- updated by heartbeat
    last_seen     TIMESTAMP,                        -- UTC; set on each heartbeat
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── events ───────────────────────────────────────────────────────────────────
-- metadata is a JSON string, e.g. {"device_name": "SanDisk USB"}
CREATE TABLE IF NOT EXISTS events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    computer_id INTEGER NOT NULL,
    event_type  TEXT    NOT NULL,     -- see VALID_EVENT_TYPES in events.py
    description TEXT,
    metadata    TEXT,                 -- JSON string (optional)
    timestamp   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (computer_id) REFERENCES computers(id)
);

-- ── alerts ───────────────────────────────────────────────────────────────────
-- severity levels: INFO | LOW | MEDIUM | HIGH | CRITICAL
-- acknowledged:    0 = active, 1 = acknowledged
CREATE TABLE IF NOT EXISTS alerts (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    computer_id  INTEGER NOT NULL,
    event_id     INTEGER,             -- NULL for system-generated alerts
    severity     TEXT    NOT NULL,
    message      TEXT    NOT NULL,
    acknowledged INTEGER DEFAULT 0,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (computer_id) REFERENCES computers(id),
    FOREIGN KEY (event_id)    REFERENCES events(id)
);

-- ── indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_computers_hostname   ON computers(hostname);
CREATE INDEX IF NOT EXISTS idx_events_computer_id  ON events(computer_id);
CREATE INDEX IF NOT EXISTS idx_events_timestamp     ON events(timestamp);
CREATE INDEX IF NOT EXISTS idx_events_type         ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_alerts_computer_id  ON alerts(computer_id);
CREATE INDEX IF NOT EXISTS idx_alerts_acknowledged  ON alerts(acknowledged);


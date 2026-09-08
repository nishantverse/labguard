import sqlite3
import os
import logging

logger = logging.getLogger(__name__)

try:
    from config import DATABASE_PATH
except ImportError:
    # Fallback if run in isolation
    DATABASE_PATH = "database/labguard.db"


def get_db():
    """
    Open and return a SQLite connection.
    Enables row_factory for dict-like access and enforces foreign keys.
    Caller is responsible for closing the connection.
    """
    db = sqlite3.connect(DATABASE_PATH)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys = ON")
    return db


def init_db():
    """
    Initialize the database schema.
    Creates all tables and indexes if they do not already exist.
    Safe to call on every server startup — uses IF NOT EXISTS guards.
    """
    # Ensure the directory containing the DB file exists
    db_dir = os.path.dirname(DATABASE_PATH)
    if db_dir and not os.path.exists(db_dir):
        os.makedirs(db_dir, exist_ok=True)
        logger.info(f"Created database directory: {db_dir}")

    db = get_db()
    try:
        # ── computers ──────────────────────────────────────────────────────
        db.execute("""
            CREATE TABLE IF NOT EXISTS computers (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                hostname      TEXT    NOT NULL UNIQUE,
                ip_address    TEXT,
                status        TEXT    DEFAULT 'offline',
                last_seen     TIMESTAMP,
                registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # ── events ─────────────────────────────────────────────────────────
        # metadata is stored as a JSON string
        db.execute("""
            CREATE TABLE IF NOT EXISTS events (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                computer_id INTEGER NOT NULL,
                event_type  TEXT    NOT NULL,
                description TEXT,
                metadata    TEXT,
                timestamp   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (computer_id) REFERENCES computers(id)
            )
        """)

        # ── alerts ─────────────────────────────────────────────────────────
        # severity: INFO | LOW | MEDIUM | HIGH | CRITICAL
        # acknowledged: 0 = active, 1 = acknowledged
        db.execute("""
            CREATE TABLE IF NOT EXISTS alerts (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                computer_id  INTEGER NOT NULL,
                event_id     INTEGER,
                severity     TEXT    NOT NULL,
                message      TEXT    NOT NULL,
                acknowledged INTEGER DEFAULT 0,
                created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (computer_id) REFERENCES computers(id),
                FOREIGN KEY (event_id)    REFERENCES events(id)
            )
        """)

        # ── indexes ────────────────────────────────────────────────────────
        db.execute("CREATE INDEX IF NOT EXISTS idx_computers_hostname   ON computers(hostname)")
        db.execute("CREATE INDEX IF NOT EXISTS idx_events_computer_id  ON events(computer_id)")
        db.execute("CREATE INDEX IF NOT EXISTS idx_events_timestamp     ON events(timestamp)")
        db.execute("CREATE INDEX IF NOT EXISTS idx_events_type         ON events(event_type)")
        db.execute("CREATE INDEX IF NOT EXISTS idx_alerts_computer_id  ON alerts(computer_id)")
        db.execute("CREATE INDEX IF NOT EXISTS idx_alerts_acknowledged  ON alerts(acknowledged)")

        db.commit()
        logger.info("Database initialized successfully.")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        raise
    finally:
        db.close()
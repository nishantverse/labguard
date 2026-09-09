"""
LabGuard Agent — Main Entry Point
====================================
Runs on authorized laboratory computers.

Responsibilities:
  1. Send periodic heartbeats to the LabGuard server
  2. (Future) Detect USB device events
  3. (Future) Monitor configured folders

Configuration via environment variables:
  LABGUARD_SERVER_URL         URL of the LabGuard server (required on real deployments)
  LABGUARD_HEARTBEAT_INTERVAL Seconds between heartbeats (default: 30)

Run from the backend/ directory:
    # Linux / macOS
    LABGUARD_SERVER_URL=http://192.168.1.100:5000 python -m agent.agent

    # Windows (PowerShell)
    $env:LABGUARD_SERVER_URL="http://192.168.1.100:5000"
    python -m agent.agent
"""

import logging
import os
import socket
import sys
import threading
# Ensure the backend/ directory is on sys.path when running as __main__
_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

from config import AGENT_SERVER_URL, AGENT_HEARTBEAT_INTERVAL
from agent.heartbeat import start_heartbeat_loop
from agent.usb_monitor import USBMonitor
from agent.folder_monitor import FolderMonitor

# ── Logging setup ─────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("labguard.agent")


# ── Config ────────────────────────────────────────────────────────────────────

def _load_config() -> dict:
    """Load agent configuration."""
    return {
        "server_url": AGENT_SERVER_URL,
        "heartbeat_interval": AGENT_HEARTBEAT_INTERVAL,
    }



def _get_hostname() -> str:
    return socket.gethostname()


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    config   = _load_config()
    hostname = _get_hostname()

    logger.info("=" * 50)
    logger.info("LabGuard Agent starting")
    logger.info(f"  Hostname        : {hostname}")
    logger.info(f"  Server URL      : {config['server_url']}")
    logger.info(f"  Heartbeat every : {config['heartbeat_interval']}s")
    logger.info("=" * 50)

    stop_event = threading.Event()
    threads: list[threading.Thread] = []

    # ── Heartbeat thread ──────────────────────────────────────────────────
    heartbeat_thread = threading.Thread(
        target=start_heartbeat_loop,
        args=(
            config["server_url"],
            hostname,
            config["heartbeat_interval"],
            stop_event,
        ),
        daemon=True,
        name="labguard-heartbeat",
    )
    threads.append(heartbeat_thread)

    # ── USB Monitor ───────────────────────────────────────────────────────────
    # Linux:   active via pyudev.MonitorObserver (pip install pyudev)
    # Windows: stub — see usb_monitor.py for WMI guide
    usb_monitor = USBMonitor()
    usb_monitor.on_device_connected(lambda info: _on_usb_connected(info, config, hostname))
    usb_monitor.on_device_disconnected(lambda info: _on_usb_disconnected(info, config, hostname))
    usb_monitor.start()

    # ── Folder Monitor ────────────────────────────────────────────────────────
    # Active on Linux + Windows via watchdog (pip install watchdog).
    # Watches the user's Downloads folder for executables and scripts.
    # Change the path and patterns below to suit your lab's policy.
    import os as _os
    _watch_path = _os.path.expanduser("~/Downloads")
    folder_monitor = FolderMonitor()
    folder_monitor.on_file_detected(lambda info: _on_file_detected(info, config, hostname))
    folder_monitor.start(
        path     = _watch_path,
        patterns = ["*.exe", "*.bat", "*.sh", "*.ps1", "*.vbs", "*.msi"],
    )


    # ── Start all threads ─────────────────────────────────────────────────────
    for t in threads:
        t.start()

    logger.info("Agent is running. Press Ctrl+C to stop.")

    try:
        # Keep the main thread alive; wake every second to stay responsive
        while not stop_event.is_set():
            stop_event.wait(timeout=1)
    except KeyboardInterrupt:
        logger.info("Shutdown signal received — stopping agent...")
    finally:
        stop_event.set()
        usb_monitor.stop()
        folder_monitor.stop()
        for t in threads:
            t.join(timeout=5)
        logger.info("LabGuard Agent stopped cleanly.")


# ── Event posting helpers (used by USB / folder callbacks) ───────────────────

def _post_event(server_url: str, hostname: str, event_type: str, description: str, metadata: dict) -> None:
    """Post an event to the server. Silently logs errors — never crashes the agent."""
    try:
        import requests
        url = f"{server_url.rstrip('/')}/api/events"
        resp = requests.post(
            url,
            json={
                "hostname":    hostname,
                "event_type":  event_type,
                "description": description,
                "metadata":    metadata,
            },
            timeout=10,
        )
        if resp.status_code == 201:
            logger.info(f"Event posted: {event_type} — {description}")
        else:
            logger.warning(f"Event post returned HTTP {resp.status_code}: {resp.text[:200]}")
    except Exception as exc:
        logger.error(f"Failed to post event '{event_type}': {exc}")


def _on_usb_connected(device_info: dict, config: dict, hostname: str) -> None:
    """Callback: USB device connected."""
    _post_event(
        server_url  = config["server_url"],
        hostname    = hostname,
        event_type  = "usb_connected",
        description = f"USB device connected: {device_info.get('device_name', 'unknown')}",
        metadata    = device_info,
    )


def _on_file_detected(file_info: dict, config: dict, hostname: str) -> None:
    """Callback: suspicious file detected in monitored folder."""
    _post_event(
        server_url  = config["server_url"],
        hostname    = hostname,
        event_type  = "suspicious_file",
        description = f"Suspicious file: {file_info.get('file_path', 'unknown')}",
        metadata    = file_info,
    )


if __name__ == "__main__":
    main()


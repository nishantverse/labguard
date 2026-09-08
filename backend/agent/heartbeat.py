"""
LabGuard Agent — Heartbeat Module
===================================
Handles:
  - Cross-platform local IP detection (Windows + Linux)
  - Sending a single heartbeat POST to the server
  - Running the heartbeat loop in a background thread

Cross-platform notes:
  - Uses socket.connect() trick to determine the outbound IP — no psutil
    or platform-specific system calls needed.
  - Works on Windows 10/11, Ubuntu, Debian, etc.
"""

import socket
import threading
import logging

logger = logging.getLogger(__name__)

try:
    import requests as _requests
    _REQUESTS_AVAILABLE = True
except ImportError:
    _REQUESTS_AVAILABLE = False
    logger.error(
        "The 'requests' library is not installed. "
        "Run: pip install requests"
    )


def get_local_ip() -> str:
    """
    Determine the machine's outbound IP address in a cross-platform way.
    Does not send any network traffic — uses a UDP connect to find
    which interface would be used to reach the internet.

    Returns '127.0.0.1' as a safe fallback on failure.
    """
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            # Destination doesn't need to be reachable
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except Exception:
        return "127.0.0.1"


def send_heartbeat(server_url: str, hostname: str, ip_address: str) -> bool:
    """
    Send a single heartbeat POST to the LabGuard server.

    Args:
        server_url:  Base URL of the server, e.g. 'http://192.168.1.100:5000'
        hostname:    This computer's hostname.
        ip_address:  This computer's local IP address.

    Returns:
        True if the server responded with HTTP 200, False otherwise.
    """
    if not _REQUESTS_AVAILABLE:
        return False

    url = f"{server_url.rstrip('/')}/api/heartbeat"
    try:
        response = _requests.post(
            url,
            json={"hostname": hostname, "ip_address": ip_address},
            timeout=10,
        )
        if response.status_code == 200:
            data = response.json().get("data", {})
            logger.debug(
                f"Heartbeat OK — computer_id={data.get('computer_id')}, "
                f"hostname={data.get('hostname')}"
            )
            return True
        else:
            logger.warning(
                f"Heartbeat returned HTTP {response.status_code}: {response.text[:200]}"
            )
            return False
    except _requests.exceptions.ConnectionError:
        logger.warning(
            f"Cannot reach server at {server_url}. "
            "Check LABGUARD_SERVER_URL and network connectivity."
        )
        return False
    except _requests.exceptions.Timeout:
        logger.warning("Heartbeat request timed out. Server may be overloaded.")
        return False
    except Exception as exc:
        logger.error(f"Unexpected error sending heartbeat: {exc}")
        return False


def start_heartbeat_loop(
    server_url: str,
    hostname: str,
    interval: int,
    stop_event: threading.Event,
) -> None:
    """
    Run the heartbeat loop until stop_event is set.
    Designed to execute in a daemon thread.

    Args:
        server_url:  Base URL of the LabGuard server.
        hostname:    This computer's hostname.
        interval:    Seconds between heartbeats.
        stop_event:  Set this event to stop the loop gracefully.
    """
    logger.info(
        f"Heartbeat loop started — server: {server_url}, interval: {interval}s"
    )
    while not stop_event.is_set():
        ip_address = get_local_ip()
        send_heartbeat(server_url, hostname, ip_address)
        # Wait for the interval, but wake up immediately if stop is requested
        stop_event.wait(timeout=interval)

    logger.info("Heartbeat loop stopped.")


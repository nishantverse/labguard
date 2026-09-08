"""
Folder Monitor — Stub Interface
==================================
Monitors a directory for new files matching configured patterns.

CURRENT STATUS: Stub — interface is defined but monitoring is not yet active.

HOW TO IMPLEMENT:
    Use watchdog (pip install watchdog) — works on Windows and Linux.

    from watchdog.observers import Observer
    from watchdog.events import PatternMatchingEventHandler

    class _Handler(PatternMatchingEventHandler):
        def on_created(self, event):
            self._fire_detected({"file_path": event.src_path, ...})

    In start():
        self._observer = Observer()
        self._observer.schedule(_Handler(patterns=patterns), path=path, recursive=False)
        self._observer.start()

    In stop():
        self._observer.stop()
        self._observer.join()

WHEN A FILE IS DETECTED, send a POST to /api/events:
    {
        "hostname":    "<hostname>",
        "event_type":  "suspicious_file",
        "description": "Suspicious file detected: <filename>",
        "metadata":    {"file_path": "/path/to/file", "pattern": "*.exe"}
    }

INTEGRATION EXAMPLE (in agent.py):
    folder_monitor = FolderMonitor()
    folder_monitor.on_file_detected(lambda info: post_event("suspicious_file", info))
    folder_monitor.start(path="C:\\Users\\Public", patterns=["*.exe", "*.bat"])
"""

import logging

logger = logging.getLogger(__name__)


class FolderMonitor:
    """
    Stub folder monitor — extend this class to implement watchdog-based monitoring.

    Usage:
        monitor = FolderMonitor()
        monitor.on_file_detected(my_callback)
        monitor.start(path="/home/lab/shared", patterns=["*.exe", "*.bat", "*.sh"])
        ...
        monitor.stop()
    """

    def __init__(self):
        self._file_callbacks: list = []
        self._running = False
        self._watched_path: str | None = None
        self._patterns: list = []

    def on_file_detected(self, callback) -> None:
        """Register a callback invoked when a matching file is detected.

        The callback receives a dict: {"file_path": str, "pattern": str}
        """
        self._file_callbacks.append(callback)

    def start(self, path: str, patterns: list | None = None) -> None:
        """
        Start monitoring a directory.
        Replace this method body with watchdog-based implementation.

        Args:
            path:     Directory to monitor.
            patterns: Glob patterns to match, e.g. ['*.exe', '*.bat'].
                      Defaults to ['*'] (all files).
        """
        self._watched_path = path
        self._patterns = patterns or ["*"]
        logger.info(
            f"FolderMonitor.start() called for '{path}' with patterns {self._patterns} "
            "— not yet implemented. See folder_monitor.py for instructions."
        )
        self._running = True

    def stop(self) -> None:
        """Stop folder monitoring."""
        if self._running:
            self._running = False
            logger.info("FolderMonitor stopped.")

    # ── Internal event firing ─────────────────────────────────────────────────

    def _fire_detected(self, file_info: dict) -> None:
        """Trigger all registered 'file detected' callbacks."""
        for cb in self._file_callbacks:
            try:
                cb(file_info)
            except Exception as exc:
                logger.error(f"Error in file detected callback: {exc}")


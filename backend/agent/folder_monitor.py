"""
Folder Monitor — watchdog (Windows + Linux)
============================================
Monitors a directory for new files matching configured glob patterns.

CURRENT STATUS: Active — uses watchdog.Observer which runs cross-platform
                on both Linux (inotify) and Windows (ReadDirectoryChanges).

Install:
    pip install watchdog
"""

import logging
import os

logger = logging.getLogger(__name__)


class FolderMonitor:
    """
    Cross-platform folder monitor using watchdog.Observer.

    Works on:
        Linux   — backed by inotify (kernel-level, efficient)
        Windows — backed by ReadDirectoryChanges API

    Usage:
        monitor = FolderMonitor()
        monitor.on_file_detected(my_callback)
        monitor.start(path="/home/lab/shared", patterns=["*.exe", "*.sh", "*.bat"])
        ...
        monitor.stop()

    Callbacks receive:
        {
            "file_path": "/home/lab/shared/malware.exe",
            "file_name": "malware.exe",
            "pattern":   "*.exe"
        }
    """

    def __init__(self):
        self._file_callbacks: list = []
        self._observer       = None
        self._running        = False
        self._watched_path   = None
        self._patterns: list = []

    # ── Public interface ────────────────────────────────────────────────

    def on_file_detected(self, callback) -> None:
        """Register a callback invoked when a matching file is created."""
        self._file_callbacks.append(callback)

    def start(self, path: str, patterns: list | None = None) -> None:
        """
        Start monitoring a directory for new files.

        Args:
            path:     Absolute path to the directory to watch.
            patterns: Glob patterns to match, e.g. ['*.exe', '*.bat', '*.sh'].
                      Defaults to ['*'] (every new file).
        """
        try:
            from watchdog.observers import Observer
            from watchdog.events   import PatternMatchingEventHandler
        except ImportError:
            logger.error(
                "watchdog is not installed. Folder monitoring will not run.\n"
                "Fix: pip install watchdog"
            )
            return

        if not os.path.isdir(path):
            logger.error(
                f"FolderMonitor: path '{path}' does not exist or is not a directory. "
                "Monitoring not started."
            )
            return

        self._watched_path = path
        self._patterns     = patterns or ["*"]

        # Build the event handler using watchdog's built-in pattern matching.
        # ignore_directories=True so we only fire on actual files.
        event_handler = PatternMatchingEventHandler(
            patterns           = self._patterns,
            ignore_patterns    = None,
            ignore_directories = True,
            case_sensitive     = False,
        )

        # We only care about newly created files (not modifications or deletes).
        # If you also want modifications, add: event_handler.on_modified = self._on_event
        event_handler.on_created = self._on_watchdog_event

        self._observer = Observer()
        self._observer.schedule(event_handler, path=path, recursive=False)
        self._observer.start()          # Observer runs in its own daemon thread
        self._running = True

        logger.info(
            f"FolderMonitor started — watching '{path}' "
            f"for patterns {self._patterns}"
        )

    def stop(self) -> None:
        """Stop folder monitoring and clean up the observer thread."""
        if self._observer is not None:
            self._observer.stop()
            self._observer.join(timeout=3)
            self._observer = None
        self._running = False
        logger.info("FolderMonitor stopped.")

    # ── Internal event handler ──────────────────────────────────────────

    def _on_watchdog_event(self, event) -> None:
        """Called by watchdog when a matching file is created."""
        file_path = event.src_path
        file_name = os.path.basename(file_path)

        # Determine which pattern matched (best-effort: check each pattern)
        matched_pattern = "*"
        try:
            import fnmatch
            for pat in self._patterns:
                if fnmatch.fnmatch(file_name.lower(), pat.lower()):
                    matched_pattern = pat
                    break
        except Exception:
            pass

        file_info = {
            "file_path": file_path,
            "file_name": file_name,
            "pattern":   matched_pattern,
        }

        logger.info(
            f"File detected in monitored folder: {file_name} "
            f"(matched '{matched_pattern}' in '{self._watched_path}')"
        )
        self._fire_detected(file_info)

    # ── Internal callback firing ────────────────────────────────────────

    def _fire_detected(self, file_info: dict) -> None:
        for cb in self._file_callbacks:
            try:
                cb(file_info)
            except Exception as exc:
                logger.error(f"Error in file detected callback: {exc}")

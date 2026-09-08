"""
USB Monitor — Stub Interface
==============================
Detects USB/removable device connect and disconnect events.

CURRENT STATUS: Stub — interface is defined but monitoring is not yet active.

HOW TO IMPLEMENT:
    Linux:
        Use pyudev (pip install pyudev).
        Monitor the 'block' subsystem for 'add' and 'remove' udev events.

    Windows:
        Use WMI (pip install wmi) or pywin32.
        Monitor Win32_VolumeChangeEvent or Win32_USBControllerDevice.

    Cross-platform option:
        Check platform.system() at runtime and use the correct backend.

WHEN DEVICE IS DETECTED, send a POST to /api/events:
    {
        "hostname":    "<hostname>",
        "event_type":  "usb_connected",
        "description": "USB device connected: <device_name>",
        "metadata":    {"device_name": "SanDisk Ultra", "device_id": "..."}
    }

INTEGRATION EXAMPLE (in agent.py):
    usb_monitor = USBMonitor(server_url=config["server_url"], hostname=hostname)
    usb_monitor.on_device_connected(lambda info: post_event("usb_connected", info))
    usb_monitor.start()
"""

import logging

logger = logging.getLogger(__name__)


class USBMonitor:
    """
    Stub USB monitor — extend this class to implement platform-specific detection.

    Usage:
        monitor = USBMonitor()
        monitor.on_device_connected(my_callback)
        monitor.on_device_disconnected(my_callback)
        monitor.start()
        ...
        monitor.stop()
    """

    def __init__(self):
        self._connected_callbacks: list = []
        self._disconnected_callbacks: list = []
        self._running = False

    def on_device_connected(self, callback) -> None:
        """Register a callback invoked when a USB device is connected.

        The callback receives a dict: {"device_name": str, "device_id": str, ...}
        """
        self._connected_callbacks.append(callback)

    def on_device_disconnected(self, callback) -> None:
        """Register a callback invoked when a USB device is disconnected."""
        self._disconnected_callbacks.append(callback)

    def start(self) -> None:
        """Start USB monitoring. Replace this method body with platform implementation."""
        logger.info(
            "USBMonitor.start() called — USB monitoring not yet implemented. "
            "See usb_monitor.py for implementation instructions."
        )
        self._running = True

    def stop(self) -> None:
        """Stop USB monitoring."""
        if self._running:
            self._running = False
            logger.info("USBMonitor stopped.")

    # ── Internal event firing (called by the implementation, not the agent) ──

    def _fire_connected(self, device_info: dict) -> None:
        """Trigger all registered 'device connected' callbacks."""
        for cb in self._connected_callbacks:
            try:
                cb(device_info)
            except Exception as exc:
                logger.error(f"Error in USB connected callback: {exc}")

    def _fire_disconnected(self, device_info: dict) -> None:
        """Trigger all registered 'device disconnected' callbacks."""
        for cb in self._disconnected_callbacks:
            try:
                cb(device_info)
            except Exception as exc:
                logger.error(f"Error in USB disconnected callback: {exc}")


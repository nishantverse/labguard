"""
USB Monitor — Linux (pyudev) + Windows stub
=============================================
Detects USB device connect / disconnect events.

CURRENT STATUS: Active on Linux (pyudev.MonitorObserver).
                Windows: stub — WMI implementation guide in _start_windows().

Install:
    pip install pyudev        # Linux only
"""

import logging
import platform
import threading

logger = logging.getLogger(__name__)


class USBMonitor:
    """
    Cross-platform USB monitor.

    Linux:   pyudev.MonitorObserver runs in its own daemon thread.
             Filters on subsystem='usb', device_type='usb_device' so every
             USB device (storage, hubs, etc.) is caught — no root needed.

    Windows: Logs a warning. See _start_windows() for WMI implementation guide.

    Usage:
        monitor = USBMonitor()
        monitor.on_device_connected(my_callback)
        monitor.on_device_disconnected(my_callback)
        monitor.start()
        ...
        monitor.stop()

    Callbacks receive:
        {
            "device_name": "SanDisk Ultra",
            "vendor":      "SanDisk",
            "device_id":   "SanDisk_Ultra_ABC123",
            "sys_name":    "sdb"
        }
    """

    def __init__(self):
        self._connected_callbacks:    list = []
        self._disconnected_callbacks: list = []
        self._observer = None          # pyudev MonitorObserver (Linux)
        self._running  = False

    # ── Public interface ────────────────────────────────────────────────

    def on_device_connected(self, callback) -> None:
        """Register a callback for USB device connection events."""
        self._connected_callbacks.append(callback)

    def on_device_disconnected(self, callback) -> None:
        """Register a callback for USB device disconnection events."""
        self._disconnected_callbacks.append(callback)

    def start(self) -> None:
        """Start USB monitoring using the correct backend for this OS."""
        system = platform.system()
        if system == "Linux":
            self._start_linux()
        elif system == "Windows":
            self._start_windows()
        else:
            logger.warning(f"USB monitoring not supported on {system}.")

    def stop(self) -> None:
        """Stop USB monitoring and clean up resources."""
        if self._observer is not None:
            try:
                self._observer.stop()
            except Exception:
                pass
            self._observer = None
        self._running = False
        logger.info("USBMonitor stopped.")

    # ── Linux backend ── pyudev.MonitorObserver ─────────────────────────

    def _start_linux(self) -> None:
        try:
            import pyudev
        except ImportError:
            logger.error(
                "pyudev is not installed. USB monitoring will not run.\n"
                "Fix: pip install pyudev"
            )
            return

        context = pyudev.Context()
        monitor  = pyudev.Monitor.from_netlink(context)

        # usb_device catches the hardware-level connection event for every
        # USB device (flash drives, mice, keyboards, hubs).
        monitor.filter_by(subsystem="usb", device_type="usb_device")

        # MonitorObserver runs the poll loop in a daemon thread automatically.
        self._observer = pyudev.MonitorObserver(
            monitor,
            callback=self._on_udev_event,
            name="udev-usb-observer",
            daemon=True,
        )
        self._observer.start()
        self._running = True
        logger.info("USBMonitor started — Linux / pyudev.MonitorObserver.")

    def _on_udev_event(self, device) -> None:
        """Called by MonitorObserver on every matching udev event."""
        device_info = {
            "device_name": (
                device.get("ID_MODEL_ENC") or device.get("ID_MODEL") or "Unknown USB Device"
            ).replace("\\x20", " ").strip(),
            "vendor": (
                device.get("ID_VENDOR_ENC") or device.get("ID_VENDOR") or "Unknown"
            ).replace("\\x20", " ").strip(),
            "device_id": device.get("ID_SERIAL", ""),
            "sys_name":  device.sys_name,
        }

        if device.action == "add":
            logger.info(
                f"USB connected: {device_info['device_name']} "
                f"({device_info['vendor']})"
            )
            self._fire_connected(device_info)

        elif device.action == "remove":
            logger.info(f"USB disconnected: {device_info['device_name']}")
            self._fire_disconnected(device_info)

    # ── Windows backend ── stub with WMI guide ──────────────────────────

    def _start_windows(self) -> None:
        """
        Windows USB monitoring — NOT YET ACTIVE.

        To implement, install:  pip install wmi pywin32

        Replace this method body with:

            import wmi, pythoncom, threading

            def _wmi_loop(self):
                pythoncom.CoInitialize()
                c = wmi.WMI()
                watcher = c.Win32_DeviceChangeEvent.watch_for()
                while self._running:
                    try:
                        event = watcher(timeout_ms=1000)
                        if event and event.EventType == 2:    # 2 = device added
                            self._fire_connected({"device_name": "USB Device"})
                        elif event and event.EventType == 3:  # 3 = device removed
                            self._fire_disconnected({"device_name": "USB Device"})
                    except Exception:
                        pass

            self._running = True
            t = threading.Thread(target=_wmi_loop, args=(self,), daemon=True, name="wmi-usb")
            t.start()
        """
        logger.warning(
            "USB monitoring on Windows is not yet implemented. "
            "See _start_windows() in usb_monitor.py for the WMI implementation guide."
        )

    # ── Internal callback firing ────────────────────────────────────────

    def _fire_connected(self, device_info: dict) -> None:
        for cb in self._connected_callbacks:
            try:
                cb(device_info)
            except Exception as exc:
                logger.error(f"Error in USB connected callback: {exc}")

    def _fire_disconnected(self, device_info: dict) -> None:
        for cb in self._disconnected_callbacks:
            try:
                cb(device_info)
            except Exception as exc:
                logger.error(f"Error in USB disconnected callback: {exc}")

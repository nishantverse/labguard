# 🛡️ LabGuard Backend — REST API & Real-Time WebSocket Engine

Centralized security monitoring server and client agent for authorized college computer laboratories. Built with **Python 3**, **Flask**, **Flask-SocketIO**, and **SQLite**.

---

## 📑 Table of Contents
- [Architecture Overview](#architecture-overview)
- [How Socket.IO Works in the Backend](#how-socketio-works-in-the-backend)
- [Directory Structure](#directory-structure)
- [Setup & Installation](#setup--installation)
- [Running the Server](#running-the-server)
- [Running the Agent](#running-the-agent)
- [WebSocket / Socket.IO Event Specification](#websocket--socketio-event-specification)
- [REST API Contract](#rest-api-contract)
- [Alert Rules & Processing](#alert-rules--processing)
- [Offline Detection](#offline-detection)

---

## Architecture Overview

```
Lab Computers (running Agent)
      │
      │ HTTP POST (/api/heartbeat, /api/events)
      ▼
Flask REST API & WebSocket Server (server/main.py :5000)
   ├── SQLite Database (database/labguard.db)
   ├── Alert Rules Engine (server/services/alert_service.py)
   └── Socket.IO Broadcast Engine (server/ws.py)
      │
      │ Real-Time WebSocket (WSS / Socket.IO Events)
      ▼
React Frontend Admin Dashboard
```

1. **Lab Computers** run the `agent/` daemon, tracking USB connections, folder changes, and sending periodic heartbeats.
2. **Flask Backend** accepts HTTP ingestion requests from agents, updates the database, evaluates alerts, and immediately broadcasts state updates over Socket.IO.
3. **Frontend Dashboard** establishes a bidirectional WebSocket connection to receive instant updates, eliminating the need for periodic HTTP polling.

---

## How Socket.IO Works in the Backend

If you are new to Socket.IO with Flask, here is how the real-time system is wired together:

### 1. The Server (`server/main.py`)
- We use `Flask-SocketIO` to attach a WebSocket server to our standard Flask app:
  ```python
  from flask_socketio import SocketIO
  socketio = SocketIO()

  def create_app():
      app = Flask(__name__)
      socketio.init_app(app, cors_allowed_origins="*", async_mode="threading")
      ...
      return app
  ```
- The server is started with `socketio.run(app, ...)` instead of `app.run()`. This enables the server to accept both standard HTTP requests and incoming WebSocket upgrades (`/socket.io/`).

### 2. Centralized Broadcasting (`server/ws.py`)
- When something changes in the system (a new event arrives, an alert is acknowledged, or a computer sends a heartbeat), the server calls our centralized broadcast helper:
  ```python
  from server.ws import broadcast

  broadcast('new_event', event_data)
  broadcast('dashboard_update', get_dashboard_summary())
  ```
- Under the hood, `broadcast()` calls `socketio.emit(event_name, data)` which sends the JSON payload to **all connected browser clients** instantly.

### 3. Connection Lifecycle
- **Connect**: When an admin opens the frontend, a Socket.IO handshake occurs (HTTP `101 Switching Protocols`), and `handle_connect()` logs the client.
- **Heartbeat / Ping-Pong**: Socket.IO automatically sends periodic ping/pong frames to keep connections alive and detect disconnections.
- **Automatic Fallback**: If a firewall or proxy blocks WebSockets, Socket.IO automatically falls back to HTTP long-polling transparently.
- **Disconnect**: When a tab closes or network drops, `handle_disconnect()` handles cleanup.

---

## Directory Structure

```
backend/
├── agent/                    # Monitoring daemon installed on lab PCs
│   ├── __init__.py
│   ├── agent.py              # Main multi-threaded loop
│   ├── heartbeat.py          # Periodic heartbeat sender
│   ├── usb_monitor.py        # Linux udev USB plug/unplug detector
│   └── folder_monitor.py     # Watchdog directory monitor
│
├── database/                 # SQLite storage layer
│   ├── __init__.py
│   ├── database.py           # get_db(), init_db() connection manager
│   ├── labguard.db           # SQLite database file (created on startup)
│   └── schema.sql            # Table definitions (computers, events, alerts)
│
├── server/                   # Flask + Socket.IO server package
│   ├── __init__.py
│   ├── main.py               # App factory, Socket.IO init, entry point
│   ├── ws.py                 # Centralized WebSocket broadcast helpers
│   ├── routes/               # Modular REST endpoints (Blueprints)
│   │   ├── __init__.py
│   │   ├── alerts.py         # /api/alerts (list, get, acknowledge)
│   │   ├── computers.py      # /api/computers (list, get, register, delete)
│   │   ├── dashboard.py      # /api/dashboard/summary + get_dashboard_summary()
│   │   ├── events.py         # /api/events (list, get, create)
│   │   ├── heartbeat.py      # /api/heartbeat (agent check-in)
│   │   └── helpers.py        # Response wrappers (success, error, fmt_ts)
│   └── services/
│       ├── __init__.py
│       └── alert_service.py  # Rule engine: converts events to alerts
│
├── config.py                 # Environment variables and configuration loader
├── requirements.txt          # Python package dependencies
├── .env.example              # Sample environment configuration
└── README.md                 # This file
```

---

## Setup & Installation

### 1. Prerequisites
- Python 3.10+
- `pip`

### 2. Create and Activate Virtual Environment
```bash
# Linux / macOS
python3 -m venv .venv
source .venv/bin/activate

# Windows (PowerShell)
python -m venv .venv
.venv\Scripts\Activate.ps1
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure Environment
Copy `.env.example` to `.env` (optional; defaults work out-of-the-box):
```bash
cp .env.example .env
```

Available environment variables:
| Variable | Default | Purpose |
|---|---|---|
| `LABGUARD_HOST` | `0.0.0.0` | Bind IP address for Flask & Socket.IO |
| `LABGUARD_PORT` | `5000` | Port for Flask & Socket.IO server |
| `LABGUARD_DEBUG` | `true` | Enable debug logging & auto-reload |
| `LABGUARD_DB_PATH` | `database/labguard.db` | File path to SQLite database |
| `LABGUARD_HEARTBEAT_TIMEOUT` | `120` | Seconds before a computer is marked offline |

---

## Running the Server

Start the Flask + Socket.IO server:
```bash
# Run as Python module from backend/ directory
python3 -m server.main
```

Server startup output:
```text
2026-09-11 23:00:00 [INFO] database.database: Database initialized successfully.
2026-09-11 23:00:00 [INFO] server.main: Starting LabGuard server on 0.0.0.0:5000 (debug=True)
 * Running on all addresses (0.0.0.0)
 * Running on http://127.0.0.1:5000
```

---

## Running the Agent

The agent is installed on client laboratory computers and reports telemetry back to the server.

```bash
# On Linux / Windows lab computer
LABGUARD_SERVER_URL=http://<SERVER_IP>:5000 python3 -m agent.agent
```

| Variable | Default | Purpose |
|---|---|---|
| `LABGUARD_SERVER_URL` | `http://localhost:5000` | Target LabGuard server URL |
| `LABGUARD_HEARTBEAT_INTERVAL` | `30` | Seconds between periodic heartbeats |

---

## WebSocket / Socket.IO Event Specification

Connected clients connect to the root URL (e.g. `ws://<HOST>:5000/socket.io/`). The backend emits the following real-time events:

| Event Name | Emitted On | Payload Structure |
|---|---|---|
| `new_event` | `POST /api/events` | `{ "id": 1, "computer_id": 1, "hostname": "LAB-01", "event_type": "usb_connected", "description": "...", "metadata": {...}, "timestamp": "..." }` |
| `new_alert` | Auto-generated by alert rule | `{ "id": 1, "computer_id": 1, "event_id": 1, "severity": "HIGH", "message": "...", "hostname": "LAB-01", "acknowledged": false }` |
| `alert_acknowledged` | `PATCH /api/alerts/<id>/acknowledge` | `{ "alert_id": 1 }` |
| `computer_status` | `POST /api/heartbeat` | `{ "computer_id": 1, "hostname": "LAB-01", "status": "online" }` |
| `computer_registered` | `POST /api/computers` | `{ "id": 1, "hostname": "LAB-01", "ip_address": "...", "status": "online", "online": true, "last_seen": "...", "registered_at": "..." }` |
| `computer_deleted` | `DELETE /api/computers/<id>` | `{ "computer_id": 1 }` |
| `dashboard_update` | Any state-changing action | Full summary object: `total_computers`, `online_computers`, `offline_computers`, `active_alerts`, `recent_events` (last 10) |

---

## REST API Contract

All REST responses use a consistent envelope format:
- **Success**: `{"success": true, "data": <payload>}`
- **Error**: `{"success": false, "error": "<message>"}`

### Endpoints Overview

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Health check & WebSocket status |
| `GET` | `/api/dashboard/summary` | Complete dashboard metrics aggregation |
| `GET` | `/api/computers` | List all registered computers with computed `online` status |
| `GET` | `/api/computers/<id>` | Retrieve single computer details |
| `POST` | `/api/computers` | Manually register a new computer |
| `DELETE` | `/api/computers/<id>` | Decommission a computer (cascades events and alerts) |
| `POST` | `/api/heartbeat` | Agent heartbeat check-in (auto-registers if new) |
| `GET` | `/api/events` | List security events (filters: `computer_id`, `event_type`, `limit`) |
| `GET` | `/api/events/<id>` | Retrieve single event details |
| `POST` | `/api/events` | Submit security event (evaluates alert rules) |
| `GET` | `/api/alerts` | List alerts (filters: `acknowledged`, `severity`, `limit`) |
| `GET` | `/api/alerts/<id>` | Retrieve single alert details |
| `PATCH` | `/api/alerts/<id>/acknowledge` | Acknowledge an alert |

---

## Alert Rules & Processing

Defined in [`server/services/alert_service.py`](file://server/services/alert_service.py). When an event is ingested via `POST /api/events`, the rule engine matches `event_type`:

| Event Type | Severity | Generated Message Template |
|---|---|---|
| `usb_connected` | **HIGH** | `USB device connected on {hostname}: {description}` |
| `usb_disconnected` | **INFO** | `USB device disconnected on {hostname}` |
| `suspicious_file` | **CRITICAL** | `Suspicious file detected on {hostname}: {description}` |
| `unauthorized_access` | **HIGH** | `Unauthorized access attempt on {hostname}: {description}` |
| `large_file_detected` | **LOW** | `Large file detected on {hostname}: {description}` |
| `computer_offline` | **MEDIUM** | `Computer {hostname} appears to be offline` |
| `folder_change` | **LOW** | `Monitored folder changed on {hostname}: {description}` |
| `agent_started` | — | *(No alert generated, informational event only)* |
| `agent_stopped` | — | *(No alert generated, informational event only)* |

---

## Offline Detection

Availability is evaluated dynamically at query time:
- SQLite stores `last_seen` in UTC (`CURRENT_TIMESTAMP`).
- If `last_seen >= now - LABGUARD_HEARTBEAT_TIMEOUT` (120s default), `online = true`.
- If older or null, `online = false` and `status = 'offline'`.
- No background cron or polling workers needed on the database.


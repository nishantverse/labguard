# 🛡️ LabGuard — Smart Security Monitoring System

Centralized security monitoring for authorized college computer laboratories.

---

## System Architecture

```
Lab Computers
      ↓  (heartbeat + events)
LabGuard Agent  (agent/agent.py)
      ↓  (HTTP REST)
Flask API  (server/main.py  :5000)
      ↓
SQLite Database  (database/labguard.db)
      ↓  (HTTP REST)
Admin Dashboard  (built separately)
```

---

## Project Structure

```
backend/
├── agent/
│   ├── __init__.py
│   ├── agent.py           ← Main agent loop (run on each lab computer)
│   ├── heartbeat.py       ← Cross-platform heartbeat sender (Windows + Linux)
│   ├── usb_monitor.py     ← USB detection stub (interface defined, not yet active)
│   └── folder_monitor.py  ← Folder watch stub  (interface defined, not yet active)
│
├── database/
│   ├── __init__.py
│   ├── database.py        ← get_db(), init_db()
│   └── schema.sql         ← SQL schema reference
│
├── server/
│   ├── __init__.py
│   ├── main.py            ← Flask app factory + startup
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── helpers.py     ← Shared JSON response helpers
│   │   ├── computers.py   ← /api/computers
│   │   ├── heartbeat.py   ← /api/heartbeat
│   │   ├── events.py      ← /api/events
│   │   ├── alerts.py      ← /api/alerts
│   │   └── dashboard.py   ← /api/dashboard/summary
│   └── services/
│       ├── __init__.py
│       └── alert_service.py  ← Event → Alert rule engine
│
├── config.py              ← All configuration (env-var backed)
├── requirements.txt
├── .env.example           ← Copy to .env and set values
└── README.md
```

---

## Installation & Setup

### 1. Clone / navigate to the backend directory

```bash
cd /path/to/labguard/backend
```

### 2. Create a virtual environment

```bash
# Linux / macOS
python3 -m venv .venv
source .venv/bin/activate

# Windows (PowerShell)
python -m venv .venv
.venv\Scripts\Activate.ps1
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure environment (optional for dev)

```bash
# Linux / macOS
cp .env.example .env
# Edit .env as needed, then:
export $(cat .env | grep -v '#' | xargs)

# Windows (PowerShell)
# Edit .env.example values, then:
Get-Content .env | ForEach-Object { $k,$v = $_ -split '=',2; Set-Item "env:$k" $v }
```

> The server works with defaults (host `0.0.0.0`, port `5000`) without any `.env` file.

---

## Running the Server

```bash
# From the backend/ directory
python -m server.main
```

The SQLite database is created automatically on first run at `database/labguard.db`.

**Output:**
```
2026-09-08 12:00:00 [INFO] database.database: Database initialized successfully.
2026-09-08 12:00:00 [INFO] __main__: Starting LabGuard server on 0.0.0.0:5000 (debug=True)
 * Running on http://0.0.0.0:5000
```

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `LABGUARD_DB_PATH` | `database/labguard.db` | SQLite file path |
| `LABGUARD_HOST` | `0.0.0.0` | Flask bind host |
| `LABGUARD_PORT` | `5000` | Flask port |
| `LABGUARD_DEBUG` | `true` | Flask debug mode |
| `LABGUARD_HEARTBEAT_TIMEOUT` | `120` | Seconds until a computer is considered offline |

---

## Running the Agent

The agent runs on **each authorized lab computer** and sends heartbeats to the server.

### On Linux (lab computer or VM)

```bash
cd /path/to/labguard/backend
LABGUARD_SERVER_URL=http://192.168.1.100:5000 python -m agent.agent
```

### On Windows (lab computer or VM)

```powershell
cd C:\path\to\labguard\backend
$env:LABGUARD_SERVER_URL = "http://192.168.1.100:5000"
python -m agent.agent
```

> Replace `192.168.1.100` with the actual LAN IP of the machine running the Flask server.

### Agent Environment Variables

| Variable | Default | Description |
|---|---|---|
| `LABGUARD_SERVER_URL` | `http://localhost:5000` | Server to report to |
| `LABGUARD_HEARTBEAT_INTERVAL` | `30` | Seconds between heartbeats |

**Agent output:**
```
2026-09-08 12:00:00 [INFO] labguard.agent: ==================================================
2026-09-08 12:00:00 [INFO] labguard.agent: LabGuard Agent starting
2026-09-08 12:00:00 [INFO] labguard.agent:   Hostname        : LAB-PC-01
2026-09-08 12:00:00 [INFO] labguard.agent:   Server URL      : http://192.168.1.100:5000
2026-09-08 12:00:00 [INFO] labguard.agent:   Heartbeat every : 30s
2026-09-08 12:00:00 [INFO] labguard.agent: ==================================================
2026-09-08 12:00:00 [INFO] agent.heartbeat: Heartbeat loop started
```

---

## Offline Detection

A computer is considered **online** if its `last_seen` timestamp is within `LABGUARD_HEARTBEAT_TIMEOUT` seconds (default: 120s).

This is computed **passively at query time** — no background jobs required. The `online` field in every computer response reflects the live state.

---

## Alert Rules

Alerts are generated automatically when events are posted. Rules are defined in [`alert_service.py`](file://server/services/alert_service.py):

| Event Type | Severity | Auto-Alert |
|---|---|---|
| `usb_connected` | HIGH | ✅ |
| `usb_disconnected` | INFO | ✅ |
| `suspicious_file` | CRITICAL | ✅ |
| `unauthorized_access` | HIGH | ✅ |
| `large_file_detected` | LOW | ✅ |
| `computer_offline` | MEDIUM | ✅ |
| `folder_change` | LOW | ✅ |
| `agent_started` | — | ❌ (no alert) |
| `agent_stopped` | — | ❌ (no alert) |

To add a new rule, add one entry to `ALERT_RULES` in `alert_service.py`.

---

## API Contract

> **For the frontend developer:** This section documents every endpoint. You should be able to build the full dashboard without reading any backend source code.

### Response Envelope

All responses use this consistent structure:

**Success:**
```json
{ "success": true, "data": { ... } }
```

**Error:**
```json
{ "success": false, "error": "Description of the problem" }
```

---

### `GET /`

Health check.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "name": "LabGuard API",
    "version": "1.0.0",
    "status": "running"
  }
}
```

---

### Computers

#### `GET /api/computers`

List all registered computers. The `online` field is computed live from `last_seen`.

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "hostname": "LAB-PC-01",
      "ip_address": "192.168.1.50",
      "status": "online",
      "online": true,
      "last_seen": "2026-09-08 17:44:03",
      "registered_at": "2026-09-08 16:00:00"
    }
  ]
}
```

**curl:**
```bash
curl http://localhost:5000/api/computers
```

---

#### `GET /api/computers/<id>`

Get a single computer by ID.

**Response 200:** Same shape as one element in the list above.

**Response 404:**
```json
{ "success": false, "error": "Computer 99 not found" }
```

**curl:**
```bash
curl http://localhost:5000/api/computers/1
```

---

#### `POST /api/computers`

Explicitly register a computer. Note: computers are also auto-registered on their first heartbeat.

**Request body:**
```json
{
  "hostname": "LAB-PC-05",
  "ip_address": "192.168.1.55"
}
```

| Field | Required | Description |
|---|---|---|
| `hostname` | ✅ | Unique hostname for this computer |
| `ip_address` | ❌ | IP address (updated automatically by heartbeat) |

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": 5,
    "hostname": "LAB-PC-05",
    "ip_address": "192.168.1.55",
    "status": "offline",
    "online": false,
    "last_seen": null,
    "registered_at": "2026-09-08 18:00:00"
  }
}
```

**Response 409:** Hostname already registered.

**curl:**
```bash
curl -X POST http://localhost:5000/api/computers \
  -H "Content-Type: application/json" \
  -d '{"hostname": "LAB-PC-05", "ip_address": "192.168.1.55"}'
```

---

#### `DELETE /api/computers/<id>`

Remove a computer and all its associated events and alerts.

**Response 200:**
```json
{ "success": true, "data": { "message": "Computer 5 deleted" } }
```

**Response 404:** Computer not found.

**curl:**
```bash
curl -X DELETE http://localhost:5000/api/computers/5
```

---

### Heartbeat

#### `POST /api/heartbeat`

Called by the agent every `LABGUARD_HEARTBEAT_INTERVAL` seconds. Updates `last_seen` and sets the computer online. Auto-registers the computer if it hasn't been seen before.

**Request body:**
```json
{
  "hostname": "LAB-PC-01",
  "ip_address": "192.168.1.50"
}
```

| Field | Required | Description |
|---|---|---|
| `hostname` | ✅ | Computer's hostname |
| `ip_address` | ❌ | Current IP address |

**Response 200:**
```json
{
  "success": true,
  "data": {
    "computer_id": 1,
    "hostname": "LAB-PC-01",
    "status": "online"
  }
}
```

**Response 400:** Missing hostname or malformed JSON.

**curl:**
```bash
curl -X POST http://localhost:5000/api/heartbeat \
  -H "Content-Type: application/json" \
  -d '{"hostname": "LAB-PC-01", "ip_address": "192.168.1.50"}'
```

---

### Events

#### `GET /api/events`

List events. Supports query parameters for filtering.

**Query parameters:**

| Parameter | Type | Description |
|---|---|---|
| `computer_id` | integer | Filter by computer ID |
| `event_type` | string | Filter by event type |
| `limit` | integer | Max results (default 100, max 500) |

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "computer_id": 1,
      "hostname": "LAB-PC-01",
      "event_type": "usb_connected",
      "description": "USB storage connected",
      "metadata": { "device_name": "SanDisk Ultra" },
      "timestamp": "2026-09-08 17:44:39"
    }
  ]
}
```

**curl:**
```bash
curl "http://localhost:5000/api/events"
curl "http://localhost:5000/api/events?event_type=usb_connected"
curl "http://localhost:5000/api/events?computer_id=1&limit=50"
```

---

#### `GET /api/events/<id>`

Get a single event by ID.

**Response 200:** Same shape as one event in the list.
**Response 404:** Event not found.

**curl:**
```bash
curl http://localhost:5000/api/events/1
```

---

#### `POST /api/events`

Create a new event. The backend automatically creates an alert if a matching rule exists.

The computer identified by `hostname` must already exist (via prior heartbeat or explicit registration).

**Request body:**
```json
{
  "hostname": "LAB-PC-01",
  "event_type": "usb_connected",
  "description": "USB storage device connected",
  "metadata": {
    "device_name": "SanDisk Ultra"
  }
}
```

| Field | Required | Description |
|---|---|---|
| `hostname` | ✅ | Must match a registered computer |
| `event_type` | ✅ | See valid types below |
| `description` | ❌ | Human-readable description |
| `metadata` | ❌ | JSON object with additional details |

**Valid `event_type` values:**
`agent_started`, `agent_stopped`, `computer_offline`, `folder_change`,
`large_file_detected`, `suspicious_file`, `unauthorized_access`,
`usb_connected`, `usb_disconnected`

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "computer_id": 1,
    "hostname": "LAB-PC-01",
    "event_type": "usb_connected",
    "description": "USB storage device connected",
    "metadata": { "device_name": "SanDisk Ultra" },
    "timestamp": "2026-09-08 17:44:39",
    "alert_created": true,
    "alert_id": 1
  }
}
```

**Response 400:** Missing required fields, invalid event_type, or non-object metadata.
**Response 404:** Unknown hostname.

**curl:**
```bash
curl -X POST http://localhost:5000/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "hostname": "LAB-PC-01",
    "event_type": "usb_connected",
    "description": "USB storage connected",
    "metadata": {"device_name": "SanDisk Ultra"}
  }'
```

---

### Alerts

#### `GET /api/alerts`

List alerts. Supports filtering by acknowledgement status and severity.

**Query parameters:**

| Parameter | Values | Description |
|---|---|---|
| `acknowledged` | `true` / `false` | Filter by acknowledgement status |
| `severity` | `INFO` `LOW` `MEDIUM` `HIGH` `CRITICAL` | Filter by severity level |
| `limit` | integer | Max results (default 100, max 500) |

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": 2,
      "computer_id": 2,
      "hostname": "LAB-PC-02",
      "event_id": 2,
      "severity": "CRITICAL",
      "message": "Suspicious file detected on LAB-PC-02: malware.exe detected",
      "acknowledged": false,
      "created_at": "2026-09-08 17:44:40"
    }
  ]
}
```

**curl:**
```bash
# Active alerts only (most useful for dashboard)
curl "http://localhost:5000/api/alerts?acknowledged=false"

# CRITICAL alerts only
curl "http://localhost:5000/api/alerts?severity=CRITICAL"
```

---

#### `GET /api/alerts/<id>`

Get a single alert by ID.

**Response 200:** Same shape as one alert in the list.
**Response 404:** Alert not found.

**curl:**
```bash
curl http://localhost:5000/api/alerts/1
```

---

#### `PATCH /api/alerts/<id>/acknowledge`

Acknowledge an alert. Idempotent — calling on an already-acknowledged alert returns success.

**No request body required.**

**Response 200:**
```json
{ "success": true, "data": { "alert_id": 1, "message": "Alert acknowledged" } }
```

```json
{ "success": true, "data": { "alert_id": 1, "message": "Alert was already acknowledged" } }
```

**Response 404:** Alert not found.

**curl:**
```bash
curl -X PATCH http://localhost:5000/api/alerts/1/acknowledge
```

---

### Dashboard

#### `GET /api/dashboard/summary`

Returns all aggregate information the dashboard needs in a single request. All values are computed from live database queries.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "total_computers": 25,
    "online_computers": 21,
    "offline_computers": 4,
    "active_alerts": 3,
    "recent_events": [
      {
        "id": 42,
        "hostname": "LAB-PC-03",
        "event_type": "usb_connected",
        "description": "USB device connected",
        "metadata": { "device_name": "Kingston DataTraveler" },
        "timestamp": "2026-09-08 17:30:00"
      }
    ]
  }
}
```

`recent_events` contains the 10 most recent events across all computers.

**curl:**
```bash
curl http://localhost:5000/api/dashboard/summary
```

---

## HTTP Status Codes Reference

| Code | Meaning |
|---|---|
| 200 | Success |
| 201 | Resource created |
| 400 | Bad request (missing fields, invalid values) |
| 404 | Resource not found |
| 405 | Method not allowed |
| 409 | Conflict (e.g., duplicate hostname) |
| 500 | Internal server error |

---

## Technology Stack

| Component | Technology |
|---|---|
| Monitoring Agent | Python 3 (stdlib only for core logic) |
| Backend API | Flask 3 |
| Database | SQLite |
| HTTP client (agent) | requests |
| Frontend | HTML / CSS / JS (separate repo) |

---

## Privacy and Authorization

LabGuard is designed for use **only on authorized institutional computers**.

The system does not collect:
- Passwords or credentials
- Private messages or personal communications
- Sensitive personal content

Monitoring is limited to: device connection events, folder changes, and computer availability status.

---

## Disclaimer

LabGuard is an educational cybersecurity monitoring prototype. It does not replace enterprise antivirus, EDR, or professional security monitoring solutions. Deploy only on computers with proper institutional authorization.

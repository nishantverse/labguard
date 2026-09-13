# 🛡️ LabGuard — Complete Setup & How-To-Use Guide

This guide provides step-by-step instructions on how to set up, configure, run, and test every component of the **LabGuard Smart Security Monitoring System**:
1. **The Server** (`backend/server/main.py`) — Central REST API & real-time WebSocket hub
2. **The Agent** (`backend/agent/agent.py`) — Telemetry daemon running on lab computers
3. **The Frontend** (`frontend/`) — Real-time SOC administrator dashboard

---

## 📑 Table of Contents
- [1. System Architecture Overview](#1-system-architecture-overview)
- [2. Prerequisites Matrix](#2-prerequisites-matrix)
- [3. Setting Up the Central Server](#3-setting-up-the-central-server)
  - [Step 3.1: Python Environment & Dependencies](#step-31-python-environment--dependencies)
  - [Step 3.2: Server Configuration (.env)](#step-32-server-configuration-env)
  - [Step 3.3: Finding the Server's IP Address](#step-33-finding-the-servers-ip-address)
  - [Step 3.4: Starting the Server](#step-34-starting-the-server)
  - [Step 3.5: Verifying Server Health](#step-35-verifying-server-health)
- [4. Setting Up the Agent (Client Computers)](#4-setting-up-the-agent-client-computers)
  - [What the Agent Does](#what-the-agent-does)
  - [Step 4.1: Agent Installation & Dependencies](#step-41-agent-installation--dependencies)
  - [Step 4.2: Running the Agent on Linux](#step-42-running-the-agent-on-linux)
  - [Step 4.3: Running the Agent on Windows](#step-43-running-the-agent-on-windows)
  - [Step 4.4: Agent Background Services (Auto-Start)](#step-44-agent-background-services-auto-start)
- [5. Setting Up the Frontend Admin Dashboard](#5-setting-up-the-frontend-admin-dashboard)
  - [Step 5.1: Node.js Dependencies](#step-51-nodejs-dependencies)
  - [Step 5.2: Environment Configuration (.env)](#step-52-environment-configuration-env)
  - [Step 5.3: Running the Dashboard](#step-53-running-the-dashboard)
- [6. End-to-End Testing & Verification Workflow](#6-end-to-end-testing--verification-workflow)
  - [Test 1: Agent Heartbeat & Auto-Registration](#test-1-agent-heartbeat--auto-registration)
  - [Test 2: USB Plug / Unplug Event Detection](#test-2-usb-plug--unplug-event-detection)
  - [Test 3: Suspicious File Detection in Downloads](#test-3-suspicious-file-detection-in-downloads)
  - [Test 4: Manual Simulated Event Injection](#test-4-manual-simulated-event-injection)
  - [Test 5: Alert Acknowledgment in Real Time](#test-5-alert-acknowledgment-in-real-time)
- [7. Troubleshooting & Common Issues](#7-troubleshooting--common-issues)
- [8. Quick Reference Command Cheat Sheet](#8-quick-reference-command-cheat-sheet)

---

## 1. System Architecture Overview

```
 ┌─────────────────────────────────────────────────────────────┐
 │                LAB COMPUTER (Client Machine)                │
 │                                                             │
 │  LabGuard Agent (agent.agent)                               │
 │  ├── Heartbeat Loop (every 30s)                             │
 │  ├── USB Monitor (pyudev / hardware events)                 │
 │  └── Folder Monitor (watchdog on ~/Downloads)               │
 └──────────────────────────────┬──────────────────────────────┘
                                │
                  HTTP REST     │  POST /api/heartbeat
                  Ingestion     │  POST /api/events
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │                CENTRAL LABGUARD SERVER                      │
 │                                                             │
 │  Flask + Socket.IO Server (server.main :5000)               │
 │  ├── SQLite Database (database/labguard.db)                 │
 │  ├── Rule Engine (server.services.alert_service)            │
 │  └── Real-time WebSocket Broadcaster (server.ws)            │
 └──────────────────────────────┬──────────────────────────────┘
                                │
                  Bidirectional │  Socket.IO Events:
                  WebSocket     │  new_alert, new_event,
                  (WSS / WS)    │  dashboard_update, etc.
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │                ADMINISTRATOR DASHBOARD                      │
 │                                                             │
 │  React 19 + Vite 8 SOC Console (:5173)                      │
 │  ├── Live Fleet Status & Stats                              │
 │  ├── Real-Time Security Alerts                              │
 │  └── Automatic Polling Fallback if WS Drops                 │
 └─────────────────────────────────────────────────────────────┘
```

---

## 2. Prerequisites Matrix

| Component | Machine | Prerequisites |
|---|---|---|
| **Server** | Central Host / Lab Server | Python 3.10+, `pip`, SQLite (built into Python) |
| **Agent** | Each Lab Computer | Python 3.10+, `pip` |
| **Agent (Linux USB)** | Linux Lab PCs | `pyudev` (`pip install pyudev`), access to udev events |
| **Agent (Folder Watch)** | Linux & Windows PCs | `watchdog` (`pip install watchdog`) |
| **Frontend** | Admin Machine / Server | Node.js 18.x+, `npm` 9.x+ |

---

## 3. Setting Up the Central Server

The server must be started **first**, before the agents and frontend connect.

### Step 3.1: Python Environment & Dependencies

1. Navigate to the `backend/` directory:
   ```bash
   cd /path/to/labguard/backend
   ```

2. Create and activate a Python virtual environment:
   - **Linux / macOS:**
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     ```
   - **Windows (PowerShell):**
     ```powershell
     python -m venv .venv
     .venv\Scripts\Activate.ps1
     ```

3. Install all server dependencies:
   ```bash
   pip install -r requirements.txt
   ```

   *(Installed packages include: `flask`, `flask-cors`, `flask-socketio`, `simple-websocket`, `requests`, `pyudev`, `watchdog`, `python-dotenv`)*

---

### Step 3.2: Server Configuration (.env)

The server loads configuration from `backend/.env`. You can create one from the example:

```bash
cp .env.example .env
```

Default configuration in `.env`:
```ini
# SQLite Database File (automatically created on first launch)
LABGUARD_DB_PATH=database/labguard.db

# Flask & WebSocket Server Binding
# Use 0.0.0.0 so computers across your LAN / lab can connect
LABGUARD_HOST=0.0.0.0
LABGUARD_PORT=5000
LABGUARD_DEBUG=true

# Offline Detection (seconds before a computer without heartbeat is marked offline)
LABGUARD_HEARTBEAT_TIMEOUT=120
```

> 💡 **Tip:** Keeping `LABGUARD_HOST=0.0.0.0` ensures the server listens on all network interfaces (LAN, Wi-Fi, Ethernet, and localhost).

---

### Step 3.3: Finding the Server's IP Address

To allow client lab computers (agents) and remote browsers to connect, find the server's local LAN IP address:

- **Linux / macOS:**
  ```bash
  hostname -I | awk '{print $1}'
  # or
  ip addr show
  ```
  *(Example output: `192.168.1.50` or Tailscale IP `100.113.226.61`)*

- **Windows (PowerShell):**
  ```powershell
  ipconfig
  ```
  *(Look for the IPv4 Address under your active Ethernet or Wi-Fi adapter, e.g. `192.168.1.50`)*

---

### Step 3.4: Starting the Server

From the `backend/` directory with the virtual environment activated, run:

```bash
python3 -m server.main
```
*(On Windows: `python -m server.main`)*

**Expected Console Output:**
```text
======================================================================
🛡️  LabGuard Server is live!
   Local URL   : http://127.0.0.1:5000
   Network URL : http://192.168.1.50:5000

📦 Client Agent One-Line Auto-Installers:
   (Run on any computer in your lab to automatically install & link)

   🐧 Linux:
      curl -sSL http://192.168.1.50:5000/script.sh | bash

   🪟 Windows (PowerShell):
      irm http://192.168.1.50:5000/script.ps1 | iex
======================================================================
```

> The database schema is automatically checked and initialized in `database/labguard.db`. No manual SQL migrations required!

---

### Step 3.5: Verifying Server Health

In another terminal, test the root endpoint:
```bash
curl http://localhost:5000/
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "name": "LabGuard API",
    "version": "1.1.0",
    "status": "running",
    "websocket": "enabled",
    "agent_install": {
      "linux": "curl -sSL http://192.168.1.50:5000/script.sh | bash",
      "windows": "irm http://192.168.1.50:5000/script.ps1 | iex"
    },
    "docs": "See README.md and HOW_TO_USE.md for details"
  }
}
```

---

## 4. Setting Up the Agent (Client Computers)

### What the Agent Does
The agent runs quietly on **each computer in the laboratory**. It continuously:
1. **Sends Heartbeats**: Pings `POST /api/heartbeat` every 30 seconds with its hostname and IP address. (If the computer is not registered yet, the server auto-registers it immediately).
2. **Monitors USB Ports**: Listens for hardware plug/unplug events (flash drives, phones, external storage) and posts a `usb_connected` or `usb_disconnected` event.
3. **Monitors Folder Changes**: Watches `~/Downloads` for executable/script files (`.exe`, `.bat`, `.sh`, `.ps1`, `.vbs`, `.msi`) and posts a `suspicious_file` event.

---

### ⚡ Option A: Automated One-Line Setup (Recommended)

The central server dynamically generates and serves self-configuring install scripts for both Linux and Windows. You don't need to copy git repositories or manually edit IP addresses!

#### 🐧 On Linux Lab PCs:
Open a terminal on the client computer and run:
```bash
curl -sSL http://<SERVER_IP>:5000/script.sh | bash
```
*(Replace `<SERVER_IP>` with the Server IP shown on the server's startup banner, e.g. `http://192.168.1.50:5000`)*

**What this automated script does:**
1. Verifies Python 3 is installed.
2. Downloads the lightweight agent bundle directly from `http://<SERVER_IP>:5000/download/agent.tar.gz`.
3. Unpacks it into `~/.labguard-agent/`.
4. Sets up a dedicated virtualenv and installs `requests`, `watchdog`, and `pyudev`.
5. Automatically configures `LABGUARD_SERVER_URL=http://<SERVER_IP>:5000`.
6. Sets up and starts a persistent **systemd user service** (no sudo/root required) so the agent boots automatically on startup.
7. Performs an immediate check-in heartbeat!

#### 🪟 On Windows Lab PCs:
Open **PowerShell** on the Windows machine and run:
```powershell
irm http://<SERVER_IP>:5000/script.ps1 | iex
```
**What this automated script does:**
1. Checks for Python 3.
2. Downloads `agent.zip` from the server and unpacks to `$HOME\.labguard-agent`.
3. Installs `requests` and `watchdog`.
4. Injects the server URL into `.env`.
5. Creates a silent background launcher in the Windows **Startup folder** (`labguard-agent.vbs`) and starts it immediately.

---

### 🛠️ Option B: Manual Setup (Alternative)

If you prefer to configure the agent manually:

#### Step 4.1: Agent Installation & Dependencies
On the client machine:
1. Copy the `backend/` directory to the lab computer (e.g. `/opt/labguard/` on Linux or `C:\LabGuard\` on Windows).
2. Install dependencies:
   ```bash
   pip install requests watchdog pyudev
   ```
   *(On Windows, omit `pyudev` as it is Linux-specific)*.

#### Step 4.2: Running the Agent Manually on Linux
```bash
cd /path/to/labguard/backend
LABGUARD_SERVER_URL=http://192.168.1.50:5000 python3 -m agent.agent
```

#### Step 4.3: Running the Agent Manually on Windows
```powershell
cd C:\path\to\labguard\backend
$env:LABGUARD_SERVER_URL="http://192.168.1.50:5000"
python -m agent.agent
```

**Expected Agent Output on Linux:**
```text
2026-09-13 19:52:10 [INFO] labguard.agent: ==================================================
2026-09-13 19:52:10 [INFO] labguard.agent: LabGuard Agent starting
2026-09-13 19:52:10 [INFO] labguard.agent:   Hostname        : LAB-PC-01
2026-09-13 19:52:10 [INFO] labguard.agent:   Server URL      : http://192.168.1.50:5000
2026-09-13 19:52:10 [INFO] labguard.agent:   Heartbeat every : 30s
2026-09-13 19:52:10 [INFO] labguard.agent: ==================================================
2026-09-13 19:52:10 [INFO] agent.usb_monitor: USBMonitor started — Linux / pyudev.MonitorObserver.
2026-09-13 19:52:10 [INFO] agent.folder_monitor: FolderMonitor started — watching '/home/student/Downloads' for patterns ['*.exe', '*.bat', '*.sh', '*.ps1', '*.vbs', '*.msi']
2026-09-13 19:52:10 [INFO] labguard.agent: Agent is running. Press Ctrl+C to stop.
2026-09-13 19:52:10 [INFO] agent.heartbeat: Heartbeat loop started — server: http://192.168.1.50:5000, interval: 30s
```

---

### Step 4.3: Running the Agent on Windows

Open **PowerShell** on the Windows lab machine:

```powershell
cd C:\path\to\labguard\backend

# Set the server URL environment variable
$env:LABGUARD_SERVER_URL="http://192.168.1.50:5000"

# Optional: customize heartbeat interval (default is 30s)
$env:LABGUARD_HEARTBEAT_INTERVAL="30"

# Start the agent
python -m agent.agent
```

---

### Step 4.4: Agent Background Services (Auto-Start)

To have the agent run automatically in the background when the lab computer boots up:

#### On Linux (systemd service)
Create `/etc/systemd/system/labguard-agent.service`:
```ini
[Unit]
Description=LabGuard Security Monitoring Agent
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=labuser
WorkingDirectory=/opt/labguard/backend
Environment="LABGUARD_SERVER_URL=http://192.168.1.50:5000"
ExecStart=/usr/bin/python3 -m agent.agent
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```
Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable labguard-agent
sudo systemctl start labguard-agent
```

#### On Windows (Task Scheduler or NSSM)
1. Open **Task Scheduler** (`taskschd.msc`).
2. Create a basic task triggered **At startup** or **When user logs on**.
3. Action: **Start a program** -> `python.exe`
4. Arguments: `-m agent.agent`
5. Start in: `C:\LabGuard\backend`
6. Set Environment variable `LABGUARD_SERVER_URL=http://192.168.1.50:5000` under System Environment Variables.

---

## 5. Setting Up the Frontend Admin Dashboard

The administrator dashboard provides a real-time dark SOC interface that connects to the server via Socket.IO WebSockets.

### Step 5.1: Node.js Dependencies

1. Navigate to the `frontend/` directory:
   ```bash
   cd /path/to/labguard/frontend
   ```

2. Install npm packages:
   ```bash
   npm install
   ```

---

### Step 5.2: Environment Configuration (.env)

Edit `frontend/.env`:
```ini
# Backend REST API endpoint (includes /api prefix)
VITE_API_URL=http://192.168.1.50:5000/api

# Backend WebSocket / Socket.IO base URL (NO /api prefix)
VITE_WS_URL=http://192.168.1.50:5000

# Fallback polling interval in milliseconds (used if WebSockets disconnect)
VITE_POLLING_INTERVAL=12000
```
> Replace `192.168.1.50` with your Server machine's IP (or `127.0.0.1` if running both on the same machine).

---

### Step 5.3: Running the Dashboard

#### Development Mode (with Hot-Reload):
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

#### Production Build:
```bash
npm run build
npm run preview
```

#### Checking Connection Status:
- Look at the bottom of the left **Sidebar**:
  - 🟢 **`Live`** (pulsing green indicator) — WebSocket connected! Real-time updates active.
  - 🟡 **`Polling`** (amber indicator) — Fallback mode active (HTTP polling every 12s).

---

## 6. End-to-End Testing & Verification Workflow

Follow this 5-minute testing sequence to verify everything is working end-to-end:

### Test 1: Agent Heartbeat & Auto-Registration
1. Start the Server and the Frontend Dashboard.
2. Start the Agent on a client PC (or another terminal).
3. Within 1 second, navigate to the **Computers** page (`/computers`) or **Dashboard** (`/`).
4. **Result**: Your computer immediately appears in the fleet list as **Online** with its IP and hostname. The "Online Systems" counter updates instantly.

---

### Test 2: USB Plug / Unplug Event Detection
1. On a Linux machine running the agent, insert a USB drive.
2. **Agent Terminal Output**:
   ```text
   [INFO] agent.usb_monitor: USB connected: Ultra Fit (SanDisk)
   [INFO] labguard.agent: Event posted: usb_connected — USB device connected: Ultra Fit
   ```
3. Look at your Dashboard in the browser:
   - Instant toast notification appears.
   - **Active Alerts** counter increments by 1.
   - **Alerts by Severity** chart displays a new **HIGH** severity alert.
   - **Recent Security Events** stream shows `usb_connected` on that computer.
4. Unplug the USB drive: a `usb_disconnected` event is recorded.

---

### Test 3: Suspicious File Detection in Downloads
1. On the machine running the agent, open `~/Downloads/`.
2. Create a test script file:
   ```bash
   touch ~/Downloads/test_payload.sh
   # or on Windows PowerShell:
   New-Item -Path "$HOME\Downloads\test_payload.bat" -ItemType File
   ```
3. **Agent Terminal Output**:
   ```text
   [INFO] agent.folder_monitor: File detected in monitored folder: test_payload.sh
   [INFO] labguard.agent: Event posted: suspicious_file — Suspicious file: /home/.../Downloads/test_payload.sh
   ```
4. Look at your Dashboard:
   - A **CRITICAL** severity alert immediately pops up in the Alerts stream.

---

### Test 4: Manual Simulated Event Injection
You can also simulate events from anywhere using `curl` or Postman without hardware:

```bash
# Simulate an unauthorized access event
curl -X POST http://localhost:5000/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "hostname": "LAB-PC-01",
    "event_type": "unauthorized_access",
    "description": "3 failed root login attempts detected",
    "metadata": {"source_ip": "10.0.0.99", "service": "ssh"}
  }'
```
> 💡 *Note: The `hostname` must match a computer that has previously sent a heartbeat or is registered.*

---

### Test 5: Alert Acknowledgment in Real Time
1. Go to the **Alerts** tab (`/alerts`).
2. Click **"Acknowledge"** on any active alert.
3. The alert status transitions to **Acknowledged**.
4. In another browser window open to the **Dashboard** (`/`), notice that the **Active Alerts** stat card decrements in real time without refreshing the page!

---

## 7. Troubleshooting & Common Issues

### Issue 1: Agent says "Cannot reach server at http://..."
- **Cause**: The agent is targeting the wrong IP, the server is not running, or a firewall is blocking port 5000.
- **Solution**:
  1. Confirm the server is running on the host machine.
  2. Verify the server's LAN IP using `hostname -I` (e.g. `192.168.1.50`).
  3. Ensure port 5000 is open in the server's firewall:
     ```bash
     # Ubuntu / Debian
     sudo ufw allow 5000/tcp
     ```
  4. Test connectivity from the agent machine using `curl http://<SERVER_IP>:5000/` or pinging the host.

---

### Issue 2: Frontend shows "Polling" instead of "Live"
- **Cause**: The browser cannot establish a WebSocket connection to `VITE_WS_URL`.
- **Solution**:
  1. Check `frontend/.env` and verify `VITE_WS_URL` is set to `http://<SERVER_IP>:5000` (without `/api` at the end).
  2. Open browser Developer Tools (F12) -> **Console** to view connection errors.
  3. Navigate to **Settings** (`/settings`) in the dashboard to inspect the live WebSocket diagnostic card.

---

### Issue 3: "Unknown computer" error when posting an event
- **Cause**: `POST /api/events` requires the computer to be known to the server before it can post events.
- **Solution**:
  1. Run the agent once so it sends an initial heartbeat to auto-register.
  2. Or manually register the computer in the **Computers** tab or via:
     ```bash
     curl -X POST http://localhost:5000/api/computers \
       -H "Content-Type: application/json" \
       -d '{"hostname": "LAB-PC-01", "ip_address": "192.168.1.10"}'
     ```

---

### Issue 4: pyudev error on Linux Agent: `ModuleNotFoundError: No module named 'pyudev'`
- **Cause**: `pyudev` is required on Linux for hardware-level USB detection.
- **Solution**:
  ```bash
  pip install pyudev
  ```

---

### Issue 5: Computer shows as "Offline" in Dashboard
- **Cause**: The server has not received a heartbeat from that computer within `LABGUARD_HEARTBEAT_TIMEOUT` seconds (default 120s).
- **Solution**: Check if the agent process is still running on that computer. As soon as the agent sends its next heartbeat, the computer immediately transitions back to **Online**.

---

## 8. Quick Reference Command Cheat Sheet

| Task | Command | Directory |
|---|---|---|
| **Start Server** | `python3 -m server.main` | `backend/` |
| **Auto-Install Agent (Linux)** | `curl -sSL http://<IP>:5000/script.sh \| bash` | Client PC |
| **Auto-Install Agent (Windows)** | `irm http://<IP>:5000/script.ps1 \| iex` | Client PC |
| **Manual Agent (Linux)** | `LABGUARD_SERVER_URL=http://<IP>:5000 python3 -m agent.agent` | `backend/` |
| **Manual Agent (Windows)** | `$env:LABGUARD_SERVER_URL="http://<IP>:5000"; python -m agent.agent` | `backend/` |
| **Start Frontend (Dev)** | `npm run dev` | `frontend/` |
| **Build Frontend** | `npm run build` | `frontend/` |
| **Lint Frontend** | `npm run lint` | `frontend/` |
| **Health Check API** | `curl http://localhost:5000/` | Any |
| **View Computers** | `curl http://localhost:5000/api/computers` | Any |
| **View Alerts** | `curl http://localhost:5000/api/alerts?acknowledged=false` | Any |
| **View Dashboard Summary**| `curl http://localhost:5000/api/dashboard/summary` | Any |


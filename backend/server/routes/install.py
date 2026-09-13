"""
LabGuard — Automated Agent Installation & Distribution Routes
=============================================================
Provides automated, zero-touch installation scripts for lab computers.

Endpoints:
  GET /install.sh       Self-contained Bash auto-installer for Linux (embedded agent code)
  GET /script.sh        Alias for /install.sh
  GET /install.ps1      PowerShell auto-installer for Windows
  GET /script.ps1       Alias for /install.ps1
  GET /download/agent.tar.gz   Tarball of the agent package
  GET /download/agent.zip      Zip of the agent package
"""

import io
import os
import tarfile
import zipfile
import logging
from pathlib import Path
from flask import Blueprint, Response, request, send_file

logger = logging.getLogger(__name__)

install_bp = Blueprint("install", __name__)

_backend_dir = Path(__file__).resolve().parent.parent.parent
_agent_dir = _backend_dir / "agent"
_config_path = _backend_dir / "config.py"


def _get_server_url() -> str:
    """Extract base server URL from incoming request (e.g. http://192.168.1.50:5000)."""
    return request.host_url.rstrip("/")


def _read_agent_files() -> dict:
    """Read agent source files to embed directly in self-contained installer scripts."""
    files = {}
    for name in ["__init__.py", "agent.py", "heartbeat.py", "usb_monitor.py", "folder_monitor.py"]:
        p = _agent_dir / name
        if p.is_file():
            files[f"agent/{name}"] = p.read_text(encoding="utf-8")
        else:
            files[f"agent/{name}"] = ""
    if _config_path.is_file():
        files["config.py"] = _config_path.read_text(encoding="utf-8")
    else:
        files["config.py"] = ""
    return files


@install_bp.route("/install.sh", methods=["GET"])
@install_bp.route("/script.sh", methods=["GET"])
@install_bp.route("/install", methods=["GET"])
@install_bp.route("/script", methods=["GET"])
def install_sh():
    """Serve dynamic self-contained Linux bash installer with embedded agent code and server URL."""
    server_url = _get_server_url()
    logger.info(f"Agent installer requested by {request.remote_addr} (Host: {request.host})")

    files = _read_agent_files()

    script = f"""#!/usr/bin/env bash
# ==============================================================================
# 🛡️ LabGuard Agent Auto-Installer for Linux
# Target Server: {server_url}
# ==============================================================================
set -e

SERVER_URL="{server_url}"
INSTALL_DIR="$HOME/.labguard-agent"
HOSTNAME_STR=$(hostname | tr '[:upper:]' '[:lower:]')

echo ""
echo "=================================================================="
echo "🛡️  LabGuard Agent Auto-Installer"
echo "    Target Server: $SERVER_URL"
echo "    Client Host  : $HOSTNAME_STR"
echo "=================================================================="
echo ""

# ── 1. Check Python 3 ──────────────────────────────────────────
if ! command -v python3 >/dev/null 2>&1; then
    echo "❌ Error: python3 is not installed."
    echo "   Please install Python 3 (e.g. 'sudo apt install python3 python3-pip') and rerun."
    exit 1
fi
PYTHON_BIN=$(command -v python3)
echo "✅ Found Python 3: $PYTHON_BIN"

# ── 2. Create Target Directory & Unpack Agent ──────────────────
echo "📁 Setting up agent files at $INSTALL_DIR..."
mkdir -p "$INSTALL_DIR/agent"

cat << 'AGENT_INIT_EOF' > "$INSTALL_DIR/agent/__init__.py"
{files['agent/__init__.py']}
AGENT_INIT_EOF

cat << 'AGENT_MAIN_EOF' > "$INSTALL_DIR/agent/agent.py"
{files['agent/agent.py']}
AGENT_MAIN_EOF

cat << 'AGENT_HB_EOF' > "$INSTALL_DIR/agent/heartbeat.py"
{files['agent/heartbeat.py']}
AGENT_HB_EOF

cat << 'AGENT_USB_EOF' > "$INSTALL_DIR/agent/usb_monitor.py"
{files['agent/usb_monitor.py']}
AGENT_USB_EOF

cat << 'AGENT_FOLDER_EOF' > "$INSTALL_DIR/agent/folder_monitor.py"
{files['agent/folder_monitor.py']}
AGENT_FOLDER_EOF

cat << 'AGENT_CFG_EOF' > "$INSTALL_DIR/config.py"
{files['config.py']}
AGENT_CFG_EOF

echo "✅ Agent code installed."

# ── 3. Setup Python Environment & Dependencies ─────────────────
VENV_DIR="$INSTALL_DIR/venv"
HAS_VENV=false

if "$PYTHON_BIN" -m venv "$VENV_DIR" >/dev/null 2>&1; then
    HAS_VENV=true
    AGENT_PYTHON="$VENV_DIR/bin/python"
    AGENT_PIP="$VENV_DIR/bin/pip"
    echo "✅ Dedicated virtual environment created at $VENV_DIR"
else
    AGENT_PYTHON="$PYTHON_BIN"
    AGENT_PIP="$PYTHON_BIN -m pip"
    echo "ℹ️  Using system Python environment."
fi

echo "📦 Installing agent packages (requests, watchdog, pyudev, python-dotenv)..."
if [ "$HAS_VENV" = true ]; then
    "$AGENT_PIP" install requests watchdog pyudev python-dotenv || true
else
    $AGENT_PIP install --break-system-packages requests watchdog pyudev python-dotenv 2>/dev/null || \
    $AGENT_PIP install requests watchdog pyudev python-dotenv || true
fi
echo "✅ Packages installed."

# ── 4. Configure Agent Settings ────────────────────────────────
echo "⚙️  Writing configuration..."
cat <<'EOF_ENV' > "$INSTALL_DIR/.env"
LABGUARD_SERVER_URL={server_url}
LABGUARD_HEARTBEAT_INTERVAL=30
EOF_ENV

# ── 5. Immediate Registration & Heartbeat Check ───────────────
echo "💓 Testing connection and registering with server..."
IP_ADDR=$(ip route get 1.1.1.1 2>/dev/null | awk '{{print $7}}' || hostname -I 2>/dev/null | awk '{{print $1}}' || echo "127.0.0.1")
HB_PAYLOAD="{{\\"hostname\\": \\"$HOSTNAME_STR\\", \\"ip_address\\": \\"$IP_ADDR\\"}}"
HB_RESP=""
if command -v curl >/dev/null 2>&1; then
    HB_RESP=$(curl -s -X POST "$SERVER_URL/api/heartbeat" -H "Content-Type: application/json" -d "$HB_PAYLOAD" 2>/dev/null || echo "")
elif command -v wget >/dev/null 2>&1; then
    HB_RESP=$(wget -qO- --post-data="$HB_PAYLOAD" --header="Content-Type: application/json" "$SERVER_URL/api/heartbeat" 2>/dev/null || echo "")
fi

if echo "$HB_RESP" | grep -q '"success":true'; then
    echo "✅ Successfully registered in LabGuard database as '$HOSTNAME_STR' ($IP_ADDR)!"
else
    echo "⚠️  Initial registration ping response: $HB_RESP"
    echo "   (The agent daemon will continue retrying every 30 seconds)"
fi

# ── 6. Setup Background Auto-Start Service ─────────────────────
STARTED=false

if command -v systemctl >/dev/null 2>&1 && [ -d /run/systemd/system ]; then
    if [ "$EUID" -eq 0 ]; then
        SERVICE_PATH="/etc/systemd/system/labguard-agent.service"
        echo "🔧 Installing system-wide service at $SERVICE_PATH..."
        cat <<EOF_SVC > "$SERVICE_PATH"
[Unit]
Description=LabGuard Security Monitoring Agent
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${{SUDO_USER:-root}}
WorkingDirectory=$INSTALL_DIR
Environment="LABGUARD_SERVER_URL=$SERVER_URL"
Environment="LABGUARD_HEARTBEAT_INTERVAL=30"
ExecStart=$AGENT_PYTHON -m agent.agent
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF_SVC
        systemctl daemon-reload
        systemctl enable labguard-agent.service >/dev/null 2>&1 || true
        systemctl restart labguard-agent.service 2>/dev/null || true
        if systemctl is-active --quiet labguard-agent.service 2>/dev/null; then
            STARTED=true
            echo "✅ Running as system-wide systemd service (systemctl status labguard-agent)"
        fi
    else
        USER_SVC_DIR="$HOME/.config/systemd/user"
        mkdir -p "$USER_SVC_DIR"
        SERVICE_PATH="$USER_SVC_DIR/labguard-agent.service"
        echo "🔧 Installing user service at $SERVICE_PATH..."
        cat <<EOF_USER_SVC > "$SERVICE_PATH"
[Unit]
Description=LabGuard Security Monitoring Agent
After=network.target

[Service]
Type=simple
WorkingDirectory=$INSTALL_DIR
Environment="LABGUARD_SERVER_URL=$SERVER_URL"
Environment="LABGUARD_HEARTBEAT_INTERVAL=30"
ExecStart=$AGENT_PYTHON -m agent.agent
Restart=always
RestartSec=10

[Install]
WantedBy=default.target
EOF_USER_SVC
        systemctl --user daemon-reload >/dev/null 2>&1 || true
        systemctl --user enable labguard-agent.service >/dev/null 2>&1 || true
        systemctl --user restart labguard-agent.service 2>/dev/null || true
        if systemctl --user is-active --quiet labguard-agent.service 2>/dev/null; then
            STARTED=true
            echo "✅ Running as systemd user service (systemctl --user status labguard-agent)"
        fi
    fi
fi

if [ "$STARTED" = false ]; then
    echo "ℹ️  Starting agent process in background with nohup..."
    pkill -f "agent.agent" 2>/dev/null || true
    nohup env LABGUARD_SERVER_URL="$SERVER_URL" "$AGENT_PYTHON" -m agent.agent > "$INSTALL_DIR/agent.log" 2>&1 &
    sleep 1
    if pgrep -f "agent.agent" >/dev/null 2>&1; then
        echo "✅ Agent running in background (PID: $(pgrep -f "agent.agent" | head -n1)). Logs: $INSTALL_DIR/agent.log"
    else
        echo "⚠️  Agent process did not stay running. Inspecting $INSTALL_DIR/agent.log:"
        cat "$INSTALL_DIR/agent.log" 2>/dev/null || true
    fi
fi

echo ""
echo "=================================================================="
echo "🎉 LabGuard Agent setup complete on $HOSTNAME_STR!"
echo "   Server URL : $SERVER_URL"
echo "   Status     : Online & Active"
echo "   Dashboard  : Refresh your dashboard to see $HOSTNAME_STR"
echo "=================================================================="
echo ""
"""
    return Response(script, mimetype="text/x-sh")


@install_bp.route("/install.ps1", methods=["GET"])
@install_bp.route("/script.ps1", methods=["GET"])
def install_ps1():
    """Serve dynamic self-contained Windows PowerShell installer."""
    server_url = _get_server_url()
    logger.info(f"Windows agent installer requested by {request.remote_addr} (Host: {request.host})")

    files = _read_agent_files()

    script = f"""# ==============================================================================
# 🛡️ LabGuard Agent Auto-Installer for Windows (PowerShell)
# Target Server: {server_url}
# ==============================================================================
$ErrorActionPreference = "Stop"

$SERVER_URL = "{server_url}"
$INSTALL_DIR = Join-Path $HOME ".labguard-agent"
$AGENT_DIR = Join-Path $INSTALL_DIR "agent"
$hostName = $env:COMPUTERNAME.ToLower()

Write-Host ""
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "🛡️  LabGuard Agent Auto-Installer for Windows" -ForegroundColor Cyan
Write-Host "    Target Server: $SERVER_URL" -ForegroundColor Gray
Write-Host "    Client Host  : $hostName" -ForegroundColor Gray
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host ""

# ── 1. Check Python ────────────────────────────────────────────
$pythonCmd = (Get-Command python -ErrorAction SilentlyContinue)
if (-not $pythonCmd) {{
    $pythonCmd = (Get-Command py -ErrorAction SilentlyContinue)
}}
if (-not $pythonCmd) {{
    Write-Host "❌ Error: Python is not installed or not in your PATH." -ForegroundColor Red
    Write-Host "   Please install Python 3 from python.org and rerun." -ForegroundColor Red
    exit 1
}}
$PYTHON_BIN = $pythonCmd.Source
Write-Host "✅ Found Python: $PYTHON_BIN" -ForegroundColor Green

# ── 2. Create Directory & Write Agent Files ────────────────────
if (-not (Test-Path $AGENT_DIR)) {{
    New-Item -ItemType Directory -Path $AGENT_DIR -Force | Out-Null
}}

@'
{files['agent/__init__.py']}
'@ | Out-File -FilePath (Join-Path $AGENT_DIR "__init__.py") -Encoding utf8

@'
{files['agent/agent.py']}
'@ | Out-File -FilePath (Join-Path $AGENT_DIR "agent.py") -Encoding utf8

@'
{files['agent/heartbeat.py']}
'@ | Out-File -FilePath (Join-Path $AGENT_DIR "heartbeat.py") -Encoding utf8

@'
{files['agent/usb_monitor.py']}
'@ | Out-File -FilePath (Join-Path $AGENT_DIR "usb_monitor.py") -Encoding utf8

@'
{files['agent/folder_monitor.py']}
'@ | Out-File -FilePath (Join-Path $AGENT_DIR "folder_monitor.py") -Encoding utf8

@'
{files['config.py']}
'@ | Out-File -FilePath (Join-Path $INSTALL_DIR "config.py") -Encoding utf8

Write-Host "✅ Agent files installed." -ForegroundColor Green

# ── 3. Install Dependencies ────────────────────────────────────
Write-Host "📦 Installing dependencies (requests, watchdog)..." -ForegroundColor Yellow
& $PYTHON_BIN -m pip install requests watchdog
Write-Host "✅ Packages installed." -ForegroundColor Green

# ── 4. Configure Agent ─────────────────────────────────────────
$envFile = Join-Path $INSTALL_DIR ".env"
@"
LABGUARD_SERVER_URL=$SERVER_URL
LABGUARD_HEARTBEAT_INTERVAL=30
"@ | Out-File -FilePath $envFile -Encoding utf8

# ── 5. Immediate Registration & Heartbeat Check ───────────────
Write-Host "💓 Testing connection and registering with server..." -ForegroundColor Yellow
$ipAddr = "127.0.0.1"
try {{
    $netIp = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Wi-Fi*","Ethernet*" -ErrorAction SilentlyContinue | Where-Object {{ $_.IPAddress -notlike "169.254*" }} | Select-Object -First 1).IPAddress
    if ($netIp) {{ $ipAddr = $netIp }}
}} catch {{}}

$hbBody = @{{ hostname = $hostName; ip_address = $ipAddr }} | ConvertTo-Json
try {{
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $hbResp = Invoke-RestMethod -Uri "$SERVER_URL/api/heartbeat" -Method Post -Body $hbBody -ContentType "application/json" -TimeoutSec 8
    if ($hbResp.success) {{
        Write-Host "✅ Successfully registered in LabGuard database as '$hostName' ($ipAddr)!" -ForegroundColor Green
    }}
}} catch {{
    Write-Host "⚠️  Initial registration ping: $_" -ForegroundColor Yellow
}}

# ── 6. Setup Startup Launcher & Start Agent ────────────────────
$startupFolder = [Environment]::GetFolderPath("Startup")
$vbsPath = Join-Path $startupFolder "labguard-agent.vbs"

# Terminate any previously running agent instance
Get-Process -Name python -ErrorAction SilentlyContinue | Where-Object {{
    $_.CommandLine -like "*agent.agent*"
}} | Stop-Process -Force -ErrorAction SilentlyContinue

# Create silent background VBScript launcher in Windows Startup folder
@"
Set WshShell = CreateObject("WScript.Shell")
WshShell.Environment("PROCESS")("LABGUARD_SERVER_URL") = "$SERVER_URL"
WshShell.CurrentDirectory = "$INSTALL_DIR"
WshShell.Run "python -m agent.agent", 0, False
"@ | Out-File -FilePath $vbsPath -Encoding ascii

# Launch now in background
wscript.exe $vbsPath

Write-Host ""
Write-Host "==================================================================" -ForegroundColor Green
Write-Host "🎉 LabGuard Agent successfully setup on $hostName!" -ForegroundColor Green
Write-Host "   Server URL : $SERVER_URL" -ForegroundColor Cyan
Write-Host "   Status     : Running in background (starts automatically on login)" -ForegroundColor Gray
Write-Host "   Dashboard  : Refresh your dashboard to see $hostName" -ForegroundColor Green
Write-Host "==================================================================" -ForegroundColor Green
Write-Host ""
"""
    return Response(script, mimetype="text/plain")


@install_bp.route("/download/agent.tar.gz", methods=["GET"])
def download_tarball():
    """Package the agent code and config into an in-memory tarball and send it."""
    tar_buf = io.BytesIO()
    with tarfile.open(fileobj=tar_buf, mode="w:gz") as tar:
        def _tar_filter(tarinfo):
            if "__pycache__" in tarinfo.name or tarinfo.name.endswith(".pyc"):
                return None
            return tarinfo

        if _agent_dir.is_dir():
            tar.add(str(_agent_dir), arcname="agent", filter=_tar_filter)

        if _config_path.is_file():
            tar.add(str(_config_path), arcname="config.py")

    tar_buf.seek(0)
    return send_file(
        tar_buf,
        mimetype="application/gzip",
        as_attachment=True,
        download_name="agent.tar.gz",
    )


@install_bp.route("/download/agent.zip", methods=["GET"])
def download_zip():
    """Package the agent code and config into an in-memory zip and send it."""
    zip_buf = io.BytesIO()
    with zipfile.ZipFile(zip_buf, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        if _agent_dir.is_dir():
            for root, _, files in os.walk(_agent_dir):
                if "__pycache__" in root:
                    continue
                for file in files:
                    if file.endswith(".pyc"):
                        continue
                    full_path = os.path.join(root, file)
                    rel_path = os.path.relpath(full_path, _backend_dir)
                    zf.write(full_path, arcname=rel_path)

        if _config_path.is_file():
            zf.write(str(_config_path), arcname="config.py")

    zip_buf.seek(0)
    return send_file(
        zip_buf,
        mimetype="application/zip",
        as_attachment=True,
        download_name="agent.zip",
    )

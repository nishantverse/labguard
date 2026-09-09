"""
LabGuard Configuration
======================
All configurable values are read from environment variables.
Copy .env.example to .env and set values for your deployment.

To load a .env file on Linux/macOS:
    export $(cat .env | grep -v '#' | xargs)

On Windows (PowerShell):
    Get-Content .env | ForEach-Object { $k,$v = $_ -split '=',2; Set-Item "env:$k" $v }
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Automatically locate and load .env from the backend/ directory
_env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=_env_path)

# Database
# ──────────────────────────────────────────────
DATABASE_PATH = os.environ.get("LABGUARD_DB_PATH", "database/labguard.db")

# ──────────────────────────────────────────────
# Flask Server
# ──────────────────────────────────────────────
SERVER_HOST = os.environ.get("LABGUARD_HOST", "0.0.0.0")
SERVER_PORT = int(os.environ.get("LABGUARD_PORT", "5000"))
DEBUG = os.environ.get("LABGUARD_DEBUG", "true").lower() == "true"

# ──────────────────────────────────────────────
# Offline Detection
# Number of seconds since last heartbeat before a computer is
# considered offline. Agents send heartbeats every 30s by default,
# so 120s gives a 4-missed-heartbeat grace period.
# ──────────────────────────────────────────────
HEARTBEAT_TIMEOUT_SECONDS = int(os.environ.get("LABGUARD_HEARTBEAT_TIMEOUT", "120"))

# ──────────────────────────────────────────────
# Agent Settings  (consumed by agent/agent.py)
# Set LABGUARD_SERVER_URL to the LAN IP of the machine running
# the LabGuard server, e.g. http://192.168.1.100:5000
# ──────────────────────────────────────────────
AGENT_SERVER_URL = os.environ.get("LABGUARD_SERVER_URL", "http://localhost:5000")
AGENT_HEARTBEAT_INTERVAL = int(os.environ.get("LABGUARD_HEARTBEAT_INTERVAL", "30"))


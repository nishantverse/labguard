### 🛡️ LabGuard

### Smart Security Monitoring System for College Computer Laboratories

LabGuard is a centralized security monitoring system designed for authorized college computer laboratories. It helps lab administrators monitor the status of laboratory computers and receive alerts about selected security-related events through a single dashboard.

---

## 📌 Problem Statement

College computer laboratories are shared environments used by multiple students every day. Monitoring security-related events across multiple computers manually can be difficult.

LabGuard provides a centralized platform to collect and display selected security events from authorized lab computers, helping administrators identify systems that may require attention.

---

## 🎯 Objectives

- Monitor the availability of registered lab computers.
- Detect and log USB/removable device activity.
- Monitor selected folders for configured file types requiring review.
- Generate alerts for detected events.
- Provide a centralized dashboard for laboratory administrators.

---

## ✨ Features

### 🖥️ Computer Monitoring
Tracks registered laboratory computers and displays their current status.

### 💾 USB Activity Monitoring
Detects and logs removable device connection events on authorized systems.

### 📁 Folder Monitoring
Monitors administrator-configured folders and flags selected file types for review.

### 🚨 Security Alerts
Generates alerts when configured security events are detected.

### 📊 Admin Dashboard
Provides a centralized view of:
- Registered computers
- Online/offline status
- Active alerts
- Recent security events

---

## 🏗️ System Architecture

```text
Lab Computers
      ↓
LabGuard Agent
      ↓
Flask Backend / API
      ↓
SQLite Database
      ↓
Admin Dashboard
```

---

## ⚙️ How It Works

1. A **LabGuard Agent** runs on an authorized lab computer.
2. The agent sends periodic status updates to the central server.
3. The agent detects configured security-related events.
4. Events are sent to the Flask backend.
5. The backend stores events in the SQLite database.
6. The administrator dashboard displays the latest system status and alerts.

---

## 💻 Technology Stack

| Component | Technology |
|---|---|
| Monitoring Agent | Python |
| Backend | Flask |
| System Monitoring | psutil |
| Folder Monitoring | watchdog |
| Database | SQLite |
| Frontend | HTML, CSS, JavaScript |
| UI Framework | Bootstrap |
| Data Visualization | Chart.js |

---

## 📂 Project Structure

```text
LabGuard/
├── agent/                 # Monitoring agent
│   ├── agent.py
│   ├── device_monitor.py
│   └── folder_monitor.py
├── server/                # Flask backend
│   ├── app.py
│   └── database.py
├── dashboard/             # Frontend dashboard
│   ├── templates/
│   └── static/
├── database/              # SQLite database
├── requirements.txt
└── README.md
```

---

## 🧪 Demonstration

1. Start the LabGuard Agent on a demonstration computer.
2. The computer appears as **Online** on the dashboard.
3. Connect a removable device to generate a configured event.
4. Add a harmless demonstration file to a monitored folder.
5. View generated alerts and event history on the administrator dashboard.

---

## 🏫 Use Case

LabGuard is designed for shared college computer laboratories. It helps authorized lab administrators:

- Monitor multiple laboratory computers from one location.
- Maintain records of selected security-related events.
- Identify computers that require administrator review.
- Improve cybersecurity awareness in shared computing environments.

---

## 🔐 Privacy and Authorization

LabGuard is designed for use only on **authorized institutional computers**.

The project does not collect:
- Passwords
- Private messages
- Personal communications
- Sensitive personal content

---

## 🚧 Project Status

**Currently under development for the Engineers' Day project.**

---

## ⚠️ Disclaimer

LabGuard is an educational cybersecurity monitoring prototype. It does not replace enterprise antivirus, Endpoint Detection and Response (EDR), or professional security monitoring solutions.

The system should only be deployed on computers with proper institutional authorization.


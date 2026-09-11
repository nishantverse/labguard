# 🛡️ LabGuard Frontend — Real-Time SOC Admin Dashboard

Modern, high-performance Security Operations Center (SOC) dashboard for **LabGuard Smart Security Monitoring System**. Built with **React 19**, **Vite 8**, **Tailwind CSS v4**, and real-time bidirectional **Socket.IO WebSockets** with automatic HTTP polling fallback.

---

## 📑 Table of Contents
- [Architecture Overview](#architecture-overview)
- [How Real-Time WebSockets Work in Frontend](#how-real-time-websockets-work-in-frontend)
- [Fallback Mechanism (Graceful Degradation)](#fallback-mechanism-graceful-degradation)
- [Directory Structure](#directory-structure)
- [Setup & Installation](#setup--installation)
- [Environment Variables](#environment-variables)
- [Running Development & Production Builds](#running-development--production-builds)
- [Pages & Views](#pages--views)
- [Key Hooks & API Architecture](#key-hooks--api-architecture)
- [UI & Styling System](#ui--styling-system)

---

## Architecture Overview

```
                        ┌───────────────────────────────┐
                        │   Flask Backend (:5000)       │
                        │   REST API + Socket.IO Server │
                        └──────────────┬────────────────┘
                                       │
                ┌──────────────────────┴──────────────────────┐
                │                                             │
      HTTP REST Requests                             WebSocket Events
  (Initial load & Fallback)                    (new_event, dashboard_update, etc.)
                │                                             │
                ▼                                             ▼
     [src/api/client.js]                             [src/api/socket.js]
                │                                             │
                └──────────────┬──────────────────────────────┘
                               ▼
               [src/hooks/useRealtimeData.js]
                               │
            ┌──────────────────┼──────────────────┐
            ▼                  ▼                  ▼
     [Dashboard.jsx]    [Computers.jsx]     [Alerts.jsx] ...
```

---

## How Real-Time WebSockets Work in Frontend

The frontend implements a layered WebSocket architecture to guarantee fast updates, zero memory leaks, and seamless connection lifecycle management:

### 1. Singleton Socket Manager (`src/api/socket.js`)
- Initializes a single `io()` instance targeting `VITE_WS_URL`.
- Configured with `transports: ['websocket', 'polling']`, automatic exponential backoff reconnection (`reconnectionDelay: 1000` to `30000ms`), and clean teardown handlers.

### 2. Connection Context (`src/context/WebSocketProvider.jsx`)
- Mounts at the application root (`App.jsx`).
- Tracks connection state (`connected: boolean`).
- Exposes `subscribe(eventName, callback)` and `emit(eventName, data)` to child components.
- Handles browser connection lifecycle, reconnection events, and clean socket unbinding on unmount.

### 3. The `useRealtimeData` Hook (`src/hooks/useRealtimeData.js`)
Every view consumes telemetry through `useRealtimeData`. The hook provides:
1. **Initial Hydration**: Immediately runs `fetchFn()` via HTTP REST so the view renders immediately.
2. **Real-time Event Subscription**: Listens for specified Socket.IO events.
   - **Inline Updates**: Updates local state immediately (e.g. `dashboard_update` updates dashboard metrics).
   - **Refetch Events**: Triggers a fast background re-fetch for list views when items change (e.g. `computer_status`, `new_event`).
3. **Identical Return Contract**: Returns `{ data, loading, error, refetch, lastUpdated, connected }` — completely compatible with existing components.

---

## Fallback Mechanism (Graceful Degradation)

The frontend never goes blind if the WebSocket connection drops:

```
[WebSocket Connected]    ──► Polling is SUSPENDED. Updates stream via WebSockets.
          │
      (Network Drop)
          ▼
[WebSocket Disconnected] ──► Polling RESUMES automatically using configurable interval (default: 12s).
          │
     (Reconnected)
          ▼
[WebSocket Reconnect]   ──► Polling SUSPENDS again; triggers an immediate refresh for fresh state.
```

- If the WebSocket server is offline or unreachable, `useRealtimeData` automatically activates a background `setInterval` polling loop.
- The polling interval can be configured globally in `Settings.jsx` or via `.env`.
- The live status indicator in the sidebar automatically switches between **`Live`** (green pulsing ping) and **`Polling`** (fallback mode).

---

## Directory Structure

```
frontend/
├── public/                 # Static assets & favicon
├── src/
│   ├── App.jsx             # Main app component, error boundary, routes, Toaster
│   ├── index.css           # Tailwind CSS v4 SOC theme definition
│   ├── main.jsx            # React root mount & BrowserRouter
│   │
│   ├── api/                # Modular REST & WebSocket API clients
│   │   ├── client.js       # Base HTTP client (fetch wrapper with error handling)
│   │   ├── socket.js       # Socket.IO client singleton manager
│   │   ├── dashboard.js    # Dashboard summary REST queries
│   │   ├── computers.js    # Computer list, details & decommission API
│   │   ├── events.js       # Security event queries & filters
│   │   └── alerts.js       # Alert queries & acknowledge mutations
│   │
│   ├── context/            # React context providers
│   │   ├── WebSocketContext.js   # Context definition
│   │   └── WebSocketProvider.jsx # WebSocket lifecycle provider
│   │
│   ├── hooks/              # Custom React hooks
│   │   ├── useLocalStorage.js    # Persistent localStorage state
│   │   ├── usePolling.js         # Configurable HTTP polling engine (fallback)
│   │   ├── useRealtimeData.js    # Primary real-time WS + polling fallback hook
│   │   └── useWebSocket.js       # Direct WebSocket context access hook
│   │
│   ├── components/         # Reusable UI components
│   │   ├── DataTable.jsx         # Flexible SOC data table with column normalizer
│   │   ├── EmptyState.jsx        # Empty state display with icon
│   │   ├── ErrorBoundary.jsx     # React ErrorBoundary crash prevention
│   │   ├── ErrorState.jsx        # Error notification with retry action
│   │   ├── Layout.jsx            # Shell layout with responsive navigation & Lenis scroll
│   │   ├── LoadingState.jsx      # Skeleton / spinner loading display
│   │   ├── RelativeTime.jsx      # Live reactive relative time ("X mins ago")
│   │   ├── SeverityBadge.jsx     # CRITICAL / HIGH / MEDIUM / LOW / INFO badges
│   │   ├── Sidebar.jsx           # SOC navigation with live WebSocket ping badge
│   │   ├── Squares.jsx           # Animated interactive canvas grid background
│   │   ├── StatCard.jsx          # Metrics stat card with loading shimmer
│   │   └── StatusBadge.jsx       # Online / Offline computer availability badge
│   │
│   ├── pages/              # Application views
│   │   ├── Dashboard.jsx         # Hero console, donut/bar charts, live event stream
│   │   ├── Computers.jsx         # Computer fleet grid, status tabs, search
│   │   ├── ComputerDetails.jsx   # Telemetry metrics, computer events, alerts, decommission
│   │   ├── Events.jsx            # Event log table, type & computer filters, JSON inspector modal
│   │   ├── Alerts.jsx            # Security alert manager, active counters, acknowledge actions
│   │   └── Settings.jsx          # REST API & WebSocket status, polling interval settings
│   │
│   └── utils/
│       └── date.js               # Safe timestamp parser & timezone-aware formatters
│
├── .env                    # Environment configuration
├── package.json            # Node.js dependencies and scripts
└── vite.config.js          # Vite 8 + Tailwind CSS v4 configuration
```

---

## Setup & Installation

### 1. Prerequisites
- Node.js 18.x or higher
- npm 9.x or higher

### 2. Install Dependencies
```bash
cd frontend
npm install
```

---

## Environment Variables

Configure connection endpoints in `.env`:

```env
# Backend REST API endpoint (includes /api prefix)
VITE_API_URL=http://127.0.0.1:5000/api

# Backend WebSocket / Socket.IO server base URL (NO /api prefix)
VITE_WS_URL=http://127.0.0.1:5000

# Fallback polling interval in milliseconds (default: 12000 = 12s)
VITE_POLLING_INTERVAL=12000
```

> **Note**: For LAN deployments (e.g. testing across lab PCs), replace `127.0.0.1` with the LAN IP of the host machine (e.g., `http://192.168.1.100:5000`).

---

## Running Development & Production Builds

### Development Server
```bash
npm run dev
```
Starts the Vite dev server with Hot Module Replacement (HMR) at `http://localhost:5173`.

### Code Quality & Linting
```bash
npm run lint
```
Runs `oxlint` across the codebase. Zero warnings and zero errors enforced.

### Production Build
```bash
npm run build
```
Creates an optimized, tree-shaken, minified build in `dist/`.

### Preview Production Build
```bash
npm run preview
```

---

## Pages & Views

| Route | Page | Real-Time WebSocket Functionality |
|---|---|---|
| `/` | **Dashboard** | Instant metrics update on `dashboard_update`; live prepending of incoming alerts on `new_alert`. Donut chart (Online vs Offline) and Bar chart (Alerts by Severity). |
| `/computers` | **Computers** | Auto-refreshes fleet grid upon `computer_status`, `computer_registered`, or `computer_deleted`. Filter by All, Online, Offline, or search hostname/IP. |
| `/computers/:id` | **Computer Details** | Telemetry metrics (System ID, IP, Last Seen, Registered), specific events and alerts, and safe Decommission modal. |
| `/events` | **Security Events** | Real-time event feed on `new_event`. Server-side filtering by event type and computer, with JSON metadata inspector modal. |
| `/alerts` | **Security Alerts** | Instant alert ingestion on `new_alert`, live status transition on `alert_acknowledged`. One-click acknowledgement with instant feedback. |
| `/settings` | **Settings** | Real-time WebSocket connection state diagnostic, REST API health check tester, and polling interval preference configuration. |

---

## Key Hooks & API Architecture

### Consuming Real-Time Data in Any Component

```javascript
import useRealtimeData from '../hooks/useRealtimeData';
import { fetchComputers } from '../api/computers';

export default function MyComponent() {
  const { data, loading, error, refetch, connected } = useRealtimeData(
    fetchComputers,
    [], // Inline handlers (optional)
    {
      refetchEvents: ['computer_status', 'computer_registered', 'computer_deleted']
    }
  );

  if (loading && !data) return <div>Loading...</div>;

  return (
    <div>
      <p>Connection: {connected ? 'Real-Time' : 'Polling'}</p>
      <ul>
        {data.map(c => <li key={c.id}>{c.hostname}</li>)}
      </ul>
    </div>
  );
}
```

---

## UI & Styling System

- **SOC Dark Aesthetic**: Designed specifically for high-contrast, low-eyestrain Security Operations Center consoles (`#0b0f19` canvas, `#111827` panels, subtle slate borders).
- **Tailwind CSS v4**: Ultra-fast CSS compilation using the native `@tailwindcss/vite` engine.
- **Lenis Smooth Scrolling**: Smooth, momentum-based scrolling across all dashboard views.
- **Micro-Interactions**: Live pulsing pings on active alerts, interactive canvas particle grid (`Squares.jsx`), and smooth transition badges.

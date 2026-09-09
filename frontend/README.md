# LabGuard Frontend — Admin Dashboard

React-based security monitoring dashboard for LabGuard.

## Quick Start

### Prerequisites
- Node.js 18+
- LabGuard backend running (Python Flask)

### Installation
```bash
npm install
```

### Environment Variables
Create `.env` in the frontend directory:
```
VITE_API_URL=http://127.0.0.1:5000/api
VITE_POLLING_INTERVAL=12000
```

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm run preview
```

## Pages
| Route | Page | Description |
|---|---|---|
| `/` | Dashboard | Summary cards, charts, recent events |
| `/computers` | Computers | Grid of registered lab computers |
| `/computers/:id` | Computer Details | Single computer info, events, alerts |
| `/events` | Security Events | Filterable events table |
| `/alerts` | Alerts | Alert management with acknowledge |
| `/settings` | Settings | API config, polling interval |

## API Endpoints Consumed
- `GET /api/dashboard/summary`
- `GET /api/computers`
- `GET /api/computers/:id`
- `GET /api/events`
- `GET /api/events/:id`
- `GET /api/alerts`
- `GET /api/alerts/:id`
- `PATCH /api/alerts/:id/acknowledge`

## Tech Stack
React 19, Vite 8, Tailwind CSS v4, React Router, Recharts, Lucide Icons

## Architecture
The frontend is fully decoupled from the backend. All data flows through a centralized API service layer in `src/api/`. No mock data is used. The UI follows a strict dark SOC (Security Operations Center) monitoring aesthetic. Data is kept up-to-date via automated polling using custom React hooks.

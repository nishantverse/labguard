import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import WebSocketProvider from './context/WebSocketProvider';
import { useWebSocket } from './hooks/useWebSocket';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import Dashboard from './pages/Dashboard';
import Computers from './pages/Computers';
import ComputerDetails from './pages/ComputerDetails';
import Events from './pages/Events';
import Alerts from './pages/Alerts';
import Settings from './pages/Settings';

function AlertToastListener() {
  const { subscribe } = useWebSocket();

  useEffect(() => {
    return subscribe('new_alert', (alert) => {
      if (!alert) return;

      const severity = String(alert.severity || 'INFO').toUpperCase();
      const severityColors = {
        CRITICAL: { accent: '#ef4444', label: 'Critical alert' },
        HIGH: { accent: '#f97316', label: 'High-severity alert' },
        MEDIUM: { accent: '#eab308', label: 'Medium-severity alert' },
        LOW: { accent: '#3b82f6', label: 'Low-severity alert' },
        INFO: { accent: '#06b6d4', label: 'New security alert' },
      };
      const { accent, label } = severityColors[severity] || severityColors.INFO;

      toast.custom((toastItem) => (
        <div
          className={`pointer-events-auto w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-gray-700/80 bg-gray-900 shadow-2xl transition-all duration-300 ${
            toastItem.visible ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'
          }`}
          style={{ borderLeft: `4px solid ${accent}` }}
        >
          <div className="flex items-start gap-3 p-4">
            <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-300">{label}</p>
              <p className="mt-1 text-sm font-medium leading-snug text-gray-100">{alert.message || 'A new alert was received.'}</p>
              {alert.hostname && <p className="mt-1 text-[11px] font-mono text-gray-500">{alert.hostname}</p>}
            </div>
            <button
              type="button"
              onClick={() => toast.dismiss(toastItem.id)}
              className="shrink-0 text-gray-500 transition-colors hover:text-gray-200"
              aria-label="Dismiss alert notification"
            >
              <span aria-hidden="true">x</span>
            </button>
          </div>
        </div>
      ), { duration: 7000, position: 'top-right' });
    });
  }, [subscribe]);

  return null;
}

export default function App() {
  return (
    <ErrorBoundary>
      <WebSocketProvider>
        <AlertToastListener />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#111827',
              color: '#e5e7eb',
              border: '1px solid rgba(75, 85, 99, 0.4)',
              borderRadius: '0.75rem',
              fontSize: '0.875rem',
              fontFamily: 'Inter, sans-serif',
            },
            success: { 
              iconTheme: { primary: '#10b981', secondary: '#111827' },
              style: { borderLeft: '4px solid #10b981' }
            },
            error: { 
              iconTheme: { primary: '#ef4444', secondary: '#111827' },
              style: { borderLeft: '4px solid #ef4444' }
            },
          }}
        />
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/computers" element={<Computers />} />
            <Route path="/computers/:id" element={<ComputerDetails />} />
            <Route path="/events" element={<Events />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Layout>
      </WebSocketProvider>
    </ErrorBoundary>
  );
}

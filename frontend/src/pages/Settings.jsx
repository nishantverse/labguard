import React, { useState, useEffect } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { useWebSocket } from '../hooks/useWebSocket';
import { CheckCircle, XCircle, RefreshCw, Server, Sliders, Shield, Wifi } from 'lucide-react';

export default function Settings() {
  const [pollingInterval, setPollingInterval] = useLocalStorage('labguard_polling_interval', 12000);
  const [apiStatus, setApiStatus] = useState('checking');
  const [isTesting, setIsTesting] = useState(false);
  const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000/api';
  const { connected } = useWebSocket();
  const wsUrl = import.meta.env.VITE_WS_URL || 'http://127.0.0.1:5000';

  const testConnection = async () => {
    setIsTesting(true);
    setApiStatus('checking');
    try {
      const baseUrl = apiUrl.replace(/\/api\/?$/, '');
      const res = await fetch(baseUrl || '/', { method: 'GET' });
      setApiStatus(res.ok ? 'connected' : 'disconnected');
    } catch {
      setApiStatus('disconnected');
    } finally {
      setIsTesting(false);
    }
  };

  useEffect(() => {
    testConnection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiUrl]);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Console Settings</h1>
          <p className="text-xs text-gray-500 font-mono mt-0.5">LabGuard Security Monitoring • Administrator Configuration</p>
        </div>
      </div>

      {/* API Configuration Card */}
      <div className="bg-gray-900/80 rounded-xl border border-gray-800 p-6 flex flex-col gap-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
            <Server size={16} className="text-blue-400" />
            Backend REST API Configuration
          </h3>
          <button
            onClick={testConnection}
            disabled={isTesting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium transition-all disabled:opacity-50"
          >
            <RefreshCw size={13} className={isTesting ? 'animate-spin text-blue-400' : ''} />
            Test Connection
          </button>
        </div>
        
        <div>
          <label className="block text-xs font-mono uppercase text-gray-400 mb-2">Configured REST Base URL</label>
          <input 
            type="text" 
            readOnly 
            value={apiUrl}
            className="w-full bg-gray-800/80 border border-gray-700/60 rounded-lg px-4 py-2.5 text-xs font-mono text-gray-200 focus:outline-none cursor-default"
          />
          <p className="text-[11px] text-gray-500 mt-1.5 font-mono">
            Configured in <code className="text-gray-400 font-semibold">.env</code> as <code className="text-blue-400">VITE_API_URL</code>.
          </p>
        </div>
        
        <div className="flex items-center justify-between pt-2 border-t border-gray-800/60 text-xs">
          <span className="text-gray-400 font-mono">Connection Status:</span>
          {apiStatus === 'checking' ? (
            <span className="text-gray-400 font-mono flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
              Checking...
            </span>
          ) : apiStatus === 'connected' ? (
            <span className="flex items-center gap-1.5 text-emerald-400 font-mono font-medium">
              <CheckCircle size={14} /> Connected & Operational
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-red-400 font-mono font-medium">
              <XCircle size={14} /> Disconnected (Check Flask Server)
            </span>
          )}
        </div>
      </div>

      {/* WebSocket Configuration Card */}
      <div className="bg-gray-900/80 rounded-xl border border-gray-800 p-6 flex flex-col gap-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
            <Wifi size={16} className="text-emerald-400" />
            WebSocket (Real-time) Configuration
          </h3>
        </div>
        
        <div>
          <label className="block text-xs font-mono uppercase text-gray-400 mb-2">WebSocket Server URL</label>
          <input 
            type="text" 
            readOnly 
            value={wsUrl}
            className="w-full bg-gray-800/80 border border-gray-700/60 rounded-lg px-4 py-2.5 text-xs font-mono text-gray-200 focus:outline-none cursor-default"
          />
          <p className="text-[11px] text-gray-500 mt-1.5 font-mono">
            Configured in <code className="text-gray-400 font-semibold">.env</code> as <code className="text-blue-400">VITE_WS_URL</code>. Uses Socket.IO protocol.
          </p>
        </div>
        
        <div className="flex items-center justify-between pt-2 border-t border-gray-800/60 text-xs">
          <span className="text-gray-400 font-mono">WebSocket Status:</span>
          {connected ? (
            <span className="flex items-center gap-1.5 text-emerald-400 font-mono font-medium">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
              Connected (Real-time active)
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-amber-400 font-mono font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              Disconnected (Fallback: HTTP Polling)
            </span>
          )}
        </div>
      </div>

      {/* Dashboard Preferences Card */}
      <div className="bg-gray-900/80 rounded-xl border border-gray-800 p-6 flex flex-col gap-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-200 border-b border-gray-800 pb-3 flex items-center gap-2">
          <Sliders size={16} className="text-blue-400" />
          Dashboard & Polling Preferences
        </h3>
        
        <div>
          <label className="block text-xs font-mono uppercase text-gray-400 mb-2">Telemetry Polling Interval</label>
          <select 
            value={pollingInterval}
            onChange={(e) => setPollingInterval(Number(e.target.value))}
            className="w-full bg-gray-800 border border-gray-700/60 rounded-lg px-4 py-2.5 text-xs font-mono text-gray-200 focus:outline-none focus:border-blue-500/50"
          >
            <option value={5000}>5 Seconds (Fast Telemetry)</option>
            <option value={10000}>10 Seconds (Recommended)</option>
            <option value={12000}>12 Seconds (Default)</option>
            <option value={15000}>15 Seconds</option>
            <option value={30000}>30 Seconds (Low Network Usage)</option>
            <option value={60000}>60 Seconds</option>
          </select>
          <p className="text-[11px] text-gray-500 mt-2 font-mono">
            Stored locally in browser storage. Determines how frequently the dashboard queries system summaries, events, and alerts.
          </p>
        </div>
      </div>

      {/* Architecture & About */}
      <div className="bg-gray-900/80 rounded-xl border border-gray-800 p-6 flex flex-col gap-3 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-200 border-b border-gray-800 pb-3 flex items-center gap-2">
          <Shield size={16} className="text-emerald-400" />
          About LabGuard
        </h3>
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Application Version:</span>
            <span className="font-mono text-gray-200 font-semibold">1.1.0</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Architecture:</span>
            <span className="font-mono text-gray-200">Decoupled Frontend (Vite + React + Socket.IO)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Data Transport:</span>
            <span className="font-mono text-gray-200">WebSocket (Socket.IO) + HTTP REST fallback</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Backend Engine:</span>
            <span className="font-mono text-gray-200">Python 3 • Flask • SQLite</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Monitoring Scope:</span>
            <span className="font-mono text-gray-200">USB devices, file events, heartbeat availability</span>
          </div>
        </div>
      </div>
    </div>
  );
}

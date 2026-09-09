import React, { useState, useEffect } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { Settings as SettingsIcon, CheckCircle, XCircle } from 'lucide-react';

export default function Settings() {
  const [pollingInterval, setPollingInterval] = useLocalStorage('labguard_polling_interval', 12000);
  const [apiStatus, setApiStatus] = useState('checking');
  const apiUrl = 'http://127.0.0.1:5000';

  useEffect(() => {
    let mounted = true;
    fetch(apiUrl)
      .then(res => {
        if (mounted) setApiStatus(res.ok ? 'connected' : 'disconnected');
      })
      .catch(() => {
        if (mounted) setApiStatus('disconnected');
      });
    return () => { mounted = false; };
  }, [apiUrl]);

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-100">Settings</h1>
      </div>

      <div className="bg-gray-900/80 rounded-xl border border-gray-700/50 p-6 flex flex-col gap-4">
        <h3 className="text-lg font-semibold text-gray-200 border-b border-gray-700/50 pb-3">API Configuration</h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">API URL</label>
          <input 
            type="text" 
            readOnly 
            value={apiUrl}
            className="w-full bg-gray-800 border border-gray-700/50 rounded-lg px-4 py-2.5 text-gray-200 focus:outline-none opacity-80 cursor-not-allowed"
          />
        </div>
        
        <div className="flex items-center gap-2 mt-2 text-sm">
          <span className="text-gray-400">Connection Status:</span>
          {apiStatus === 'checking' ? (
            <span className="text-gray-500">Checking...</span>
          ) : apiStatus === 'connected' ? (
            <span className="flex items-center gap-1 text-emerald-500"><CheckCircle size={14} /> Connected</span>
          ) : (
            <span className="flex items-center gap-1 text-red-500"><XCircle size={14} /> Disconnected</span>
          )}
        </div>
      </div>

      <div className="bg-gray-900/80 rounded-xl border border-gray-700/50 p-6 flex flex-col gap-4">
        <h3 className="text-lg font-semibold text-gray-200 border-b border-gray-700/50 pb-3">Dashboard Preferences</h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Polling Interval</label>
          <select 
            value={pollingInterval}
            onChange={(e) => setPollingInterval(Number(e.target.value))}
            className="w-full bg-gray-800 border border-gray-700/50 rounded-lg px-4 py-2.5 text-gray-200 focus:outline-none focus:border-blue-500/50"
          >
            <option value={5000}>5 Seconds</option>
            <option value={10000}>10 Seconds</option>
            <option value={12000}>12 Seconds</option>
            <option value={15000}>15 Seconds</option>
            <option value={30000}>30 Seconds</option>
            <option value={60000}>60 Seconds</option>
          </select>
          <p className="text-xs text-amber-500/80 mt-2">Note: Changes take effect on next page load.</p>
        </div>
      </div>

      <div className="bg-gray-900/80 rounded-xl border border-gray-700/50 p-6 flex flex-col gap-4">
        <h3 className="text-lg font-semibold text-gray-200 border-b border-gray-700/50 pb-3">About</h3>
        <div className="space-y-1">
          <p className="text-gray-200 font-medium">LabGuard v1.0.0</p>
          <p className="text-sm text-gray-400">Smart Security Monitoring System</p>
          <p className="text-sm text-gray-500 mt-2">Laboratory security monitoring for authorized college computers.</p>
        </div>
      </div>
    </div>
  );
}

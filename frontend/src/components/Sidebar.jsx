import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Shield, LayoutDashboard, Monitor, Activity, Bell, Settings } from 'lucide-react';

export default function Sidebar({ isOpen, onClose }) {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const baseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/api$/, '');
        const res = await fetch(baseUrl || '/');
        setIsConnected(res.ok);
      } catch (err) {
        setIsConnected(false);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        ></div>
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-col border-r border-gray-700/50 bg-gray-900 transition-transform lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-4 border-b border-gray-700/50 p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
              <Shield size={24} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-100">LabGuard</h1>
              <p className="text-xs text-gray-500">Security Monitor</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-4">
          <div className="mb-2 mt-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-600">
            Monitoring
          </div>
          <div className="space-y-1">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                  isActive
                    ? 'bg-blue-500/10 font-medium text-blue-400'
                    : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
                }`
              }
            >
              <LayoutDashboard size={20} />
              Dashboard
            </NavLink>
            <NavLink
              to="/computers"
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                  isActive
                    ? 'bg-blue-500/10 font-medium text-blue-400'
                    : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
                }`
              }
            >
              <Monitor size={20} />
              Computers
            </NavLink>
          </div>

          <div className="mb-2 mt-6 px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-600">
            Security
          </div>
          <div className="space-y-1">
            <NavLink
              to="/events"
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                  isActive
                    ? 'bg-blue-500/10 font-medium text-blue-400'
                    : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
                }`
              }
            >
              <Activity size={20} />
              Security Events
            </NavLink>
            <NavLink
              to="/alerts"
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                  isActive
                    ? 'bg-blue-500/10 font-medium text-blue-400'
                    : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
                }`
              }
            >
              <Bell size={20} />
              Alerts
            </NavLink>
          </div>

          <div className="mb-2 mt-6 px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-600">
            System
          </div>
          <div className="space-y-1">
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                  isActive
                    ? 'bg-blue-500/10 font-medium text-blue-400'
                    : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
                }`
              }
            >
              <Settings size={20} />
              Settings
            </NavLink>
          </div>
        </nav>

        <div className="border-t border-gray-700/50 p-4">
          <div className="flex items-center gap-2 px-3 text-xs text-gray-500">
            <span
              className={`h-2 w-2 rounded-full ${
                isConnected ? 'bg-emerald-500' : 'bg-red-500'
              }`}
            ></span>
            {isConnected ? 'API Connected' : 'API Disconnected'}
          </div>
        </div>
      </div>
    </>
  );
}

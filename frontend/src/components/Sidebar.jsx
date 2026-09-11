import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Shield, LayoutDashboard, Monitor, Activity, Bell, Settings, X } from 'lucide-react';

export default function Sidebar({ isOpen, onClose }) {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const baseUrl = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000/api').replace(/\/api\/?$/, '');
        const res = await fetch(baseUrl || '/');
        setIsConnected(res.ok);
      } catch {
        setIsConnected(false);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleNavClick = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onClose}
        ></div>
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-col border-r border-gray-800 bg-gray-900 transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="mb-2 flex items-center justify-between border-b border-gray-800 p-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Shield size={22} />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-100 tracking-tight">LabGuard</h1>
              <p className="text-[11px] font-mono text-gray-500">Security Console</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-800 hover:text-gray-200 lg:hidden"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-5">
          <div>
            <div className="mb-2 px-3 text-[10px] font-mono font-semibold uppercase tracking-widest text-gray-500">
              Monitoring
            </div>
            <div className="space-y-1">
              <NavLink
                to="/"
                end
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-500/15 font-semibold text-blue-400 border border-blue-500/20'
                      : 'text-gray-400 hover:bg-gray-800/60 hover:text-gray-200'
                  }`
                }
              >
                <LayoutDashboard size={18} />
                <span>Dashboard</span>
              </NavLink>
              <NavLink
                to="/computers"
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-500/15 font-semibold text-blue-400 border border-blue-500/20'
                      : 'text-gray-400 hover:bg-gray-800/60 hover:text-gray-200'
                  }`
                }
              >
                <Monitor size={18} />
                <span>Computers</span>
              </NavLink>
            </div>
          </div>

          <div>
            <div className="mb-2 px-3 text-[10px] font-mono font-semibold uppercase tracking-widest text-gray-500">
              Security
            </div>
            <div className="space-y-1">
              <NavLink
                to="/events"
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-500/15 font-semibold text-blue-400 border border-blue-500/20'
                      : 'text-gray-400 hover:bg-gray-800/60 hover:text-gray-200'
                  }`
                }
              >
                <Activity size={18} />
                <span>Security Events</span>
              </NavLink>
              <NavLink
                to="/alerts"
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-500/15 font-semibold text-blue-400 border border-blue-500/20'
                      : 'text-gray-400 hover:bg-gray-800/60 hover:text-gray-200'
                  }`
                }
              >
                <Bell size={18} />
                <span>Alerts</span>
              </NavLink>
            </div>
          </div>

          <div>
            <div className="mb-2 px-3 text-[10px] font-mono font-semibold uppercase tracking-widest text-gray-500">
              System
            </div>
            <div className="space-y-1">
              <NavLink
                to="/settings"
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-500/15 font-semibold text-blue-400 border border-blue-500/20'
                      : 'text-gray-400 hover:bg-gray-800/60 hover:text-gray-200'
                  }`
                }
              >
                <Settings size={18} />
                <span>Settings</span>
              </NavLink>
            </div>
          </div>
        </nav>

        {/* Footer with connection status */}
        <div className="border-t border-gray-800 p-4">
          <div className="flex items-center justify-between rounded-lg bg-gray-800/40 p-2.5 border border-gray-800 text-xs">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                {isConnected && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                )}
                <span
                  className={`relative inline-flex h-2 w-2 rounded-full ${
                    isConnected ? 'bg-emerald-500' : 'bg-red-500'
                  }`}
                ></span>
              </span>
              <span className="font-mono text-[11px] text-gray-300">
                {isConnected ? 'API Online' : 'API Offline'}
              </span>
            </div>
            <span className="text-[10px] font-mono text-gray-500">v1.0</span>
          </div>
        </div>
      </aside>
    </>
  );
}

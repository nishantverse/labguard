import React, { useMemo, useCallback } from 'react';
import { fetchDashboardSummary } from '../api/dashboard';
import { fetchAlerts } from '../api/alerts';
import usePolling from '../hooks/usePolling';
import StatCard from '../components/StatCard';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import LoadingState from '../components/LoadingState';
import RelativeTime from '../components/RelativeTime';
import Squares from '../components/Squares';
import { formatExactTime } from '../utils/date';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid 
} from 'recharts';
import { 
  Monitor, 
  Wifi, 
  WifiOff, 
  AlertTriangle, 
  RefreshCw, 
  Usb, 
  FileWarning, 
  MonitorOff, 
  FolderOpen, 
  HardDrive, 
  ShieldAlert, 
  Play, 
  Square, 
  Activity,
  ShieldCheck,
  Radio
} from 'lucide-react';

const getEventIcon = (type) => {
  switch (type) {
    case 'usb_connected': return Usb;
    case 'usb_disconnected': return Usb;
    case 'suspicious_file': return FileWarning;
    case 'computer_offline': return MonitorOff;
    case 'folder_change': return FolderOpen;
    case 'large_file_detected': return HardDrive;
    case 'unauthorized_access': return ShieldAlert;
    case 'agent_started': return Play;
    case 'agent_stopped': return Square;
    default: return Activity;
  }
};

const getEventColor = (type) => {
  if (['suspicious_file', 'unauthorized_access'].includes(type)) return 'text-red-400 bg-red-500/10 border border-red-500/20';
  if (['usb_connected'].includes(type)) return 'text-amber-400 bg-amber-500/10 border border-amber-500/20';
  if (['computer_offline'].includes(type)) return 'text-gray-400 bg-gray-500/10 border border-gray-500/20';
  return 'text-blue-400 bg-blue-500/10 border border-blue-500/20';
};

const formatEventType = (type) => {
  if (!type) return 'Unknown';
  return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const item = payload[0];
    return (
      <div className="bg-gray-900 text-gray-200 border border-gray-700/80 px-3 py-2 rounded-lg shadow-xl text-xs">
        <p className="font-semibold mb-1 text-gray-300">{label || item.name || item.payload?.name}</p>
        <div className="flex items-center gap-2">
          <div 
            className="w-2 h-2 rounded-full" 
            style={{ backgroundColor: item.color || item.payload?.fill }} 
          />
          <span className="text-gray-400 capitalize">{item.name || 'Count'}:</span>
          <span className="font-mono font-bold text-gray-100">{item.value}</span>
        </div>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const { data, loading, error, refetch, lastUpdated } = usePolling(fetchDashboardSummary);
  
  const alertsFetchFn = useCallback(() => fetchAlerts({ limit: 500 }), []);
  const { data: alerts, refetch: refetchAlerts } = usePolling(alertsFetchFn);

  const handleRefreshAll = () => {
    refetch();
    refetchAlerts();
  };

  // Pie chart calculation (Safely handles null/undefined data)
  const pieData = useMemo(() => {
    if (!data) return [];
    const online = Number(data.online_computers) || 0;
    const offline = Number(data.offline_computers) || 0;
    if (online === 0 && offline === 0) return [];
    return [
      { name: 'Online', value: online, color: '#10b981' },
      { name: 'Offline', value: offline, color: '#4b5563' }
    ];
  }, [data]);

  // Bar chart calculation (Safely handles null alerts without throwing)
  const barData = useMemo(() => {
    const counts = { INFO: 0, LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
    if (Array.isArray(alerts)) {
      alerts.forEach(a => { 
        if (a && a.severity && counts[a.severity] !== undefined) {
          counts[a.severity]++; 
        }
      });
    }
    return [
      { name: 'INFO', value: counts.INFO, fill: '#64748b' },
      { name: 'LOW', value: counts.LOW, fill: '#3b82f6' },
      { name: 'MEDIUM', value: counts.MEDIUM, fill: '#f59e0b' },
      { name: 'HIGH', value: counts.HIGH, fill: '#f97316' },
      { name: 'CRITICAL', value: counts.CRITICAL, fill: '#ef4444' }
    ].filter(item => item.value > 0);
  }, [alerts]);

  // Render loading state on initial load when no data exists
  if (loading && !data && !error) {
    return <LoadingState message="Connecting to LabGuard security monitoring..." />;
  }

  // Render error state if initial request failed completely
  if (error && !data) {
    return (
      <ErrorState 
        message={error.message || "Unable to connect to LabGuard server."} 
        onRetry={handleRefreshAll} 
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* React Bits Hero Section with interactive Squares background */}
      <div className="relative overflow-hidden rounded-2xl border border-gray-800 bg-linear-to-br from-gray-900/90 via-gray-950 to-panel p-6 shadow-2xl">
        {/* Background animation */}
        <div className="absolute inset-0 opacity-40 pointer-events-none">
          <Squares 
            direction="diagonal"
            speed={0.3}
            squareSize={48}
            borderColor="rgba(51, 65, 85, 0.4)"
            hoverFillColor="rgba(59, 130, 246, 0.15)"
          />
        </div>

        {/* Hero content overlay */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-mono tracking-widest text-emerald-400 uppercase font-semibold">
                Telemetry Active • SOC Console
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              LabGuard
              <span className="text-xs font-mono font-normal bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded">
                v1.0
              </span>
            </h1>
            <p className="text-sm text-gray-400">
              Laboratory Security Monitoring • Authorized Institutional Systems
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            {lastUpdated && (
              <div className="text-right hidden sm:block">
                <div className="text-[10px] uppercase font-mono tracking-wider text-gray-500">Last Synced</div>
                <div className="text-xs font-mono text-gray-300">
                  {lastUpdated.toLocaleTimeString()}
                </div>
              </div>
            )}
            <button
              onClick={handleRefreshAll}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-gray-800/80 hover:bg-gray-700/80 text-gray-200 border border-gray-700/60 text-xs font-medium transition-all shadow-sm hover:shadow active:scale-95"
              title="Refresh telemetry"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-blue-400' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Systems" 
          value={data?.total_computers ?? 0} 
          icon={Monitor} 
          color="blue" 
          loading={loading && !data} 
        />
        <StatCard 
          title="Online" 
          value={data?.online_computers ?? 0} 
          icon={Wifi} 
          color="green" 
          loading={loading && !data} 
        />
        <StatCard 
          title="Offline" 
          value={data?.offline_computers ?? 0} 
          icon={WifiOff} 
          color="red" 
          loading={loading && !data} 
        />
        <StatCard 
          title="Active Alerts" 
          value={data?.active_alerts ?? 0} 
          icon={AlertTriangle} 
          color="amber" 
          loading={loading && !data} 
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Status Donut Chart */}
        <div className="bg-gray-900/80 rounded-xl border border-gray-800 p-5 backdrop-blur shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-200 flex items-center gap-2">
              <Radio size={16} className="text-blue-400" />
              System Status
            </h3>
            <span className="text-xs text-gray-500 font-mono">Live Ratio</span>
          </div>
          <div className="h-64 flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={pieData} 
                    cx="50%" 
                    cy="50%" 
                    innerRadius={55} 
                    outerRadius={80} 
                    paddingAngle={6} 
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#111827" strokeWidth={2} />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState 
                icon={Monitor} 
                title="No Systems Registered" 
                message="Registered lab computers will appear here once agents begin reporting." 
              />
            )}
          </div>
          {pieData.length > 0 && (
            <div className="flex justify-center gap-6 mt-2 pt-3 border-t border-gray-800/60 text-xs font-medium">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span className="text-gray-400">Online:</span>
                <span className="font-mono text-gray-200">{data?.online_computers || 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-gray-500"></span>
                <span className="text-gray-400">Offline:</span>
                <span className="font-mono text-gray-200">{data?.offline_computers || 0}</span>
              </div>
            </div>
          )}
        </div>

        {/* Alerts by Severity Bar Chart */}
        <div className="bg-gray-900/80 rounded-xl border border-gray-800 p-5 backdrop-blur shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-200 flex items-center gap-2">
              <ShieldAlert size={16} className="text-amber-400" />
              Alerts by Severity
            </h3>
            <span className="text-xs text-gray-500 font-mono">Distribution</span>
          </div>
          <div className="h-64 flex items-center justify-center">
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                  <XAxis type="number" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" stroke="#64748b" width={70} tick={{ fontSize: 11 }} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {barData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState 
                icon={ShieldCheck} 
                title="No Active Threats" 
                message="No alerts have been triggered by security events." 
              />
            )}
          </div>
          {barData.length > 0 && (
            <div className="flex flex-wrap justify-center gap-4 mt-2 pt-3 border-t border-gray-800/60 text-xs">
              {barData.map(item => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.fill }}></span>
                  <span className="text-gray-400 font-mono text-[11px]">{item.name}:</span>
                  <span className="font-mono text-gray-200 font-semibold">{item.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Security Events Feed */}
      <div className="bg-gray-900/80 rounded-xl border border-gray-800 p-5 backdrop-blur shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-200 flex items-center gap-2">
            <Activity size={16} className="text-blue-400" />
            Recent Security Events
          </h3>
          <span className="text-xs text-gray-500 font-mono">Real-time Stream</span>
        </div>

        {Array.isArray(data?.recent_events) && data.recent_events.length > 0 ? (
          <div className="space-y-2.5">
            {data.recent_events.map(event => {
              const Icon = getEventIcon(event.event_type);
              return (
                <div 
                  key={event.id} 
                  className="flex items-start sm:items-center justify-between p-3 rounded-lg bg-gray-800/40 border border-gray-800 hover:border-gray-700/60 hover:bg-gray-800/70 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${getEventColor(event.event_type)}`}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-200">
                        {event.description || formatEventType(event.event_type)}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-mono text-blue-400/90 bg-blue-500/10 px-1.5 py-0.2 rounded">
                          {event.hostname}
                        </span>
                        {event.metadata && Object.keys(event.metadata).length > 0 && (
                          <span className="text-[11px] font-mono text-gray-500 hidden md:inline">
                            {Object.entries(event.metadata).map(([k, v]) => `${k}: ${v}`).join(' | ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right whitespace-nowrap ml-4 shrink-0 font-mono">
                    <div className="text-xs text-gray-300 font-medium">
                      <RelativeTime timestamp={event.timestamp} />
                    </div>
                    {event.timestamp && (
                      <div className="text-[10px] text-gray-500">
                        {formatExactTime(event.timestamp)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center">
            <EmptyState
              icon={Activity}
              title="No Security Events Recorded"
              message="Security events will be logged here as laboratory computers detect USB activity, file alerts, or connectivity changes."
            />
          </div>
        )}
      </div>
    </div>
  );
}

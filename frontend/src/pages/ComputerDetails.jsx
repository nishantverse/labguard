import React, { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { fetchComputer, deleteComputer } from '../api/computers';
import { fetchEvents } from '../api/events';
import { fetchAlerts, acknowledgeAlert } from '../api/alerts';
import useRealtimeData from '../hooks/useRealtimeData';
import StatusBadge from '../components/StatusBadge';
import SeverityBadge from '../components/SeverityBadge';
import ErrorState from '../components/ErrorState';
import LoadingState from '../components/LoadingState';
import DataTable from '../components/DataTable';
import RelativeTime from '../components/RelativeTime';
import { formatExactTime, formatDateTime } from '../utils/date';
import { 
  ArrowLeft, 
  Activity, 
  AlertTriangle, 
  Calendar, 
  Clock, 
  Globe, 
  Server,
  Trash2
} from 'lucide-react';

export default function ComputerDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchCompFn = useCallback(() => fetchComputer(id), [id]);
  const fetchEventsFn = useCallback(() => fetchEvents({ computer_id: id, limit: 50 }), [id]);
  const fetchAlertsFn = useCallback(() => fetchAlerts({ computer_id: id, limit: 200 }), [id]);

  const { data: computer, loading: compLoading, error: compError, refetch: refetchComp } = useRealtimeData(
    fetchCompFn,
    [],
    { interval: 10000, deps: [id], refetchEvents: ['computer_status'] }
  );

  const { data: events, loading: eventsLoading } = useRealtimeData(
    fetchEventsFn,
    [],
    { interval: 10000, deps: [id], refetchEvents: ['new_event'] }
  );

  const { data: allAlerts, loading: alertsLoading, refetch: refetchAlerts } = useRealtimeData(
    fetchAlertsFn,
    [],
    { interval: 10000, refetchEvents: ['new_alert', 'alert_acknowledged'] }
  );

  // Filter alerts for this computer
  const systemAlerts = useMemo(() => {
    if (!Array.isArray(allAlerts)) return [];
    return allAlerts.filter(a => String(a.computer_id) === String(id));
  }, [allAlerts, id]);

  const handleAcknowledge = async (alertId) => {
    try {
      await acknowledgeAlert(alertId);
      toast.success(`Alert #${alertId} acknowledged`);
      refetchAlerts();
    } catch (err) {
      toast.error(err.message || 'Failed to acknowledge alert');
    }
  };

  const handleDeleteComputer = async () => {
    setIsDeleting(true);
    try {
      await deleteComputer(id);
      toast.success(`Computer #${id} decommissioned successfully`);
      navigate('/computers');
    } catch (err) {
      toast.error(err.message || 'Failed to decommission computer');
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const formatEventType = (type) => {
    if (!type) return 'Unknown';
    return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const eventColumns = [
    { 
      header: 'Time', 
      accessor: (row) => (
        <div className="font-mono">
          <div className="text-xs text-gray-200 font-medium">
            <RelativeTime timestamp={row.timestamp} />
          </div>
          <div className="text-[10px] text-gray-500">
            {formatExactTime(row.timestamp)}
          </div>
        </div>
      ) 
    },
    { 
      header: 'Event Type', 
      accessor: (row) => (
        <span className="text-xs font-medium text-gray-200">
          {formatEventType(row.event_type)}
        </span>
      ) 
    },
    { 
      header: 'Description', 
      accessor: (row) => (
        <span className="text-xs text-gray-300">
          {row.description || '—'}
        </span>
      ) 
    }
  ];

  const alertColumns = [
    { 
      header: 'Severity', 
      accessor: (row) => <SeverityBadge severity={row.severity} /> 
    },
    { 
      header: 'Message', 
      accessor: (row) => (
        <span className={`text-xs ${!row.acknowledged ? 'font-semibold text-gray-100' : 'text-gray-400'}`}>
          {row.message}
        </span>
      ) 
    },
    { 
      header: 'Time', 
      accessor: (row) => (
        <div className="font-mono">
          <div className="text-xs text-gray-200 font-medium">
            <RelativeTime timestamp={row.created_at} />
          </div>
          <div className="text-[10px] text-gray-500">
            {formatExactTime(row.created_at)}
          </div>
        </div>
      ) 
    },
    {
      header: 'Action',
      accessor: (row) => !row.acknowledged ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleAcknowledge(row.id);
          }}
          className="bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-medium px-2.5 py-1 rounded transition-colors"
        >
          Acknowledge
        </button>
      ) : (
        <span className="text-xs text-gray-500 italic">Resolved</span>
      )
    }
  ];

  if (compLoading && !computer) return <LoadingState message="Loading laboratory system telemetry..." />;
  if (compError && !computer) return <ErrorState message={compError.message} onRetry={refetchComp} />;
  if (!computer) return <ErrorState message="Computer not found" onRetry={() => navigate('/computers')} />;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button 
        onClick={() => navigate('/computers')} 
        className="flex items-center gap-2 text-xs font-medium text-gray-400 hover:text-gray-200 transition-colors bg-gray-800/60 px-3 py-1.5 rounded-lg border border-gray-700/60 w-fit"
      >
        <ArrowLeft size={14} /> Back to Computers
      </button>

      {/* Main Computer Card */}
      <div className="bg-gray-900/80 rounded-2xl border border-gray-800 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-gray-800">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-gray-800/80 rounded-xl border border-gray-700/60 text-blue-400">
              <Server size={32} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-100">{computer.hostname}</h1>
              </div>
              <p className="text-xs font-mono text-gray-400 mt-1 flex items-center gap-2">
                <Globe size={12} className="text-gray-500" />
                IP: {computer.ip_address || 'Unassigned'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <StatusBadge online={computer.online} />
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-medium transition-colors"
              title="Decommission this computer"
            >
              <Trash2 size={13} />
              Decommission
            </button>
          </div>
        </div>

        {/* Telemetry Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-800/40 p-3.5 rounded-xl border border-gray-800">
            <span className="text-[10px] uppercase font-mono text-gray-500 block mb-1">System ID</span>
            <p className="font-mono text-sm font-semibold text-gray-200">#{computer.id}</p>
          </div>

          <div className="bg-gray-800/40 p-3.5 rounded-xl border border-gray-800">
            <span className="text-[10px] uppercase font-mono text-gray-500 block mb-1">Network IP</span>
            <p className="font-mono text-sm font-semibold text-gray-200">{computer.ip_address || '—'}</p>
          </div>

          <div className="bg-gray-800/40 p-3.5 rounded-xl border border-gray-800">
            <span className="text-[10px] uppercase font-mono text-gray-500 mb-1 flex items-center gap-1">
              <Clock size={11} /> Last Seen
            </span>
            <p className="font-mono text-sm font-semibold text-gray-200">
              <RelativeTime timestamp={computer.last_seen} />
            </p>
            <p className="text-[10px] text-gray-500 font-mono mt-0.5">{formatDateTime(computer.last_seen) || 'Never'}</p>
          </div>

          <div className="bg-gray-800/40 p-3.5 rounded-xl border border-gray-800">
            <span className="text-[10px] uppercase font-mono text-gray-500 mb-1 flex items-center gap-1">
              <Calendar size={11} /> Registered
            </span>
            <p className="font-mono text-sm font-semibold text-gray-200">
              <RelativeTime timestamp={computer.registered_at} />
            </p>
            <p className="text-[10px] text-gray-500 font-mono mt-0.5">{formatDateTime(computer.registered_at) || '—'}</p>
          </div>
        </div>
      </div>

      {/* Events & Alerts Two-column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Events */}
        <div className="bg-gray-900/80 rounded-xl border border-gray-800 overflow-hidden shadow-sm flex flex-col">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
              <Activity size={16} className="text-blue-400" />
              Recent Security Events
            </h3>
            <span className="text-xs text-gray-500 font-mono">
              {Array.isArray(events) ? `${events.length} events` : ''}
            </span>
          </div>
          <div className="flex-1">
            <DataTable 
              columns={eventColumns} 
              data={Array.isArray(events) ? events : []} 
              emptyMessage={eventsLoading && !events ? "Loading events..." : "No recent events recorded for this computer."} 
              emptyIcon={Activity} 
            />
          </div>
        </div>

        {/* Alerts for this computer */}
        <div className="bg-gray-900/80 rounded-xl border border-gray-800 overflow-hidden shadow-sm flex flex-col">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-400" />
              System Alerts
            </h3>
            <span className="text-xs text-gray-500 font-mono">
              {systemAlerts.length} {systemAlerts.length === 1 ? 'alert' : 'alerts'}
            </span>
          </div>
          <div className="flex-1">
            <DataTable 
              columns={alertColumns} 
              data={systemAlerts} 
              emptyMessage={alertsLoading && !allAlerts ? "Loading alerts..." : "No active or recorded alerts for this computer."} 
              emptyIcon={AlertTriangle} 
            />
          </div>
        </div>
      </div>

      {/* Decommission Confirmation Modal */}
      {showDeleteConfirm && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn"
          onClick={() => !isDeleting && setShowDeleteConfirm(false)}
        >
          <div 
            className="bg-gray-900 border border-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-100">Decommission Computer</h3>
                <p className="text-xs text-gray-500 font-mono">Irreversible Action</p>
              </div>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed bg-gray-800/40 p-3 rounded-lg border border-gray-800">
              Are you sure you want to remove <strong className="text-white font-mono">{computer.hostname}</strong> (ID #{computer.id})? All associated security events, alerts, and registration telemetry will be permanently deleted from the database.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-800">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteComputer}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-medium rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
              >
                <Trash2 size={13} />
                {isDeleting ? 'Decommissioning...' : 'Confirm Decommission'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

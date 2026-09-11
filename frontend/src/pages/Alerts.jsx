import React, { useState, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { fetchAlerts, acknowledgeAlert } from '../api/alerts';
import usePolling from '../hooks/usePolling';
import ErrorState from '../components/ErrorState';
import DataTable from '../components/DataTable';
import RelativeTime from '../components/RelativeTime';
import SeverityBadge from '../components/SeverityBadge';
import { formatExactTime, formatDateTime } from '../utils/date';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Search, 
  X, 
  ExternalLink, 
  Clock, 
  ShieldAlert, 
  Check 
} from 'lucide-react';

export default function Alerts() {
  const navigate = useNavigate();
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [acknowledgingId, setAcknowledgingId] = useState(null);

  const fetchFn = useCallback(() => fetchAlerts({ 
    severity: severityFilter || undefined, 
    acknowledged: statusFilter === 'all' ? undefined : statusFilter === 'acknowledged' ? 'true' : 'false', 
    limit: 200 
  }), [severityFilter, statusFilter]);

  const { data: alerts, loading, error, refetch } = usePolling(fetchFn, { deps: [severityFilter, statusFilter] });

  const handleAcknowledge = async (alertId) => {
    try {
      setAcknowledgingId(alertId);
      await acknowledgeAlert(alertId);
      toast.success(`Alert #${alertId} acknowledged`);
      refetch();
      if (selectedAlert && selectedAlert.id === alertId) {
        setSelectedAlert(prev => prev ? { ...prev, acknowledged: true } : null);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to acknowledge alert');
    } finally {
      setAcknowledgingId(null);
    }
  };

  const filteredAlerts = useMemo(() => {
    if (!Array.isArray(alerts)) return [];
    if (!searchQuery) return alerts;
    const q = searchQuery.toLowerCase();
    return alerts.filter(a => 
      (a.message && a.message.toLowerCase().includes(q)) ||
      (a.hostname && a.hostname.toLowerCase().includes(q)) ||
      (a.severity && a.severity.toLowerCase().includes(q))
    );
  }, [alerts, searchQuery]);

  const unacknowledgedCount = useMemo(() => {
    return Array.isArray(alerts) ? alerts.filter(a => !a.acknowledged).length : 0;
  }, [alerts]);

  const columns = [
    { 
      header: 'Severity', 
      accessor: (row) => <SeverityBadge severity={row.severity} /> 
    },
    { 
      header: 'Alert Message', 
      accessor: (row) => (
        <div className="flex items-center gap-2 max-w-lg">
          {!row.acknowledged && (
            <span className="relative flex h-2 w-2 shrink-0" title="Active unacknowledged alert">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
          )}
          <span className={`text-xs truncate ${!row.acknowledged ? 'font-semibold text-gray-100' : 'text-gray-400'}`}>
            {row.message}
          </span>
        </div>
      ) 
    },
    { 
      header: 'Computer', 
      accessor: (row) => (
        <span className="font-mono text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
          {row.hostname}
        </span>
      ) 
    },
    { 
      header: 'Created', 
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
      header: 'Status', 
      accessor: (row) => row.acknowledged ? (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-400 bg-gray-800/80 px-2 py-0.5 rounded border border-gray-700/50">
          <CheckCircle2 size={12} className="text-emerald-500" /> Acknowledged
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/30">
          <AlertTriangle size={12} /> Active
        </span>
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
          disabled={acknowledgingId === row.id}
          className="bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs px-3 py-1.5 rounded-lg transition-all shadow-sm active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
        >
          <Check size={13} />
          {acknowledgingId === row.id ? 'Saving...' : 'Acknowledge'}
        </button>
      ) : (
        <span className="text-xs text-gray-600 font-mono italic">Resolved</span>
      ) 
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-100">Security Alerts</h1>
          {unacknowledgedCount > 0 ? (
            <span className="bg-red-500/20 text-red-400 px-2.5 py-0.5 rounded-full text-xs font-semibold border border-red-500/30 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
              {unacknowledgedCount} Active
            </span>
          ) : (
            <span className="bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-full text-xs font-semibold border border-emerald-500/20">
              All Clear
            </span>
          )}
        </div>
        
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Severity Dropdown */}
          <select 
            value={severityFilter} 
            onChange={e => setSeverityFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700/60 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-blue-500/50"
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
            <option value="INFO">INFO</option>
          </select>

          {/* Status Dropdown */}
          <select 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700/60 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-blue-500/50"
          >
            <option value="all">All Alerts</option>
            <option value="unacknowledged">Active Only</option>
            <option value="acknowledged">Acknowledged Only</option>
          </select>

          {/* Search bar */}
          <div className="relative w-full sm:w-52">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
            <input
              type="text"
              placeholder="Filter alerts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700/60 rounded-lg pl-8 pr-3 py-2 text-xs text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-blue-500/50"
            />
          </div>
        </div>
      </div>

      {/* Main Alerts Table */}
      {error && !alerts ? (
        <ErrorState message={error.message} onRetry={refetch} />
      ) : (
        <div className="bg-gray-900/80 rounded-xl border border-gray-800 overflow-hidden shadow-sm">
          <DataTable 
            columns={columns} 
            data={filteredAlerts} 
            onRowClick={(row) => setSelectedAlert(row)}
            emptyMessage={loading && !alerts ? "Loading alerts..." : "No alerts found."} 
            emptyIcon={AlertTriangle} 
          />
        </div>
      )}

      {/* Alert Details Modal */}
      {selectedAlert && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn"
          onClick={() => setSelectedAlert(null)}
        >
          <div 
            className="bg-gray-900 border border-gray-700/80 rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                  <ShieldAlert size={22} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-100">Alert #{selectedAlert.id}</h3>
                  <div className="mt-1">
                    <SeverityBadge severity={selectedAlert.severity} />
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedAlert(null)}
                className="p-1.5 text-gray-400 hover:text-gray-200 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <p className="text-xs font-mono uppercase text-gray-500 mb-1">Message</p>
                <p className="text-gray-200 bg-gray-800/40 p-3 rounded-lg border border-gray-800 leading-relaxed font-medium">
                  {selectedAlert.message}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800/30 p-3 rounded-lg border border-gray-800/60">
                  <span className="text-xs text-gray-500 uppercase block mb-1 font-mono">Computer</span>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-200">{selectedAlert.hostname}</span>
                    {selectedAlert.computer_id && (
                      <button 
                        onClick={() => navigate(`/computers/${selectedAlert.computer_id}`)}
                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-mono"
                      >
                        View <ExternalLink size={11} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="bg-gray-800/30 p-3 rounded-lg border border-gray-800/60">
                  <span className="text-xs text-gray-500 uppercase flex items-center gap-1.5 mb-1 font-mono">
                    <Clock size={12} /> Triggered
                  </span>
                  <p className="font-mono text-xs text-gray-200">
                    {formatDateTime(selectedAlert.created_at)}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5 font-mono">
                    <RelativeTime timestamp={selectedAlert.created_at} />
                  </p>
                </div>
              </div>

              <div className="bg-gray-800/30 p-3 rounded-lg border border-gray-800/60 flex items-center justify-between">
                <div>
                  <span className="text-xs text-gray-500 uppercase block mb-0.5 font-mono">Status</span>
                  <span className="text-xs font-medium text-gray-200">
                    {selectedAlert.acknowledged ? "Acknowledged by operator" : "Active & Unacknowledged"}
                  </span>
                </div>
                {!selectedAlert.acknowledged && (
                  <button
                    onClick={() => handleAcknowledge(selectedAlert.id)}
                    disabled={acknowledgingId === selectedAlert.id}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs px-3.5 py-1.5 rounded-lg transition-all shadow-sm active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Check size={13} />
                    {acknowledgingId === selectedAlert.id ? 'Acknowledging...' : 'Acknowledge Now'}
                  </button>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-gray-800 flex justify-end">
              <button
                onClick={() => setSelectedAlert(null)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-medium rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchEvents } from '../api/events';
import { fetchComputers } from '../api/computers';
import useRealtimeData from '../hooks/useRealtimeData';
import ErrorState from '../components/ErrorState';
import DataTable from '../components/DataTable';
import RelativeTime from '../components/RelativeTime';
import { formatExactTime, formatDateTime } from '../utils/date';
import { 
  Activity, 
  Search, 
  X, 
  ExternalLink, 
  Usb, 
  FileWarning, 
  MonitorOff, 
  FolderOpen, 
  HardDrive, 
  ShieldAlert, 
  Play, 
  Square,
  Clock,
  Server
} from 'lucide-react';

const EVENT_TYPES = [
  'agent_started', 
  'agent_stopped', 
  'computer_offline', 
  'folder_change',
  'large_file_detected', 
  'suspicious_file', 
  'unauthorized_access', 
  'usb_connected', 
  'usb_disconnected'
];

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

const getEventSeverity = (type) => {
  switch (type) {
    case 'suspicious_file':
      return { label: 'CRITICAL', color: 'text-red-400 bg-red-500/10 border-red-500/20' };
    case 'unauthorized_access':
    case 'usb_connected':
      return { label: 'HIGH', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' };
    case 'computer_offline':
      return { label: 'MEDIUM', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
    case 'folder_change':
    case 'large_file_detected':
      return { label: 'LOW', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' };
    case 'usb_disconnected':
    case 'agent_started':
    case 'agent_stopped':
    default:
      return { label: 'INFO', color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' };
  }
};

const formatEventType = (type) => {
  if (!type) return 'Unknown';
  return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

export default function Events() {
  const navigate = useNavigate();
  const [typeFilter, setTypeFilter] = useState('');
  const [computerFilter, setComputerFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Fetch computers for the filter dropdown
  const { data: computers } = useRealtimeData(fetchComputers, []);

  // Fetch events with server-side filters (computer_id & event_type)
  const fetchFn = useCallback(() => {
    const params = {};
    if (typeFilter) params.event_type = typeFilter;
    if (computerFilter) params.computer_id = computerFilter;
    return fetchEvents(params);
  }, [typeFilter, computerFilter]);

  // Events:
  const { data: events, loading, error, refetch } = useRealtimeData(
    fetchFn,
    [],
    { deps: [typeFilter, computerFilter], refetchEvents: ['new_event'] }
  );

  // Filter by search query client-side
  const filteredEvents = useMemo(() => {
    if (!Array.isArray(events)) return [];
    if (!searchQuery) return events;
    const q = searchQuery.toLowerCase();
    return events.filter(e => 
      (e.description && e.description.toLowerCase().includes(q)) ||
      (e.hostname && e.hostname.toLowerCase().includes(q)) ||
      (e.event_type && e.event_type.toLowerCase().includes(q))
    );
  }, [events, searchQuery]);

  const columns = [
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
      header: 'Computer', 
      accessor: (row) => (
        <span className="font-mono text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
          {row.hostname}
        </span>
      ) 
    },
    { 
      header: 'Event Type', 
      accessor: (row) => {
        const Icon = getEventIcon(row.event_type);
        const severity = getEventSeverity(row.event_type);
        return (
          <div className="flex items-center gap-2">
            <span className={`p-1 rounded ${severity.color} border`}>
              <Icon size={14} />
            </span>
            <span className="font-medium text-gray-200 text-xs">
              {formatEventType(row.event_type)}
            </span>
          </div>
        );
      }
    },
    { 
      header: 'Severity', 
      accessor: (row) => {
        const severity = getEventSeverity(row.event_type);
        return (
          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${severity.color}`}>
            {severity.label}
          </span>
        );
      }
    },
    { 
      header: 'Description', 
      accessor: (row) => (
        <span className="text-gray-300 text-xs truncate max-w-md block">
          {row.description || '—'}
        </span>
      ) 
    },
    { 
      header: 'Metadata', 
      accessor: (row) => row.metadata && Object.keys(row.metadata).length > 0 ? (
        <span className="text-[11px] font-mono text-gray-400 bg-gray-800/80 px-2 py-0.5 rounded border border-gray-700/60 max-w-xs truncate inline-block">
          {Object.entries(row.metadata).map(([k,v]) => `${k}:${v}`).join(', ')}
        </span>
      ) : <span className="text-gray-600 text-xs">—</span>
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-100">Security Events</h1>
          {Array.isArray(events) && (
            <span className="bg-gray-800 text-gray-300 px-2.5 py-0.5 rounded-full text-xs border border-gray-700 font-mono">
              {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'}
            </span>
          )}
        </div>
        
        {/* Filters bar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Computer Filter */}
          <select 
            value={computerFilter} 
            onChange={e => setComputerFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700/60 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-blue-500/50"
          >
            <option value="">All Computers</option>
            {Array.isArray(computers) && computers.map(c => (
              <option key={c.id} value={c.id}>{c.hostname}</option>
            ))}
          </select>

          {/* Event Type Filter */}
          <select 
            value={typeFilter} 
            onChange={e => setTypeFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700/60 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-blue-500/50"
          >
            <option value="">All Event Types</option>
            {EVENT_TYPES.map(type => (
              <option key={type} value={type}>{formatEventType(type)}</option>
            ))}
          </select>
          
          {/* Search bar */}
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700/60 rounded-lg pl-8 pr-3 py-2 text-xs text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-blue-500/50"
            />
          </div>
        </div>
      </div>

      {/* Main Events Table */}
      {error && !events ? (
        <ErrorState message={error.message} onRetry={refetch} />
      ) : (
        <div className="bg-gray-900/80 rounded-xl border border-gray-800 overflow-hidden shadow-sm">
          <DataTable 
            columns={columns} 
            data={filteredEvents} 
            onRowClick={(row) => setSelectedEvent(row)}
            emptyMessage={loading && !events ? "Loading security events..." : "No events match current filters."} 
            emptyIcon={Activity} 
          />
        </div>
      )}

      {/* Event Details Modal */}
      {selectedEvent && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn"
          onClick={() => setSelectedEvent(null)}
        >
          <div 
            className="bg-gray-900 border border-gray-700/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-800 pb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl border ${getEventSeverity(selectedEvent.event_type).color}`}>
                  {React.createElement(getEventIcon(selectedEvent.event_type), { size: 20 })}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-100">
                    {formatEventType(selectedEvent.event_type)}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-mono text-gray-400">Event #{selectedEvent.id}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.2 rounded border ${getEventSeverity(selectedEvent.event_type).color}`}>
                      {getEventSeverity(selectedEvent.event_type).label}
                    </span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedEvent(null)}
                className="p-1.5 text-gray-400 hover:text-gray-200 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-xs font-mono uppercase text-gray-500 mb-1">Description</p>
                <p className="text-gray-200 bg-gray-800/40 p-3 rounded-lg border border-gray-800 leading-relaxed">
                  {selectedEvent.description || "No description provided."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800/30 p-3 rounded-lg border border-gray-800/60">
                  <span className="text-xs text-gray-500 uppercase flex items-center gap-1.5 mb-1 font-mono">
                    <Server size={12} /> Computer
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-200">{selectedEvent.hostname}</span>
                    {selectedEvent.computer_id && (
                      <button 
                        onClick={() => navigate(`/computers/${selectedEvent.computer_id}`)}
                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-mono"
                        title="View computer details"
                      >
                        Details <ExternalLink size={11} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="bg-gray-800/30 p-3 rounded-lg border border-gray-800/60">
                  <span className="text-xs text-gray-500 uppercase flex items-center gap-1.5 mb-1 font-mono">
                    <Clock size={12} /> Timestamp
                  </span>
                  <p className="font-medium text-gray-200 font-mono text-xs">
                    {formatDateTime(selectedEvent.timestamp)}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5 font-mono">
                    <RelativeTime timestamp={selectedEvent.timestamp} />
                  </p>
                </div>
              </div>

              {/* Metadata Inspector */}
              <div>
                <p className="text-xs font-mono uppercase text-gray-500 mb-1">Payload Metadata</p>
                {selectedEvent.metadata && Object.keys(selectedEvent.metadata).length > 0 ? (
                  <pre className="bg-black/60 p-3.5 rounded-lg border border-gray-800 font-mono text-xs text-emerald-400 overflow-x-auto max-h-48 leading-relaxed">
                    {JSON.stringify(selectedEvent.metadata, null, 2)}
                  </pre>
                ) : (
                  <p className="text-xs text-gray-500 italic">No additional metadata attached.</p>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-gray-800 flex justify-end">
              <button
                onClick={() => setSelectedEvent(null)}
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

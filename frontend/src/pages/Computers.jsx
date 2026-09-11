import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchComputers } from '../api/computers';
import useRealtimeData from '../hooks/useRealtimeData';
import StatusBadge from '../components/StatusBadge';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import RelativeTime from '../components/RelativeTime';
import { Search, Globe, Monitor, Calendar, Clock, ChevronRight } from 'lucide-react';

export default function Computers() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'online', 'offline'
  
  const { data: computers, loading, error, refetch } = useRealtimeData(
    fetchComputers,
    [],
    { refetchEvents: ['computer_status', 'computer_registered', 'computer_deleted'] }
  );

  const filteredComputers = useMemo(() => {
    if (!Array.isArray(computers)) return [];
    let list = computers;

    if (statusFilter === 'online') {
      list = list.filter(c => Boolean(c.online));
    } else if (statusFilter === 'offline') {
      list = list.filter(c => !c.online);
    }

    if (!searchQuery) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(c => 
      (c.hostname && c.hostname.toLowerCase().includes(q)) || 
      (c.ip_address && c.ip_address.toLowerCase().includes(q))
    );
  }, [computers, statusFilter, searchQuery]);

  const stats = useMemo(() => {
    if (!Array.isArray(computers)) return { total: 0, online: 0, offline: 0 };
    const online = computers.filter(c => c.online).length;
    return {
      total: computers.length,
      online,
      offline: computers.length - online
    };
  }, [computers]);

  if (loading && !computers) return <LoadingState message="Loading laboratory systems..." />;
  if (error && !computers) return <ErrorState message={error.message} onRetry={refetch} />;

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-100">Lab Computers</h1>
          <span className="bg-gray-800 text-gray-300 px-2.5 py-0.5 rounded-full text-xs border border-gray-700 font-mono">
            {stats.total} total
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Quick status tabs */}
          <div className="bg-gray-800/80 p-1 rounded-lg border border-gray-700/60 flex items-center gap-1 text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                statusFilter === 'all' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              All ({stats.total})
            </button>
            <button
              onClick={() => setStatusFilter('online')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                statusFilter === 'online' 
                  ? 'bg-emerald-600 text-white' 
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Online ({stats.online})
            </button>
            <button
              onClick={() => setStatusFilter('offline')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                statusFilter === 'offline' 
                  ? 'bg-gray-700 text-white' 
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Offline ({stats.offline})
            </button>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
            <input
              type="text"
              placeholder="Search hostname or IP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700/60 rounded-lg pl-8 pr-3 py-2 text-xs text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-blue-500/50"
            />
          </div>
        </div>
      </div>

      {/* Grid of Computer Cards */}
      {!filteredComputers.length ? (
        <EmptyState 
          icon={Monitor} 
          title="No computers found" 
          message={searchQuery ? "No computers match your search criteria." : "No laboratory computers registered."} 
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredComputers.map(comp => (
            <div 
              key={comp.id} 
              onClick={() => navigate(`/computers/${comp.id}`)}
              className={`bg-gray-900/80 border border-gray-800 rounded-xl p-5 hover:border-gray-700 hover:bg-gray-800/60 transition-all cursor-pointer shadow-sm relative group overflow-hidden border-l-4 ${
                comp.online ? 'border-l-emerald-500' : 'border-l-gray-600'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-gray-800/80 border border-gray-700/50 text-gray-300">
                    <Monitor size={18} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-100 group-hover:text-blue-400 transition-colors">
                      {comp.hostname}
                    </h3>
                    <span className="text-[11px] font-mono text-gray-500">ID #{comp.id}</span>
                  </div>
                </div>
                <StatusBadge online={comp.online} />
              </div>

              {/* IP Address */}
              <div className="flex items-center gap-2 text-xs text-gray-300 mb-4 bg-gray-800/40 p-2.5 rounded-lg border border-gray-800">
                <Globe size={13} className="text-gray-500" />
                <span className="font-mono">{comp.ip_address || 'No IP recorded'}</span>
              </div>

              {/* Timestamps */}
              <div className="space-y-1.5 pt-3 border-t border-gray-800/80 text-[11px] text-gray-400">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-gray-500">
                    <Clock size={11} /> Last seen:
                  </span>
                  <span className="font-mono text-gray-300">
                    <RelativeTime timestamp={comp.last_seen} />
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-gray-500">
                    <Calendar size={11} /> Registered:
                  </span>
                  <span className="font-mono text-gray-400">
                    <RelativeTime timestamp={comp.registered_at} />
                  </span>
                </div>
              </div>

              {/* Hover indicator */}
              <div className="mt-3 pt-2 text-right">
                <span className="text-[11px] text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end gap-0.5 font-medium">
                  View Telemetry <ChevronRight size={12} />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

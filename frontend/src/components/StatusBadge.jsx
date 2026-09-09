import React from 'react';

export default function StatusBadge({ online, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        online ? 'bg-emerald-500/10 text-emerald-500' : 'bg-gray-500/10 text-gray-400'
      } ${className}`}
    >
      <span className="relative flex h-2 w-2">
        {online && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
        )}
        <span
          className={`relative inline-flex h-2 w-2 rounded-full ${
            online ? 'bg-emerald-500' : 'bg-gray-500'
          }`}
        ></span>
      </span>
      {online ? 'Online' : 'Offline'}
    </span>
  );
}

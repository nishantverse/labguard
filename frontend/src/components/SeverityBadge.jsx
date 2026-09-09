import React from 'react';

export default function SeverityBadge({ severity }) {
  let badgeStyle = 'bg-slate-500/10 text-slate-300';
  let borderStyle = '';
  
  switch (severity?.toUpperCase()) {
    case 'LOW':
      badgeStyle = 'bg-blue-500/10 text-blue-400';
      break;
    case 'MEDIUM':
      badgeStyle = 'bg-amber-500/10 text-amber-400';
      break;
    case 'HIGH':
      badgeStyle = 'bg-orange-500/10 text-orange-400';
      break;
    case 'CRITICAL':
      badgeStyle = 'bg-red-500/10 text-red-400';
      borderStyle = 'border border-red-500/20';
      break;
    case 'INFO':
    default:
      badgeStyle = 'bg-slate-500/10 text-slate-300';
      break;
  }

  return (
    <span
      className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${badgeStyle} ${borderStyle}`}
    >
      {severity || 'INFO'}
    </span>
  );
}

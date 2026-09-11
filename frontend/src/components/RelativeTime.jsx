import React, { useState, useEffect } from 'react';
import { formatRelativeTime, formatDateTime } from '../utils/date';

export default function RelativeTime({ timestamp, className = '', showExactOnHover = true }) {
  // Simple tick counter to force re-evaluation of relative time every 10 seconds
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => (t + 1) % 10000);
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const relativeText = formatRelativeTime(timestamp);
  const fullDateTime = showExactOnHover ? formatDateTime(timestamp) : (timestamp || 'Unknown');

  return (
    <span 
      className={className} 
      title={fullDateTime}
    >
      {relativeText}
    </span>
  );
}

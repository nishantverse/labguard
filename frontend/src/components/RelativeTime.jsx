import React, { useState, useEffect } from 'react';
import { formatRelativeTime, formatDateTime } from '../utils/date';

export default function RelativeTime({ timestamp, className = '', showExactOnHover = true }) {
  const [relativeText, setRelativeText] = useState(() => formatRelativeTime(timestamp));

  useEffect(() => {
    setRelativeText(formatRelativeTime(timestamp));
    
    // Refresh relative text every 10 seconds
    const interval = setInterval(() => {
      setRelativeText(formatRelativeTime(timestamp));
    }, 10000);
    
    return () => clearInterval(interval);
  }, [timestamp]);

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

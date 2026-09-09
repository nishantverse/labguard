import React, { useState, useEffect } from 'react';

function getRelativeTime(timestamp) {
  if (!timestamp) return '—';
  const now = new Date();
  const past = new Date(timestamp + (timestamp.endsWith('Z') ? '' : 'Z'));
  const diffInSeconds = Math.floor((now - past) / 1000);
  
  if (isNaN(diffInSeconds)) return '—';
  
  if (diffInSeconds < 30) return 'just now';
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
}

export default function RelativeTime({ timestamp, className = '' }) {
  const [relativeText, setRelativeText] = useState(getRelativeTime(timestamp));

  useEffect(() => {
    setRelativeText(getRelativeTime(timestamp));
    
    const interval = setInterval(() => {
      setRelativeText(getRelativeTime(timestamp));
    }, 15000);
    
    return () => clearInterval(interval);
  }, [timestamp]);

  return (
    <span className={className} title={timestamp || 'Unknown'}>
      {relativeText}
    </span>
  );
}

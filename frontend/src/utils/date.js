/**
 * Date and Timestamp Utility for LabGuard
 * 
 * Handles SQLite timestamps, local timezone formatting, and relative time calculation
 * without timezone drift bugs or unexpected 'just now' fallbacks.
 */

/**
 * Parses a backend timestamp string or Date into a valid Date object in local time.
 * Supports:
 *   - "YYYY-MM-DD HH:MM:SS" (SQLite local timestamp string)
 *   - "YYYY-MM-DDTHH:MM:SS"
 *   - "YYYY-MM-DDTHH:MM:SSZ" (UTC ISO)
 *   - "YYYY-MM-DDTHH:MM:SS+05:30" (ISO with offset)
 *   - Date instance
 */
export function parseTimestamp(ts) {
  if (!ts) return null;
  if (ts instanceof Date) return isNaN(ts.getTime()) ? null : ts;
  if (typeof ts !== 'string') return null;

  const trimmed = ts.trim();

  // Match "YYYY-MM-DD HH:MM:SS" or "YYYY-MM-DDTHH:MM:SS"
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (match) {
    // If it already has an explicit timezone marker (Z or +05:30), let native Date parse it
    if (trimmed.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(trimmed)) {
      const d = new Date(trimmed);
      return isNaN(d.getTime()) ? null : d;
    }
    // Otherwise construct directly from local date components (prevents UTC/local offset bugs)
    const [, y, m, d, h, min, s] = match;
    return new Date(Number(y), Number(m) - 1, Number(d), Number(h), Number(min), Number(s));
  }

  const fallback = new Date(trimmed);
  return isNaN(fallback.getTime()) ? null : fallback;
}

/**
 * Returns formatted relative time string:
 * - "just now" (< 10 seconds)
 * - "35s ago" (< 60 seconds)
 * - "1 min ago"
 * - "12 mins ago"
 * - "1 hour ago"
 * - "3 hours ago"
 * - "1 day ago"
 * - "4 days ago"
 */
export function formatRelativeTime(ts) {
  const date = parseTimestamp(ts);
  if (!date) return '—';

  const now = new Date();
  let diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  // Slight clock skew between client and server (within 30s) -> just now
  if (diffInSeconds < 0 && diffInSeconds >= -30) {
    diffInSeconds = 0;
  }

  // If clock skew is larger, show exact time rather than "just now"
  if (diffInSeconds < 0) {
    const futureMins = Math.floor(Math.abs(diffInSeconds) / 60);
    return futureMins < 60 ? `in ${futureMins}m` : formatExactTime(date);
  }

  if (diffInSeconds < 10) return 'just now';
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;

  const minutes = Math.floor(diffInSeconds / 60);
  if (minutes === 1) return '1 min ago';
  if (minutes < 60) return `${minutes} mins ago`;

  const hours = Math.floor(minutes / 60);
  if (hours === 1) return '1 hour ago';
  if (hours < 24) return `${hours} hours ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;

  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Returns clock time string, e.g. "10:42 PM"
 */
export function formatExactTime(ts) {
  const date = parseTimestamp(ts);
  if (!date) return '—';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
}

/**
 * Returns full date and time string for tooltips and details, e.g. "Sep 9, 2026, 10:42:15 PM"
 */
export function formatDateTime(ts) {
  const date = parseTimestamp(ts);
  if (!date) return '—';
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
}


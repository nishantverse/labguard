import { useState, useEffect, useRef, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';

/**
 * Real-time data hook with WebSocket + HTTP polling fallback.
 *
 * @param {Function} fetchFn - Async function that returns initial/fallback data
 * @param {Array} wsEvents - Array of { event, handler(currentData, payload) => newData }
 * @param {Object} options - { interval, enabled, deps, refetchEvents }
 *   - refetchEvents: Array of WS event names that trigger a full HTTP re-fetch
 */
export default function useRealtimeData(fetchFn, wsEvents = [], options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const { connected, subscribe } = useWebSocket();

  const fetchFnRef = useRef(fetchFn);
  const isMountedRef = useRef(true);

  useEffect(() => {
    fetchFnRef.current = fetchFn;
  });

  const fetchData = useCallback(async (isInitial = false) => {
    if (isInitial && isMountedRef.current) {
      setLoading(true);
    }
    try {
      const result = await fetchFnRef.current();
      if (isMountedRef.current) {
        setData(result);
        setError(null);
        setLastUpdated(new Date());
      }
      return result;
    } catch (err) {
      if (isMountedRef.current) {
        setError(err);
      }
      return null;
    } finally {
      if (isInitial && isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const refetch = useCallback(() => fetchData(false), [fetchData]);

  const enabled = options.enabled !== false;
  const customInterval = options.interval;
  const deps = options.deps || [];
  const refetchEvents = options.refetchEvents || [];

  // Initial fetch + re-fetch on deps change
  useEffect(() => {
    isMountedRef.current = true;
    if (enabled) {
      fetchData(true);
    } else {
      setLoading(false);
    }
    return () => {
      isMountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData, enabled, ...deps]);

  // Re-fetch when WS reconnects
  const prevConnected = useRef(connected);
  useEffect(() => {
    if (connected && !prevConnected.current && enabled) {
      fetchData(false);
    }
    prevConnected.current = connected;
  }, [connected, enabled, fetchData]);

  // Subscribe to WS events with inline handlers (keep listeners active even while connecting)
  useEffect(() => {
    if (!enabled || wsEvents.length === 0) return;

    const unsubscribers = wsEvents.map(({ event, handler }) => {
      return subscribe(event, (payload) => {
        if (isMountedRef.current) {
          setData(prev => {
            try {
              return handler(prev, payload);
            } catch {
              return prev;
            }
          });
          setLastUpdated(new Date());
        }
      });
    });

    return () => unsubscribers.forEach(unsub => unsub());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, subscribe]);

  // Subscribe to WS events that trigger full HTTP re-fetch
  useEffect(() => {
    if (!enabled || refetchEvents.length === 0) return;

    const unsubscribers = refetchEvents.map(eventName => {
      return subscribe(eventName, () => {
        if (isMountedRef.current) {
          fetchData(false);
        }
      });
    });

    return () => unsubscribers.forEach(unsub => unsub());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, subscribe, fetchData]);

  // Polling fallback — only when WS disconnected
  useEffect(() => {
    if (!enabled || connected) return;

    const defaultEnvInterval = import.meta.env.VITE_POLLING_INTERVAL
      ? parseInt(import.meta.env.VITE_POLLING_INTERVAL, 10)
      : 12000;

    const localStorageInterval = typeof window !== 'undefined'
      ? window.localStorage.getItem('labguard_polling_interval')
      : null;
    const parsedLocalInterval = localStorageInterval ? parseInt(localStorageInterval, 10) : null;

    const interval = customInterval || parsedLocalInterval || defaultEnvInterval;

    const intervalId = setInterval(() => {
      fetchData(false);
    }, interval);

    return () => clearInterval(intervalId);
  }, [fetchData, enabled, customInterval, connected]);

  return {
    data,
    loading,
    error,
    refetch,
    lastUpdated,
    connected,
  };
}

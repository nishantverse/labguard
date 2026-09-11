import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for periodic API polling with silent background refresh
 * and reactive dependency re-fetching.
 * 
 * @param {Function} fetchFn - Async function that returns data
 * @param {Object} options - Configuration options:
 *   - interval: number in ms (defaults to env VITE_POLLING_INTERVAL or 12000)
 *   - enabled: boolean (default true)
 *   - deps: Array of dependencies that should trigger an immediate re-fetch
 * @returns {Object} { data, loading, error, refetch, lastUpdated }
 */
export default function usePolling(fetchFn, options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchFnRef = useRef(fetchFn);
  const optionsRef = useRef(options);
  const isMountedRef = useRef(true);

  useEffect(() => {
    fetchFnRef.current = fetchFn;
    optionsRef.current = options;
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

  const refetch = useCallback(() => {
    return fetchData(false);
  }, [fetchData]);

  const enabled = options.enabled !== false;
  const customInterval = options.interval;
  const deps = options.deps || [];

  // Re-fetch immediately when dynamic dependencies change
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

  // Periodic polling timer
  useEffect(() => {
    if (!enabled) return;

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
  }, [fetchData, enabled, customInterval]);

  return { 
    data, 
    loading, 
    error, 
    refetch, 
    lastUpdated 
  };
}

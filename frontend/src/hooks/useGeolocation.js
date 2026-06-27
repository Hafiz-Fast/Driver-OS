import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Custom hook for browser geolocation.
 *
 * @param {Object}  options
 * @param {boolean} options.watch   — keep tracking position changes (default false)
 * @param {number}  options.interval — minimum ms between position updates when watching (default 3000)
 * @param {boolean} options.enableHighAccuracy
 * @param {number}  options.timeout
 * @param {number}  options.maximumAge
 *
 * @returns {{ position, error, loading, refresh }}
 */
export default function useGeolocation(options = {}) {
  const {
    watch = false,
    interval = 3000,
    enableHighAccuracy = true,
    timeout = 8000,
    maximumAge = 30000,
  } = options;

  const [position, setPosition] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const watchIdRef = useRef(null);
  const lastUpdateRef = useRef(0);

  const geoOptions = { enableHighAccuracy, timeout, maximumAge };

  /* ── Single-shot position ── */
  const refresh = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser.');
      return;
    }
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition(pos);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message || 'Unable to get location.');
        setLoading(false);
      },
      geoOptions,
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Watch mode — continuous tracking with throttle ── */
  useEffect(() => {
    if (!watch) return;
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser.');
      return;
    }

    setLoading(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        if (now - lastUpdateRef.current < interval) return;
        lastUpdateRef.current = now;
        setPosition(pos);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message || 'Location tracking failed.');
        setLoading(false);
      },
      geoOptions,
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [watch, interval]); // eslint-disable-line react-hooks/exhaustive-deps

  return { position, error, loading, refresh };
}

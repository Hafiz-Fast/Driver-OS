import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

/**
 * Lightweight Mapbox GL wrapper for trip visualisation. StrictMode-safe.
 *
 * Props
 * ───────────────────────────────────────────────
 * startCoord   { [lng, lat] }  — green marker
 * endCoord     { [lng, lat] }  — red marker
 * pathCoords   { [lng, lat][] }— polyline breadcrumb trail
 * interactive  boolean          — allow map clicks (picks location)
 * onMapClick   (lng, lat) => void
 * height       string           — CSS height (default '440px')
 * overlay      ReactNode        — rendered on top of the map (e.g. distance badge)
 */
const PATH_SOURCE = 'trip-path';
const PATH_LAYER = 'trip-path-line';
const PATH_GLOW = 'trip-path-glow';

function makeMarker(color, label) {
  const el = document.createElement('div');
  el.className = `trip-marker trip-marker-${color}`;
  el.title = label || '';

  const pin = document.createElement('div');
  pin.className = 'trip-marker-pin';
  const dot = document.createElement('div');
  dot.className = 'trip-marker-dot';
  pin.appendChild(dot);
  el.appendChild(pin);

  return el;
}

/** Draw markers + polyline + fit bounds onto a ready map. */
function paint(map, { startCoord, endCoord, pathCoords, markersRef }) {
  if (!map || !map.getSource(PATH_SOURCE)) return;

  /* Clear old markers */
  (markersRef.current || []).forEach((m) => m.remove());
  markersRef.current = [];

  if (startCoord) {
    markersRef.current.push(new mapboxgl.Marker({ element: makeMarker('start', 'Start') }).setLngLat(startCoord).addTo(map));
  }
  if (endCoord) {
    markersRef.current.push(new mapboxgl.Marker({ element: makeMarker('end', 'End') }).setLngLat(endCoord).addTo(map));
  }

  const coords = (pathCoords || []).map((c) => [c[0], c[1]]);
  const allCoords = [
    ...(startCoord ? [startCoord] : []),
    ...coords,
    ...(endCoord ? [endCoord] : []),
  ];

  map.getSource(PATH_SOURCE).setData({
    type: 'FeatureCollection',
    features: allCoords.length > 1
      ? [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: allCoords } }]
      : [],
  });

  if (allCoords.length > 0) {
    const bounds = new mapboxgl.LngLatBounds();
    allCoords.forEach((c) => bounds.extend(c));
    map.fitBounds(bounds, { padding: 60, maxZoom: 16, duration: 600 });
  }
}

export default function TripMap({
  startCoord = null,
  endCoord = null,
  pathCoords = [],
  interactive = false,
  onMapClick = null,
  height = '440px',
  overlay = null,
  autoLocate = false,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const removedRef = useRef(false);       // guards async load callback after unmount
  const readyRef = useRef(false);          // true once layers are added
  const propsRef = useRef({ startCoord, endCoord, pathCoords });

  // Keep latest props + click handler in refs so the load closure stays fresh
  propsRef.current = { startCoord, endCoord, pathCoords };
  const clickRef = useRef(onMapClick);
  clickRef.current = onMapClick;
  const interactiveRef = useRef(interactive);
  interactiveRef.current = interactive;

  /* ── Initialise map once ── */
  useEffect(() => {
    if (!containerRef.current) return;
    removedRef.current = false;
    readyRef.current = false;

    const center = startCoord || [73.0479, 33.6844]; // default: Islamabad

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center,
      zoom: 13,
      attributionControl: false,
    });
    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    if (interactive && onMapClick) {
      map.on('click', (e) => {
        if (typeof clickRef.current === 'function') {
          clickRef.current(e.lngLat.lng, e.lngLat.lat);
        }
      });
    }

    const setupLayers = () => {
      if (removedRef.current) return;
      if (map.getSource(PATH_SOURCE)) {
        readyRef.current = true;
        paint(map, { ...propsRef.current, markersRef });
        return;
      }
      map.addSource(PATH_SOURCE, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: PATH_GLOW,
        type: 'line',
        source: PATH_SOURCE,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#3b82f6', 'line-width': 10, 'line-opacity': 0.15 },
      });
      map.addLayer({
        id: PATH_LAYER,
        type: 'line',
        source: PATH_SOURCE,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#3b82f6', 'line-width': 4, 'line-opacity': 0.85 },
      });
      readyRef.current = true;
      paint(map, { ...propsRef.current, markersRef });

      /* Centre on the user's real location when no markers are set yet */
      const hasMarkers = propsRef.current.startCoord || propsRef.current.endCoord;
      if (autoLocate && !hasMarkers && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (removedRef.current) return;
            map.flyTo({
              center: [pos.coords.longitude, pos.coords.latitude],
              zoom: 14,
              duration: 1200,
            });
          },
          () => { /* silent — keep default center */ },
          { enableHighAccuracy: true, timeout: 6000, maximumAge: 30000 },
        );
      }
    };

    if (map.isStyleLoaded()) setupLayers();
    else map.on('load', setupLayers);

    return () => {
      removedRef.current = true;
      readyRef.current = false;
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Repaint when markers/path change ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    paint(map, { startCoord, endCoord, pathCoords, markersRef });
  }, [startCoord, endCoord, pathCoords]);

  return (
    <div className="trip-map-container" style={{ height, position: 'relative' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      {overlay}
    </div>
  );
}

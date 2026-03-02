import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import { v4 as uuidv4 } from 'uuid';
import type { MarkerPoint } from '../types/zone';
import {
  buildLineFeature,
  buildPolygonFeature,
  buildPointsFeatureCollection,
} from '../utils/geojson';
import { findClosestSegmentIndex } from '../utils/geometry';
import { LAYER_IDS } from '../constants/map';

const CLOSE_PIXEL_THRESHOLD = 15;

export function useZoneEditor(map: maplibregl.Map | null) {
  const [markers, setMarkers] = useState<MarkerPoint[]>([]);
  const [isClosed, setIsClosed] = useState(false);

  // Refs to avoid stale closures in persistent map event handlers
  const markersRef = useRef<MarkerPoint[]>(markers);
  const isClosedRef = useRef<boolean>(isClosed);
  // Flag to suppress the general click when a layer click fires first.
  // MapLibre's MapLayerMouseEvent has no stopPropagation; layer handlers
  // do fire before the general handler so a ref flag works correctly.
  const edgeClickConsumedRef = useRef(false);
  useEffect(() => { markersRef.current = markers; }, [markers]);
  useEffect(() => { isClosedRef.current = isClosed; }, [isClosed]);

  // Derived GeoJSON — exposed so ZoneLayer can consume them
  const lineFeature = useMemo(
    () => buildLineFeature(markers, isClosed),
    [markers, isClosed],
  );

  // Only produce a polygon when the zone is actually closed to prevent
  // premature fill rendering while the user is still placing points
  const polygonFeature = useMemo(
    () => (isClosed ? buildPolygonFeature(markers) : null),
    [markers, isClosed],
  );

  const pointsFeature = useMemo(
    () => buildPointsFeatureCollection(markers),
    [markers],
  );

  // General map click: add marker or close zone by clicking first marker
  useEffect(() => {
    if (!map) return;

    const handleClick = (e: maplibregl.MapMouseEvent) => {
      // Suppress if a layer click (edge insertion) already handled this event
      if (edgeClickConsumedRef.current) {
        edgeClickConsumedRef.current = false;
        return;
      }
      if (isClosedRef.current) return;

      const current = markersRef.current;

      // Close zone if clicking within threshold of first marker (3+ points)
      if (current.length >= 3) {
        const first = current[0];
        const firstPixel = map.project([first.lng, first.lat]);
        const dx = e.point.x - firstPixel.x;
        const dy = e.point.y - firstPixel.y;
        if (Math.sqrt(dx * dx + dy * dy) <= CLOSE_PIXEL_THRESHOLD) {
          setIsClosed(true);
          return;
        }
      }

      setMarkers((prev) => [
        ...prev,
        { id: uuidv4(), lng: e.lngLat.lng, lat: e.lngLat.lat },
      ]);
    };

    map.on('click', handleClick);
    return () => { map.off('click', handleClick); };
  }, [map]);

  // Line layer click: insert point on a closed zone's edge
  useEffect(() => {
    if (!map) return;

    const handleLineClick = (e: maplibregl.MapLayerMouseEvent) => {
      if (!isClosedRef.current) return;
      edgeClickConsumedRef.current = true;

      const current = markersRef.current;
      const clickCoord: [number, number] = [e.lngLat.lng, e.lngLat.lat];

      // Treat the polygon as a closed ring so the last→first segment is included
      const insertIndex = findClosestSegmentIndex(
        [...current, current[0]],
        clickCoord,
      );

      setMarkers((prev) => {
        const updated = [...prev];
        updated.splice(insertIndex + 1, 0, {
          id: uuidv4(),
          lng: e.lngLat.lng,
          lat: e.lngLat.lat,
        });
        return updated;
      });
    };

    map.on('click', LAYER_IDS.ZONE_LINE, handleLineClick);
    return () => { map.off('click', LAYER_IDS.ZONE_LINE, handleLineClick); };
  }, [map]);

  const closeZone = useCallback(() => {
    if (markersRef.current.length >= 3) setIsClosed(true);
  }, []);

  const deleteMarker = useCallback((id: string) => {
    setMarkers((prev) => {
      const next = prev.filter((m) => m.id !== id);
      if (next.length < 3) setIsClosed(false);
      return next;
    });
  }, []);

  const clearZone = useCallback(() => {
    setMarkers([]);
    setIsClosed(false);
  }, []);

  const undoLast = useCallback(() => {
    setMarkers((prev) => {
      const next = prev.slice(0, -1);
      if (next.length < 3) setIsClosed(false);
      return next;
    });
  }, []);

  const onMarkerDrag = useCallback((id: string, lng: number, lat: number) => {
    setMarkers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, lng, lat } : m)),
    );
  }, []);

  return {
    markers,
    isClosed,
    lineFeature,
    polygonFeature,
    pointsFeature,
    closeZone,
    deleteMarker,
    clearZone,
    undoLast,
    onMarkerDrag,
  };
}

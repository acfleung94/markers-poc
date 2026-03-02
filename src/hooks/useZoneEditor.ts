import { useState, useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import { v4 as uuidv4 } from 'uuid';
import type { Zone } from '../types/zone';
import { findClosestSegmentIndex } from '../utils/geometry';
import { LAYER_IDS, SOURCE_IDS } from '../constants/map';

const CLOSE_PIXEL_THRESHOLD = 15;

export function useZoneEditor(map: maplibregl.Map | null) {
  const [zones, setZones] = useState<Zone[]>([]);
  const [activeZoneId, setActiveZoneId] = useState<string | null>(null);

  // Refs to avoid stale closures in persistent map event handlers
  const zonesRef = useRef<Zone[]>(zones);
  const activeZoneIdRef = useRef<string | null>(activeZoneId);
  const edgeClickConsumedRef = useRef(false);
  const hoveredZoneIdRef = useRef<string | null>(null);
  useEffect(() => { zonesRef.current = zones; }, [zones]);
  useEffect(() => { activeZoneIdRef.current = activeZoneId; }, [activeZoneId]);

  // If the active zone was removed (e.g. all markers undone/deleted), clear activeZoneId
  useEffect(() => {
    if (activeZoneId && !zones.some(z => z.id === activeZoneId)) {
      setActiveZoneId(null);
    }
  }, [zones, activeZoneId]);

  // General map click: add marker to active zone, or start a new zone
  useEffect(() => {
    if (!map) return;

    const handleClick = (e: maplibregl.MapMouseEvent) => {
      if (edgeClickConsumedRef.current) {
        edgeClickConsumedRef.current = false;
        return;
      }
      const currentZones = zonesRef.current;
      const activeId = activeZoneIdRef.current;
      const activeZone = activeId ? currentZones.find(z => z.id === activeId) : null;

      // If not drawing, check if click landed inside a different closed zone → select it
      if (!activeZone || activeZone.isClosed) {
        const fillHits = map.queryRenderedFeatures(e.point, { layers: [LAYER_IDS.ZONE_FILL] });
        if (fillHits.length > 0) {
          const zoneId = fillHits[0].properties?.zoneId as string | undefined;
          const zone = zoneId ? currentZones.find(z => z.id === zoneId) : null;
          // Skip if this zone is already the active one — fall through to insert
          if (zone?.isClosed && zoneId && zoneId !== activeId) {
            setActiveZoneId(zoneId);
            return;
          }
        }
      }

      if (activeZone && !activeZone.isClosed) {
        // Drawing mode: close or append
        if (activeZone.markers.length >= 3) {
          const first = activeZone.markers[0];
          const firstPixel = map.project([first.lng, first.lat]);
          const dx = e.point.x - firstPixel.x;
          const dy = e.point.y - firstPixel.y;
          if (Math.sqrt(dx * dx + dy * dy) <= CLOSE_PIXEL_THRESHOLD) {
            setZones(prev => prev.map(z =>
              z.id === activeId ? { ...z, isClosed: true } : z,
            ));
            setActiveZoneId(null);
            return;
          }
        }
        // Append marker to active zone
        setZones(prev => prev.map(z =>
          z.id === activeId
            ? { ...z, markers: [...z.markers, { id: uuidv4(), lng: e.lngLat.lng, lat: e.lngLat.lat }] }
            : z,
        ));
      } else if (activeZone && activeZone.isClosed) {
        // Edit mode: insert new point at the closest segment
        const insertIndex = findClosestSegmentIndex(
          [...activeZone.markers, activeZone.markers[0]],
          [e.lngLat.lng, e.lngLat.lat],
        );
        setZones(prev => prev.map(z => {
          if (z.id !== activeId) return z;
          const updated = [...z.markers];
          updated.splice(insertIndex + 1, 0, { id: uuidv4(), lng: e.lngLat.lng, lat: e.lngLat.lat });
          return { ...z, markers: updated };
        }));
      } else {
        // No active zone: start a new one
        const newZone: Zone = {
          id: uuidv4(),
          markers: [{ id: uuidv4(), lng: e.lngLat.lng, lat: e.lngLat.lat }],
          isClosed: false,
        };
        setZones(prev => [...prev, newZone]);
        setActiveZoneId(newZone.id);
      }
    };

    map.on('click', handleClick);
    return () => { map.off('click', handleClick); };
  }, [map]);

  // Line hit layer: insert point on a closed zone's edge + hover feedback
  useEffect(() => {
    if (!map) return;

    const handleLineClick = (e: maplibregl.MapLayerMouseEvent) => {
      const zoneId = e.features?.[0]?.properties?.zoneId as string | undefined;
      if (!zoneId) return;
      const zone = zonesRef.current.find(z => z.id === zoneId);
      if (!zone?.isClosed) return;

      edgeClickConsumedRef.current = true;

      // Clear hover state — setData (triggered by setZones) will wipe feature state
      if (hoveredZoneIdRef.current) {
        map.setFeatureState({ source: SOURCE_IDS.ZONE, id: hoveredZoneIdRef.current }, { hover: false });
        hoveredZoneIdRef.current = null;
      }
      map.getCanvas().style.cursor = '';

      const clickCoord: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      const insertIndex = findClosestSegmentIndex(
        [...zone.markers, zone.markers[0]],
        clickCoord,
      );

      setZones(prev => prev.map(z => {
        if (z.id !== zoneId) return z;
        const updated = [...z.markers];
        updated.splice(insertIndex + 1, 0, { id: uuidv4(), lng: e.lngLat.lng, lat: e.lngLat.lat });
        return { ...z, markers: updated };
      }));
    };

    const handleMouseEnter = (e: maplibregl.MapLayerMouseEvent) => {
      const zoneId = e.features?.[0]?.properties?.zoneId as string | undefined;
      if (!zoneId) return;
      const zone = zonesRef.current.find(z => z.id === zoneId);
      if (!zone?.isClosed) return;

      map.getCanvas().style.cursor = 'pointer';
      map.setFeatureState({ source: SOURCE_IDS.ZONE, id: zoneId }, { hover: true });
      hoveredZoneIdRef.current = zoneId;
    };

    const handleMouseLeave = () => {
      map.getCanvas().style.cursor = '';
      if (hoveredZoneIdRef.current) {
        map.setFeatureState({ source: SOURCE_IDS.ZONE, id: hoveredZoneIdRef.current }, { hover: false });
        hoveredZoneIdRef.current = null;
      }
    };

    map.on('click', LAYER_IDS.ZONE_LINE_HIT, handleLineClick);
    map.on('mouseenter', LAYER_IDS.ZONE_LINE_HIT, handleMouseEnter);
    map.on('mouseleave', LAYER_IDS.ZONE_LINE_HIT, handleMouseLeave);
    return () => {
      map.off('click', LAYER_IDS.ZONE_LINE_HIT, handleLineClick);
      map.off('mouseenter', LAYER_IDS.ZONE_LINE_HIT, handleMouseEnter);
      map.off('mouseleave', LAYER_IDS.ZONE_LINE_HIT, handleMouseLeave);
    };
  }, [map]);


  const closeZone = useCallback(() => {
    const activeId = activeZoneIdRef.current;
    if (!activeId) return;
    setZones(prev => prev.map(z =>
      z.id === activeId && z.markers.length >= 3 ? { ...z, isClosed: true } : z,
    ));
    setActiveZoneId(null);
  }, []);

  const deleteMarker = useCallback((id: string) => {
    setZones(prev =>
      prev.reduce<Zone[]>((acc, z) => {
        if (!z.markers.some(m => m.id === id)) {
          acc.push(z);
          return acc;
        }
        // Only allow deletion from the currently active zone
        if (z.id !== activeZoneIdRef.current) {
          acc.push(z);
          return acc;
        }
        const next = z.markers.filter(m => m.id !== id);
        if (next.length === 0) return acc; // remove empty zone
        acc.push({ ...z, markers: next, isClosed: next.length < 3 ? false : z.isClosed });
        return acc;
      }, []),
    );
  }, []);

  const clearAll = useCallback(() => {
    setZones([]);
    setActiveZoneId(null);
  }, []);

const onMarkerDrag = useCallback((id: string, lng: number, lat: number) => {
    setZones(prev =>
      prev.map(z => ({
        ...z,
        markers: z.markers.map(m => m.id === id ? { ...m, lng, lat } : m),
      })),
    );
  }, []);

  return {
    zones,
    activeZoneId,
    closeZone,
    deleteMarker,
    clearAll,
    onMarkerDrag,
  };
}

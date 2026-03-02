import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import type { Zone } from '../types/zone';

interface Props {
  map: maplibregl.Map | null;
  zones: Zone[];
  activeZoneId: string | null;
  deleteMarker: (id: string) => void;
  onMarkerDrag: (id: string, lng: number, lat: number) => void;
}

function createMarkerElement(isCloseTarget: boolean): HTMLDivElement {
  const el = document.createElement('div');
  el.style.cssText = [
    'width: 14px',
    'height: 14px',
    'border-radius: 50%',
    `background: ${isCloseTarget ? '#ef4444' : '#2563eb'}`,
    'border: 2px solid white',
    'cursor: pointer',
    'box-shadow: 0 1px 3px rgba(0,0,0,0.3)',
    'box-sizing: border-box',
  ].join(';');
  return el;
}

export function MarkerLayer({ map, zones, activeZoneId, deleteMarker, onMarkerDrag }: Props) {
  const instancesRef = useRef<Map<string, maplibregl.Marker>>(new Map());

  useEffect(() => {
    if (!map) return;

    const instances = instancesRef.current;
    const currentIds = new Set(zones.flatMap(z => z.markers.map(m => m.id)));

    // Remove stale markers
    for (const [id, marker] of instances) {
      if (!currentIds.has(id)) {
        marker.remove();
        instances.delete(id);
      }
    }

    // Add new markers; skip existing ones
    zones.forEach(zone => {
      zone.markers.forEach((markerData, index) => {
        if (instances.has(markerData.id)) return;

        const isCloseTarget = zone.id === activeZoneId && !zone.isClosed && index === 0;
        const el = createMarkerElement(isCloseTarget);

        const marker = new maplibregl.Marker({ element: el, draggable: true })
          .setLngLat([markerData.lng, markerData.lat])
          .addTo(map);

        el.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          deleteMarker(markerData.id);
        });

        marker.on('dragstart', () => { el.style.cursor = 'grabbing'; });
        marker.on('drag', () => {
          const { lng, lat } = marker.getLngLat();
          onMarkerDrag(markerData.id, lng, lat);
        });
        marker.on('dragend', () => {
          el.style.cursor = 'pointer';
          const { lng, lat } = marker.getLngLat();
          onMarkerDrag(markerData.id, lng, lat);
        });

        instances.set(markerData.id, marker);
      });
    });

    // Update close-target color for all markers on every render
    zones.forEach(zone => {
      zone.markers.forEach((markerData, index) => {
        const marker = instances.get(markerData.id);
        if (!marker) return;
        const isCloseTarget = zone.id === activeZoneId && !zone.isClosed && index === 0;
        marker.getElement().style.background = isCloseTarget ? '#ef4444' : '#2563eb';
      });
    });
  });

  // Cleanup all markers on unmount
  useEffect(() => {
    const instances = instancesRef.current;
    return () => {
      for (const marker of instances.values()) marker.remove();
      instances.clear();
    };
  }, []);

  return null;
}

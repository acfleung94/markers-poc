import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import type { MarkerPoint } from '../types/zone';

interface Props {
  map: maplibregl.Map | null;
  markers: MarkerPoint[];
  deleteMarker: (id: string) => void;
  onMarkerDrag: (id: string, lng: number, lat: number) => void;
}

function createMarkerElement(isFirst: boolean): HTMLDivElement {
  const el = document.createElement('div');
  el.style.cssText = [
    'width: 14px',
    'height: 14px',
    'border-radius: 50%',
    `background: ${isFirst ? '#ef4444' : '#2563eb'}`,
    'border: 2px solid white',
    'cursor: pointer',
    'box-shadow: 0 1px 3px rgba(0,0,0,0.3)',
    'box-sizing: border-box',
  ].join(';');
  return el;
}

export function MarkerLayer({ map, markers, deleteMarker, onMarkerDrag }: Props) {
  const instancesRef = useRef<Map<string, maplibregl.Marker>>(new Map());

  useEffect(() => {
    if (!map) return;

    const instances = instancesRef.current;
    const currentIds = new Set(markers.map((m) => m.id));

    // Remove stale markers
    for (const [id, marker] of instances) {
      if (!currentIds.has(id)) {
        marker.remove();
        instances.delete(id);
      }
    }

    // Add new markers; skip existing ones
    markers.forEach((markerData, index) => {
      if (instances.has(markerData.id)) {
        // Update first-marker color if index changed (e.g. after undo)
        // Re-creating is simpler and markers are few in count for a POC
        return;
      }

      const el = createMarkerElement(index === 0);

      const marker = new maplibregl.Marker({ element: el, draggable: true })
        .setLngLat([markerData.lng, markerData.lat])
        .addTo(map);

      // Right-click to delete
      el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        deleteMarker(markerData.id);
      });

      // Drag: update GeoJSON live
      marker.on('dragstart', () => { el.style.cursor = 'grabbing'; });
      marker.on('drag', () => {
        const { lng, lat } = marker.getLngLat();
        onMarkerDrag(markerData.id, lng, lat);
      });

      // Dragend: commit final position to state
      marker.on('dragend', () => {
        el.style.cursor = 'pointer';
        const { lng, lat } = marker.getLngLat();
        onMarkerDrag(markerData.id, lng, lat);
      });

      instances.set(markerData.id, marker);
    });

    // Update first-marker color when the first marker changes
    // (e.g. after undoing the first point and a new first marker appears)
    markers.forEach((markerData, index) => {
      const marker = instances.get(markerData.id);
      if (!marker) return;
      const el = marker.getElement();
      const expectedColor = index === 0 ? '#ef4444' : '#2563eb';
      el.style.background = expectedColor;
    });
  });

  // Cleanup all markers on unmount
  useEffect(() => {
    const instances = instancesRef.current;
    return () => {
      for (const marker of instances.values()) {
        marker.remove();
      }
      instances.clear();
    };
  }, []);

  return null;
}

import { useRef } from 'react';
import { useMapInit } from '../hooks/useMapInit';
import { useZoneEditor } from '../hooks/useZoneEditor';
import { ZoneLayer } from './ZoneLayer';
import { MarkerLayer } from './MarkerLayer';
import { ZoneControls } from './ZoneControls';

export function MapView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { map, isLoaded } = useMapInit(containerRef);
  const {
    zones,
    activeZoneId,
    closeZone,
    deleteMarker,
    clearAll,
    onMarkerDrag,
  } = useZoneEditor(map);

  const activeZone = zones.find(z => z.id === activeZoneId) ?? null;
  const completedZoneCount = zones.filter(z => z.isClosed).length;

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      {isLoaded && (
        <>
          <ZoneLayer map={map} zones={zones} activeZoneId={activeZoneId} />
          <MarkerLayer
            map={map}
            zones={zones}
            activeZoneId={activeZoneId}
            deleteMarker={deleteMarker}
            onMarkerDrag={onMarkerDrag}
          />
          <ZoneControls
            closeZone={closeZone}
            clearAll={clearAll}
            activeZone={activeZone}
            completedZoneCount={completedZoneCount}
          />
        </>
      )}
    </div>
  );
}

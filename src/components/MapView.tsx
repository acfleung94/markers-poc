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
  } = useZoneEditor(map);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      {isLoaded && (
        <>
          <ZoneLayer
            map={map}
            lineFeature={lineFeature}
            polygonFeature={polygonFeature}
            pointsFeature={pointsFeature}
          />
          <MarkerLayer
            map={map}
            markers={markers}
            deleteMarker={deleteMarker}
            onMarkerDrag={onMarkerDrag}
          />
          <ZoneControls
            closeZone={closeZone}
            clearZone={clearZone}
            undoLast={undoLast}
            isClosed={isClosed}
            markerCount={markers.length}
          />
        </>
      )}
    </div>
  );
}

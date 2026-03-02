import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { MAP_STYLE_URL, DEFAULT_CENTER, DEFAULT_ZOOM } from '../constants/map';

export function useMapInit(containerRef: React.RefObject<HTMLDivElement | null>) {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE_URL,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    });

    mapRef.current = map;

    map.on('load', () => {
      setIsLoaded(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      setIsLoaded(false);
    };
  }, [containerRef]);

  return { map: mapRef.current, isLoaded };
}

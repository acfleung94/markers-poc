import type { MarkerPoint, Zone } from '../types/zone';

export function buildLineFeature(
  markers: MarkerPoint[],
  isClosed: boolean,
): GeoJSON.Feature<GeoJSON.LineString> | null {
  if (markers.length < 2) return null;

  const coords: [number, number][] = markers.map((m) => [m.lng, m.lat]);
  if (isClosed) {
    coords.push([markers[0].lng, markers[0].lat]);
  }

  return {
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: coords },
    properties: {},
  };
}

export function buildPolygonFeature(
  markers: MarkerPoint[],
): GeoJSON.Feature<GeoJSON.Polygon> | null {
  if (markers.length < 3) return null;

  const coords: [number, number][] = markers.map((m) => [m.lng, m.lat]);
  const ring: [number, number][] = [...coords, [markers[0].lng, markers[0].lat]];

  return {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [ring] },
    properties: {},
  };
}

export function buildPointsFeatureCollection(
  markers: MarkerPoint[],
): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: 'FeatureCollection',
    features: markers.map((m) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [m.lng, m.lat] },
      properties: { id: m.id },
    })),
  };
}

export function buildZonesGeoJSON(zones: Zone[], activeZoneId?: string | null): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];

  for (const zone of zones) {
    const isActive = zone.id === activeZoneId;

    const line = buildLineFeature(zone.markers, zone.isClosed);
    if (line) {
      features.push({ ...line, id: zone.id, properties: { zoneId: zone.id, isActive } });
    }

    if (zone.isClosed) {
      const polygon = buildPolygonFeature(zone.markers);
      if (polygon) {
        features.push({ ...polygon, id: zone.id, properties: { zoneId: zone.id, isActive } });
      }
    }

    for (const m of zone.markers) {
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [m.lng, m.lat] },
        properties: { id: m.id, zoneId: zone.id, isActive },
      });
    }
  }

  return { type: 'FeatureCollection', features };
}

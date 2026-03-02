import { useEffect } from 'react';
import maplibregl from 'maplibre-gl';
import { LAYER_IDS, SOURCE_IDS } from '../constants/map';

interface Props {
  map: maplibregl.Map | null;
  lineFeature: GeoJSON.Feature<GeoJSON.LineString> | null;
  polygonFeature: GeoJSON.Feature<GeoJSON.Polygon> | null;
  pointsFeature: GeoJSON.FeatureCollection<GeoJSON.Point>;
}

export function ZoneLayer({ map, lineFeature, polygonFeature, pointsFeature }: Props) {
  // Effect 1: register source and layers once when map becomes available
  useEffect(() => {
    if (!map) return;

    const emptyCollection: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [],
    };

    map.addSource(SOURCE_IDS.ZONE, {
      type: 'geojson',
      data: emptyCollection,
    });

    map.addLayer({
      id: LAYER_IDS.ZONE_FILL,
      type: 'fill',
      source: SOURCE_IDS.ZONE,
      filter: ['==', '$type', 'Polygon'],
      paint: {
        'fill-color': '#3b82f6',
        'fill-opacity': 0.2,
      },
    });

    map.addLayer({
      id: LAYER_IDS.ZONE_LINE,
      type: 'line',
      source: SOURCE_IDS.ZONE,
      filter: ['==', '$type', 'LineString'],
      paint: {
        'line-color': '#2563eb',
        'line-width': 2,
      },
    });

    map.addLayer({
      id: LAYER_IDS.ZONE_LINE_HIT,
      type: 'line',
      source: SOURCE_IDS.ZONE,
      filter: ['==', '$type', 'LineString'],
      paint: {
        'line-color': 'transparent',
        'line-width': 20,
      },
    });

    map.addLayer({
      id: LAYER_IDS.ZONE_POINTS,
      type: 'circle',
      source: SOURCE_IDS.ZONE,
      filter: ['==', '$type', 'Point'],
      paint: {
        'circle-radius': 4,
        'circle-color': '#2563eb',
        'circle-opacity': 0,  // invisible — exists only for click targeting
      },
    });

    return () => {
      if (map.getLayer(LAYER_IDS.ZONE_POINTS)) map.removeLayer(LAYER_IDS.ZONE_POINTS);
      if (map.getLayer(LAYER_IDS.ZONE_LINE_HIT)) map.removeLayer(LAYER_IDS.ZONE_LINE_HIT);
      if (map.getLayer(LAYER_IDS.ZONE_LINE)) map.removeLayer(LAYER_IDS.ZONE_LINE);
      if (map.getLayer(LAYER_IDS.ZONE_FILL)) map.removeLayer(LAYER_IDS.ZONE_FILL);
      if (map.getSource(SOURCE_IDS.ZONE)) map.removeSource(SOURCE_IDS.ZONE);
    };
  }, [map]);

  // Effect 2: update source data whenever derived GeoJSON changes
  useEffect(() => {
    if (!map) return;

    const source = map.getSource(SOURCE_IDS.ZONE) as maplibregl.GeoJSONSource | undefined;
    if (!source) return;

    const features: GeoJSON.Feature[] = [];
    if (lineFeature) features.push(lineFeature);
    if (polygonFeature) features.push(polygonFeature);
    features.push(...pointsFeature.features);

    source.setData({
      type: 'FeatureCollection',
      features,
    });
  }, [map, lineFeature, polygonFeature, pointsFeature]);

  return null;
}

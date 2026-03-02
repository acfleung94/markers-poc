export interface MarkerPoint {
  id: string;
  lng: number;
  lat: number;
}

export interface ZoneState {
  markers: MarkerPoint[];
  isClosed: boolean;
}

export interface GeoJSONDerivedData {
  lineFeature: GeoJSON.Feature<GeoJSON.LineString> | null;
  polygonFeature: GeoJSON.Feature<GeoJSON.Polygon> | null;
  pointsFeature: GeoJSON.FeatureCollection<GeoJSON.Point>;
}

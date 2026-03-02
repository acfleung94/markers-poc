export const MAP_STYLE_URL = 'https://demotiles.maplibre.org/style.json';
export const DEFAULT_CENTER: [number, number] = [-0.1276, 51.5074]; // London
export const DEFAULT_ZOOM = 12;

export const LAYER_IDS = {
  ZONE_FILL: 'zone-fill',
  ZONE_LINE: 'zone-line',
  ZONE_POINTS: 'zone-points',
} as const;

export const SOURCE_IDS = {
  ZONE: 'zone-source',
} as const;

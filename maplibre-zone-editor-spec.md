# MapLibre Zone Editor — Implementation Specification

## Project Overview

Build a React geolocation application using MapLibre GL JS where users can:
- Place markers on a map by clicking
- See markers connected by a live polyline
- Close the marker sequence into a filled polygon "zone"
- Edit zones by dragging markers, deleting points, or inserting new points on edges

---

## Dependencies

```bash
npm install maplibre-gl @types/maplibre-gl uuid @turf/turf
```

---

## File Structure to Generate

```
src/
├── components/
│   ├── MapView.tsx              # Root map component, initializes MapLibre
│   ├── ZoneLayer.tsx            # Renders GeoJSON polygon fill + outline line layer
│   ├── MarkerLayer.tsx          # Renders draggable HTML markers for each point
│   └── ZoneControls.tsx         # UI buttons: Close Zone, Undo, Clear
├── hooks/
│   ├── useMapInit.ts            # Hook to initialize and return the MapLibre map instance
│   └── useZoneEditor.ts         # Hook managing all zone state and interaction logic
├── utils/
│   ├── geojson.ts               # Helpers to build GeoJSON from marker arrays
│   └── geometry.ts              # Spatial helpers (closest segment, distance, etc.)
├── types/
│   └── zone.ts                  # TypeScript interfaces and types
├── constants/
│   └── map.ts                   # Map style URL, default center, zoom, layer IDs
└── App.tsx                      # Root app, renders MapView
```

---

## Types (`src/types/zone.ts`)

```ts
export interface MarkerPoint {
  id: string;           // uuid
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
```

---

## Constants (`src/constants/map.ts`)

```ts
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
```

---

## Utility: GeoJSON Builder (`src/utils/geojson.ts`)

Generate this file with the following exported functions:

### `buildLineFeature(markers: MarkerPoint[], isClosed: boolean)`
- Returns a `GeoJSON.Feature<GeoJSON.LineString>`
- If `isClosed` is true, append `markers[0]` coordinates to the end to visually close the loop
- Returns `null` if fewer than 2 markers

### `buildPolygonFeature(markers: MarkerPoint[])`
- Returns a `GeoJSON.Feature<GeoJSON.Polygon>`
- Coordinates must be a closed ring: `[...coords, coords[0]]`
- Returns `null` if fewer than 3 markers

### `buildPointsFeatureCollection(markers: MarkerPoint[])`
- Returns a `GeoJSON.FeatureCollection<GeoJSON.Point>`
- Each feature's `properties` should include the marker `id`

---

## Utility: Geometry Helpers (`src/utils/geometry.ts`)

Generate this file with the following exported functions:

### `findClosestSegmentIndex(markers: MarkerPoint[], clickCoord: [number, number]): number`
- Iterates every consecutive pair of markers as a segment
- Uses `@turf/nearest-point-on-line` to find distance from `clickCoord` to each segment
- Returns the index `i` such that the new point should be inserted between `markers[i]` and `markers[i+1]`

### `distanceBetween(a: [number, number], b: [number, number]): number`
- Returns the distance in meters between two `[lng, lat]` coordinates using `@turf/distance`

---

## Hook: `useMapInit` (`src/hooks/useMapInit.ts`)

- Accepts a `containerRef: React.RefObject<HTMLDivElement>`
- Initializes a `maplibregl.Map` instance on mount using constants from `map.ts`
- Stores the map instance in a `ref` (not state, to avoid re-renders)
- Waits for `map.on('load', ...)` before resolving
- Returns `{ map: maplibregl.Map | null, isLoaded: boolean }`
- Cleans up by calling `map.remove()` on unmount

---

## Hook: `useZoneEditor` (`src/hooks/useZoneEditor.ts`)

This is the core logic hook. It accepts `map: maplibregl.Map | null` and manages all zone editing behavior.

### State
```ts
const [markers, setMarkers] = useState<MarkerPoint[]>([]);
const [isClosed, setIsClosed] = useState(false);
```

### Derived GeoJSON
- Use `useMemo` to recompute `lineFeature`, `polygonFeature`, and `pointsFeatureCollection` whenever `markers` or `isClosed` changes
- Use `useEffect` to call `map.getSource(SOURCE_IDS.ZONE).setData(...)` whenever derived GeoJSON changes

### Map Source & Layer Setup
- In a `useEffect` that runs when `map` becomes available, register:
  - A single `GeoJSON` source with id `SOURCE_IDS.ZONE`
  - A `fill` layer (`LAYER_IDS.ZONE_FILL`) with low opacity fill color
  - A `line` layer (`LAYER_IDS.ZONE_LINE`) with a visible stroke
  - A `circle` layer (`LAYER_IDS.ZONE_POINTS`) for point handles (optional, used for click targeting)

### Interactions to Wire Up

#### Add marker on map click
- `map.on('click', handler)`
- If zone is not closed, push a new `MarkerPoint` to state
- If the user clicks within ~15px of `markers[0]` and there are 3+ markers, close the zone instead

#### Close zone
- Expose a `closeZone()` function
- Sets `isClosed = true`

#### Delete marker
- Expose `deleteMarker(id: string)`
- Filters marker out of array
- If fewer than 3 markers remain after deletion, set `isClosed = false`

#### Insert point on edge
- `map.on('click', LAYER_IDS.ZONE_LINE, handler)` — fires before the general map click
- Call `findClosestSegmentIndex` to determine insert position
- Use `splice` to insert new `MarkerPoint` into array at correct index
- Call `e.stopPropagation()` / set a flag to prevent the general map click from also firing

#### Drag marker
- For each `maplibregl.Marker` instance, listen to `drag` event
- During drag: update a `dragRef` (not state) for performance
- On `dragend`: commit updated coordinates to state via `setMarkers`

### Exported Interface
```ts
return {
  markers,
  isClosed,
  closeZone,
  deleteMarker,
  clearZone,   // resets all state
  undoLast,    // removes last added marker
};
```

---

## Component: `MapView.tsx`

- Renders a full-screen `div` as the map container using a `ref`
- Calls `useMapInit(containerRef)` to get `{ map, isLoaded }`
- Calls `useZoneEditor(map)` to get zone state and actions
- Passes `map`, `markers`, `isClosed`, and action functions down to child components
- Renders:
  - `<ZoneLayer />` — receives `map` and derived GeoJSON state (layers already registered in hook, this component handles updates)
  - `<MarkerLayer />` — receives `map`, `markers`, `isClosed`, `deleteMarker`
  - `<ZoneControls />` — receives `closeZone`, `clearZone`, `undoLast`, `isClosed`, `markerCount`

---

## Component: `MarkerLayer.tsx`

- Receives `map`, `markers`, `deleteMarker`
- Maintains a `Map<string, maplibregl.Marker>` ref to track live marker instances
- On `markers` array change:
  - Add `maplibregl.Marker` for any new marker id (use a custom HTML element as marker)
  - Remove markers for any id no longer in state
  - Do not recreate markers that already exist
- Each marker element:
  - Styled as a circle (CSS)
  - Right-click triggers `deleteMarker(id)`
  - Shows a tooltip or label with coordinates on hover (optional)
- The first marker (`markers[0]`) should have a distinct style (e.g. different color) to indicate it is the "close" target
- Wire drag events to update state via a callback passed from `useZoneEditor`

---

## Component: `ZoneControls.tsx`

- Floating UI panel, positioned top-right over the map using absolute positioning
- Renders the following buttons:
  - **Close Zone** — disabled if `isClosed` or `markerCount < 3`
  - **Undo** — disabled if `markerCount === 0`
  - **Clear** — always enabled if `markerCount > 0`
- Also displays a status message:
  - 0 markers: "Click the map to place your first point"
  - 1–2 markers: "Add at least 3 points to create a zone"
  - 3+ markers, not closed: "Click the first point or press Close Zone to finish"
  - Closed: "Zone created! Click an edge to add a point, or drag points to reshape"

---

## Styling Notes

- Map container must have an explicit `width` and `height` (e.g. `100vw` / `100vh`)
- Import `maplibre-gl/dist/maplibre-gl.css` in `App.tsx` or `main.tsx`
- Zone fill layer: `fill-color: '#3b82f6'`, `fill-opacity: 0.2`
- Zone line layer: `line-color: '#2563eb'`, `line-width: 2`
- Marker element: `width: 14px`, `height: 14px`, `border-radius: 50%`, `background: #2563eb`, `border: 2px solid white`, `cursor: grab`
- First marker element: `background: #ef4444` (red) to signal it closes the loop

---

## Behavior Summary

| Action | Condition | Result |
|---|---|---|
| Click map | Zone open | Add new marker |
| Click first marker | 3+ markers, zone open | Close zone |
| Click edge line | Zone closed | Insert point on segment |
| Drag marker | Any | Update marker position live |
| Right-click marker | Any | Delete marker |
| Undo button | Markers exist | Remove last marker |
| Clear button | Markers exist | Reset all state |

---

## Notes for Code Generation

- Use **functional components** with hooks throughout — no class components
- Use **TypeScript** strictly — no `any` types
- All MapLibre imperative code (source/layer setup, event listeners) must live inside `useEffect` with proper cleanup (`map.off(...)`, `marker.remove()`)
- Do not store the MapLibre `Map` instance in React `useState` — use `useRef` to avoid triggering re-renders
- Use `uuid` (`import { v4 as uuidv4 } from 'uuid'`) for all marker IDs
- Assume the project was bootstrapped with **Vite + React + TypeScript**

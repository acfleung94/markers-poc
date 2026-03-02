export interface MarkerPoint {
  id: string;
  lng: number;
  lat: number;
}

export interface Zone {
  id: string;
  markers: MarkerPoint[];
  isClosed: boolean;
}

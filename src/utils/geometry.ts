import nearestPointOnLine from '@turf/nearest-point-on-line';
import distance from '@turf/distance';
import { lineString, point } from '@turf/helpers';
import type { MarkerPoint } from '../types/zone';

export function findClosestSegmentIndex(
  markers: MarkerPoint[],
  clickCoord: [number, number],
): number {
  let bestIndex = 0;
  let bestDist = Infinity;

  for (let i = 0; i < markers.length - 1; i++) {
    const segment = lineString([
      [markers[i].lng, markers[i].lat],
      [markers[i + 1].lng, markers[i + 1].lat],
    ]);
    const clicked = point(clickCoord);
    const nearest = nearestPointOnLine(segment, clicked, { units: 'meters' });
    const dist = nearest.properties.dist ?? Infinity;

    if (dist < bestDist) {
      bestDist = dist;
      bestIndex = i;
    }
  }

  return bestIndex;
}

export function distanceBetween(
  a: [number, number],
  b: [number, number],
): number {
  return distance(point(a), point(b), { units: 'meters' });
}

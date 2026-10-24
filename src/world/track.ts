import * as THREE from 'three';

const EYE = 2.2; // camera height above the rail
const SPACING = 40; // track units between stations

// One gently curving line across Japan: 13 stations, a control point every station plus one past the end.
export const TRACK_POINTS: [number, number, number][] = Array.from({ length: 14 }, (_, i) => [
  i * SPACING,
  0,
  Math.sin(i * 0.9) * 14 + Math.sin(i * 0.37) * 9,
]);

const curve = new THREE.CatmullRomCurve3(TRACK_POINTS.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
// Stations are spaced by arc length; the last station sits at the end of the line.
const STATION_COUNT = 13;

export const trackCurve = curve;

export function stationT(i: number): number {
  return Math.min(1, Math.max(0, i / (STATION_COUNT - 1)));
}

export function trackFrame(t: number): { pos: THREE.Vector3; look: THREE.Vector3 } {
  const p = curve.getPointAt(t);
  const pos = new THREE.Vector3(p.x, p.y + EYE, p.z);
  const look = pos.clone().add(curve.getTangentAt(t).multiplyScalar(10));
  return { pos, look };
}

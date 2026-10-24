import * as THREE from 'three';
import { torii } from './kit';
import { stationT, trackCurve } from './track';

/** Builds a district beside the track: `at` is the station's point on the rail, `along` the direction of travel. */
export type District = (at: THREE.Vector3, along: THREE.Vector3) => THREE.Group;

const placeholder: District = () => {
  const g = new THREE.Group();
  const t = torii();
  t.position.set(0, 0, -8);
  g.add(t);
  return g;
};

export const DISTRICTS: Record<string, District> = {
  departure: placeholder,
  torii: placeholder,
  bento: placeholder,
  ganguro: placeholder,
  sumo: placeholder,
  idol: placeholder,
  konbini: placeholder,
  gacha: placeholder,
  weather: placeholder,
  fuji: placeholder,
  shinkansen: placeholder,
  omikuji: placeholder,
  kanji: placeholder,
};

/** Keep only the districts around the camera alive: the current station and its neighbours. */
export function createDistrictWindow(scene: THREE.Scene, stationIds: string[]) {
  const live = new Map<number, THREE.Group>();

  const build = (i: number) => {
    const t = stationT(i);
    const p = trackCurve.getPointAt(t);
    const along = trackCurve.getTangentAt(t);
    const g = DISTRICTS[stationIds[i]](p, along);
    // Districts are authored in a local frame (x = along the track, z = away from it); place them on the rail.
    g.position.copy(p);
    g.rotation.y = Math.atan2(-along.z, along.x);
    g.userData.district = i;
    scene.add(g);
    live.set(i, g);
  };

  const release = (i: number) => {
    // Shared kit geometry/materials stay cached; only per-district instance buffers are freed.
    const g = live.get(i)!;
    g.traverse((o) => o instanceof THREE.InstancedMesh && o.dispose());
    scene.remove(g);
    live.delete(i);
  };

  return {
    focus(i: number) {
      const want = new Set([i - 1, i, i + 1].filter((n) => n >= 0 && n < stationIds.length));
      for (const n of [...live.keys()]) if (!want.has(n)) release(n);
      for (const n of want) if (!live.has(n)) build(n);
    },
    dispose() {
      for (const n of [...live.keys()]) release(n);
    },
    get built() {
      return [...live.keys()].sort((a, b) => a - b);
    },
  };
}

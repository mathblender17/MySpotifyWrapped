import * as THREE from 'three';
import { at, box, building, cone, cylinder, instanced, lantern, plane, sign, sphere, torii, tree } from './kit';
import { stationT, trackCurve } from './track';

/**
 * Builds a district beside the track, in a local frame: x runs along the track (the camera arrives at x = 0 looking
 * towards +x), y is up, z is across (scenery at |z| ≥ 4 so the train has room). The window places it on the rail.
 */
export type District = (at: THREE.Vector3, along: THREE.Vector3) => THREE.Group;

const LEN = 44; // each district covers x ∈ [-22, 22]

function base(ground: string): THREE.Group {
  const g = new THREE.Group();
  const floor = plane(LEN, 160, ground);
  floor.position.y = -0.02;
  const ballast = plane(LEN, 3, '#6b6259');
  const sleepers = instanced(box(0.3, 0.12, 2.6, '#4a3b2c'), Array.from({ length: 44 }, (_, i) => at(-22 + i, 0.06, 0)));
  const railL = box(LEN, 0.15, 0.12, '#b8b8c0');
  const railR = railL.clone();
  railL.position.set(0, 0.18, -0.7);
  railR.position.set(0, 0.18, 0.7);
  g.add(floor, ballast, sleepers, railL, railR);
  return g;
}

const put = <T extends THREE.Object3D>(g: THREE.Object3D, o: T, x: number, y: number, z: number, ry = 0): T => {
  o.position.set(x, y, z);
  o.rotation.y = ry;
  g.add(o);
  return o;
};

const departure: District = () => {
  const g = base('#cfc8bd');
  put(g, box(36, 1, 5, '#9a9a9f'), 0, 0.5, -4);
  put(g, box(30, 0.3, 6, '#2c3e50'), 2, 4.6, -4.5);
  g.add(instanced(cylinder(0.12, 0.12, 4, '#7f8c8d'), [-10, -4, 2, 8, 14].map((x) => at(x, 3, -2.2))));
  put(g, box(30, 0.1, 0.25, '#2db34a'), 2, 1.02, -1.6); // line-colour stripe on the platform edge
  put(g, sign(5, 1.2, '#ff9a1f'), 16, 3.9, -2.4); // LED departure board, down the platform
  put(g, box(5.2, 1.4, 0.2, '#111111'), 16, 3.9, -2.55);
  for (const [x, c] of [[-6, '#d8261c'], [-4.6, '#2a7de1'], [-3.2, '#f5f5f5']] as const) {
    put(g, box(1.2, 2, 0.9, c), x, 2, -6);
    put(g, box(1, 1.2, 0.05, '#e8f4ff', true), x, 2.2, -5.52);
  }
  g.add(instanced(building(6, 10, 6, '#c9c3d6', '#fff7c2').children[0] as THREE.Mesh, [at(-14, 5, 14), at(2, 7, 18, 0.2, 1.4), at(18, 5, 13)]));
  return g;
};

const toriiTunnel: District = () => {
  const g = base('#5b7c4a');
  // 60 gates over the rail: one draw call per part.
  const parts = torii('#e8461c', 1.15).children as THREE.Mesh[];
  for (const p of parts) {
    g.add(instanced(p, Array.from({ length: 60 }, (_, i) => {
      const m = at(-20 + i * 0.7, 0, 0);
      // Turn each gate to face the train: rotate the part's offset too, so the posts land beside the rail, not on it.
      const up = new THREE.Vector3(0, 1, 0);
      const offset = p.position.clone().multiplyScalar(1.15).applyAxisAngle(up, Math.PI / 2);
      return m.multiply(new THREE.Matrix4().compose(offset, new THREE.Quaternion().setFromAxisAngle(up, Math.PI / 2), new THREE.Vector3(1.15, 1.15, 1.15)));
    })));
  }
  for (const [x, z, s] of [[-12, -30, 1], [8, -40, 1.4], [20, 34, 1.2], [-4, 38, 0.9]] as const) put(g, cone(14 * s, 16 * s, '#4f7a45'), x, 0, z);
  return g;
};

const bento: District = () => {
  const g = base('#3a2a1a');
  const shop = put(g, building(10, 5, 8, '#c0392b'), 8, 0, -10);
  put(shop, box(10.4, 0.8, 8.4, '#fdf6e3'), 0, 5.3, 0); // white "rice" roof
  for (let i = 0; i < 4; i++) put(g, sign(1.4, 2.2, i % 2 ? '#1d3a6e' : '#ffffff'), 4.6 + i * 1.6, 2.2, -5.9);
  put(g, lantern('#ff3b2f'), 3, 3.4, -5.5);
  put(g, lantern('#ff3b2f'), 13, 3.4, -5.5);
  g.add(instanced(building(5, 6, 5, '#7a5a40').children[0] as THREE.Mesh, [at(-8, 3, -9), at(-14, 3, 9), at(16, 3, 10)]));
  return g;
};

const ganguro: District = () => {
  const g = base('#2a2a33');
  const neon = ['#ff2d95', '#3cf6ff', '#ffe600', '#7a5cff'];
  for (let i = 0; i < 8; i++) {
    const side = i % 2 ? 1 : -1;
    const h = 14 + ((i * 7) % 12);
    const b = put(g, building(7, h, 7, '#3b3b48', '#ffd7f0'), -16 + i * 4.5, 0, side * 11);
    put(b, sign(2, 5, neon[i % 4]), side * -3.6 > 0 ? 3.6 : -3.6, h * 0.6, side * -3.6);
  }
  // Scramble crossing stripes beside the rail.
  g.add(instanced(plane(1, 6, '#f2f2f2'), Array.from({ length: 10 }, (_, i) => at(4 + i * 1.6, 0.02, -7))));
  return g;
};

const sumo: District = () => {
  const g = base('#d9c39a');
  put(g, cylinder(6, 6.4, 0.8, '#e8d5a8', 16), 10, 0.4, -12); // dohyō
  put(g, box(14, 0.6, 14, '#5a3a22'), 10, 9, -12); // tsuriyane roof
  put(g, cone(9, 3, '#3d2a1a'), 10, 9.3, -12);
  for (const [dx, dz, c] of [[-6, -6, '#2a7de1'], [6, -6, '#d0021b'], [-6, 6, '#3fbf6a'], [6, 6, '#fafafa']] as const) {
    put(g, cylinder(0.25, 0.25, 4, c, 6), 10 + dx, 6.5, -12 + dz); // hanging tassels
  }
  g.add(instanced(box(1, 2.4, 1, '#8b5a2b'), Array.from({ length: 12 }, (_, i) => at(-14 + i * 3, 1.2, 9))));
  return g;
};

const idol: District = () => {
  const g = base('#141018');
  put(g, box(18, 1.2, 9, '#222233'), 10, 0.6, -12); // stage
  for (const x of [1.5, 18.5]) put(g, box(0.6, 10, 0.6, '#555566'), x, 5, -15);
  put(g, box(18, 0.6, 0.6, '#555566'), 10, 10, -15);
  const pens = ['#ff2d95', '#ffe600', '#3cf6ff', '#7a5cff', '#58ff7a'];
  for (let c = 0; c < pens.length; c++) {
    g.add(instanced(cylinder(0.06, 0.06, 0.9, pens[c], 5, true), Array.from({ length: 40 }, (_, i) => {
      const n = i * pens.length + c;
      return at(-6 + (n % 25) * 1.1, 1.3, -4.5 - Math.floor(n / 25) * 1.2);
    })));
  }
  for (const x of [4, 10, 16]) {
    const beam = put(g, new THREE.Mesh(new THREE.ConeGeometry(2.5, 10, 12, 1, true), new THREE.MeshBasicMaterial({ color: '#fff3c4', transparent: true, opacity: 0.18, depthWrite: false })), x, 6, -12);
    beam.userData.ownsGeometry = true;
  }
  return g;
};

const konbini: District = () => {
  const g = base('#24242c');
  const store = put(g, building(12, 4.5, 8, '#f4f4f4'), 10, 0, -10);
  put(store, box(12.1, 0.5, 8.1, '#2e8b57'), 0, 3.4, 0);
  put(store, box(12.1, 0.3, 8.1, '#ff8a00'), 0, 3, 0);
  put(store, box(10, 2.4, 0.1, '#eaffea', true), 0, 1.5, 4.06); // bright glass front
  put(g, cylinder(0.1, 0.1, 6, '#777777'), -2, 3, -5);
  put(g, sphere(0.5, '#fff2c4', true), -2, 6.2, -5);
  g.add(instanced(building(6, 7, 6, '#3a3a44', '#ffe9a8').children[0] as THREE.Mesh, [at(-12, 3.5, -10), at(-4, 3.5, 11), at(18, 3.5, 12)]));
  return g;
};

const gacha: District = () => {
  const g = base('#1b0d2e');
  put(g, building(16, 6, 9, '#2a1650'), 10, 0, -12);
  const colors = ['#ff5d8f', '#5dc8ff', '#ffd23f', '#9b5cff', '#58ff7a'];
  for (let i = 0; i < 10; i++) {
    const x = 3 + i * 1.6;
    put(g, box(1.2, 1.6, 1, '#e63946'), x, 0.8, -6.5);
    put(g, sphere(0.55, colors[i % 5]), x, 2, -6.5);
  }
  put(g, sign(10, 1.6, '#ff2d95'), 10, 6.8, -7.4);
  put(g, sign(4, 1.2, '#3cf6ff'), -6, 4, -6);
  return g;
};

const weather: District = () => {
  const g = base('#7fb069');
  g.add(instanced(plane(9, 9, '#9ccc65'), Array.from({ length: 8 }, (_, i) => at(-18 + (i % 4) * 10, 0.01, (i < 4 ? -1 : 1) * 10))));
  for (const [x, z, r] of [[-10, -40, 22], [14, -50, 28], [0, 45, 24]] as const) put(g, sphere(r, '#6a9a4f'), x, -r * 0.7, z);
  // TV tower lattice
  for (const y of [0, 6, 12, 18]) put(g, box(2 - y * 0.08, 0.3, 2 - y * 0.08, '#d0021b'), 16, y + 2, -18);
  put(g, cylinder(0.15, 0.6, 22, '#d0021b', 4), 16, 11, -18);
  put(g, cylinder(0.05, 0.15, 6, '#ffffff', 4), 16, 25, -18);
  return g;
};

const fuji: District = () => {
  const g = base('#6fa36a');
  put(g, cone(70, 60, '#3a5a9a', '#ffffff'), 140, -2, -70); // on the horizon, visible from the neighbouring stations too
  put(g, plane(60, 30, '#5aa0d8'), 30, 0.01, -26); // lake
  for (const [x, z] of [[-8, -8], [-3, -10], [4, -9], [12, 9], [16, 8], [-12, 10]] as const) put(g, tree(), x, 0, z);
  return g;
};

const shinkansen: District = () => {
  const g = base('#8fa3ad');
  // The rail runs on an elevated viaduct here: deck, piers and catenary poles.
  put(g, box(LEN, 0.8, 4.4, '#c4c9cc'), 0, -0.45, 0);
  g.add(instanced(box(1.2, 8, 1.6, '#aab1b5'), Array.from({ length: 6 }, (_, i) => at(-20 + i * 8, -4.8, 0))));
  g.add(instanced(cylinder(0.1, 0.1, 5, '#555555', 5), Array.from({ length: 6 }, (_, i) => at(-20 + i * 8, 2.5, -2.4))));
  put(g, box(LEN, 0.04, 0.04, '#333333'), 0, 4.8, -1.4);
  g.add(instanced(building(5, 4, 5, '#d8d2c6', '#ffffff').children[0] as THREE.Mesh, Array.from({ length: 8 }, (_, i) => at(-18 + i * 5, -6, (i % 2 ? 1 : -1) * 14))));
  return g;
};

const omikuji: District = () => {
  const g = base('#e6e3dc');
  put(g, torii('#d0021b', 1.3), 6, 0, -7, Math.PI / 2);
  const hall = put(g, building(10, 4, 7, '#7a2a1a'), 16, 0, -12);
  put(hall, cone(8, 3, '#2d2d2d'), 0, 4, 0);
  put(g, box(4, 1.6, 0.3, '#c69c6d'), 9, 1.6, -5.5); // ema rack
  for (const x of [3, 9]) {
    put(g, cylinder(0.4, 0.5, 1.6, '#9a9a9a', 6), x, 0.8, -4.5);
    put(g, box(1.1, 0.6, 1.1, '#9a9a9a'), x, 1.9, -4.5);
  }
  return g;
};

const kanji: District = () => {
  const g = base('#f2f4f8'); // snow
  const tower = put(g, box(6, 6, 6, '#4a2a1a'), 12, 3, -12);
  put(tower, cone(6, 3, '#2a2a2a'), 0, 3, 0);
  put(g, cylinder(1.2, 1.4, 2.6, '#6b4f2a', 12), 12, 4.2, -12); // bonshō
  g.add(instanced((lantern('#ffb347').children[0] as THREE.Mesh), Array.from({ length: 108 }, (_, i) => at(-20 + (i % 36) * 1.2, 0.4, (i < 36 ? -4 : i < 72 ? 4 : -6.5)))));
  for (const [x, z] of [[-10, -10], [0, 10], [18, 9]] as const) put(g, cone(1.6, 5, '#2f4f3a', '#ffffff'), x, 0, z);
  return g;
};

export const DISTRICTS: Record<string, District> = {
  departure,
  torii: toriiTunnel,
  bento,
  ganguro,
  sumo,
  idol,
  konbini,
  gacha,
  weather,
  fuji,
  shinkansen,
  omikuji,
  kanji,
};

/** Keep only the districts around the camera alive: the current station and its neighbours. */
export function createDistrictWindow(scene: THREE.Scene, stationIds: string[]) {
  const live = new Map<number, THREE.Group>();

  const build = (i: number) => {
    const t = stationT(i);
    const p = trackCurve.getPointAt(t);
    const along = trackCurve.getTangentAt(t);
    const g = DISTRICTS[stationIds[i]](p, along);
    // Districts are authored in a local frame (x = along the track, z = across); place them on the rail.
    g.position.copy(p);
    g.rotation.y = Math.atan2(-along.z, along.x);
    g.userData.district = i;
    scene.add(g);
    live.set(i, g);
  };

  const release = (i: number) => {
    // Shared kit geometry/materials stay cached; only per-district buffers are freed.
    const g = live.get(i)!;
    g.traverse((o) => {
      if (o instanceof THREE.InstancedMesh) o.dispose();
      else if (o.userData.ownsGeometry) {
        const m = o as THREE.Mesh;
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      }
    });
    scene.remove(g);
    live.delete(i);
  };

  return {
    /** Keep i and its neighbours; `also` keeps one more alive (the district a ride is leaving). */
    focus(i: number, also?: number) {
      const want = new Set([i - 1, i, i + 1, ...(also === undefined ? [] : [also])].filter((n) => n >= 0 && n < stationIds.length));
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

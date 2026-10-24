import * as THREE from 'three';

// Low-poly building blocks. Geometries and materials are shared (cached) across every district, so building a
// district is cheap and releasing one never touches shared GPU resources; disposeKit() frees them with the world.
const geos = new Map<string, THREE.BufferGeometry>();
const mats = new Map<string, THREE.Material>();

const geo = <T extends THREE.BufferGeometry>(key: string, make: () => T): T => {
  let g = geos.get(key) as T | undefined;
  if (!g) geos.set(key, (g = make()));
  return g;
};

export const mat = (color: string, emissive = false): THREE.Material => {
  const key = `${color}${emissive ? '*' : ''}`;
  let m = mats.get(key);
  if (!m) {
    m = emissive
      ? new THREE.MeshBasicMaterial({ color, fog: true })
      : new THREE.MeshLambertMaterial({ color, flatShading: true });
    mats.set(key, m);
  }
  return m;
};

export const box = (w: number, h: number, d: number, color: string, emissive = false) =>
  new THREE.Mesh(geo(`box${w}:${h}:${d}`, () => new THREE.BoxGeometry(w, h, d)), mat(color, emissive));

export const cylinder = (rTop: number, rBot: number, h: number, color: string, seg = 8, emissive = false) =>
  new THREE.Mesh(geo(`cyl${rTop}:${rBot}:${h}:${seg}`, () => new THREE.CylinderGeometry(rTop, rBot, h, seg)), mat(color, emissive));

export const sphere = (r: number, color: string, emissive = false) =>
  new THREE.Mesh(geo(`sph${r}`, () => new THREE.IcosahedronGeometry(r, 1)), mat(color, emissive));

export const plane = (w: number, d: number, color: string, emissive = false) => {
  const m = new THREE.Mesh(geo(`pl${w}:${d}`, () => new THREE.PlaneGeometry(w, d)), mat(color, emissive));
  m.rotation.x = -Math.PI / 2;
  return m;
};

/** A vertical sign/quad facing +z. */
export const sign = (w: number, h: number, color: string) => {
  const m = new THREE.Mesh(geo(`sg${w}:${h}`, () => new THREE.PlaneGeometry(w, h)), mat(color, true));
  (m.material as THREE.MeshBasicMaterial).side = THREE.DoubleSide;
  return m;
};

export function torii(color = '#e8461c', scale = 1): THREE.Group {
  const g = new THREE.Group();
  const post = (x: number) => {
    const p = cylinder(0.25, 0.3, 5, color);
    p.position.set(x, 2.5, 0);
    return p;
  };
  const kasagi = box(7, 0.5, 0.6, '#222222');
  kasagi.position.y = 5.2;
  const nuki = box(6, 0.3, 0.4, color);
  nuki.position.y = 4.2;
  g.add(post(-2.6), post(2.6), kasagi, nuki);
  g.scale.setScalar(scale);
  return g;
}

export function building(w: number, h: number, d: number, color: string, windows?: string): THREE.Group {
  const g = new THREE.Group();
  const body = box(w, h, d, color);
  body.position.y = h / 2;
  g.add(body);
  if (windows) {
    for (let y = 1.5; y < h - 0.5; y += 2) {
      const strip = box(w * 0.85, 0.5, 0.05, windows, true);
      strip.position.set(0, y, d / 2 + 0.03);
      g.add(strip);
    }
  }
  return g;
}

export function lantern(color = '#ff3b2f'): THREE.Group {
  const g = new THREE.Group();
  const body = cylinder(0.35, 0.35, 0.7, color, 8, true);
  const cap = cylinder(0.2, 0.2, 0.1, '#222222');
  cap.position.y = 0.4;
  g.add(body, cap);
  return g;
}

export function cone(r: number, h: number, color: string, cap?: string): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(geo(`cone${r}:${h}`, () => new THREE.ConeGeometry(r, h, 12)), mat(color));
  body.position.y = h / 2;
  g.add(body);
  if (cap) {
    const top = new THREE.Mesh(geo(`cone${r * 0.3}:${h * 0.3}`, () => new THREE.ConeGeometry(r * 0.3, h * 0.3, 12)), mat(cap));
    top.position.y = h * 0.85 + 0.05;
    g.add(top);
  }
  return g;
}

export function tree(blossom = '#ffb7d5'): THREE.Group {
  const g = new THREE.Group();
  const trunk = cylinder(0.15, 0.2, 2, '#5b3a29', 6);
  trunk.position.y = 1;
  const crown = sphere(1.3, blossom);
  crown.position.y = 2.6;
  g.add(trunk, crown);
  return g;
}

/** One draw call for many copies of the same mesh. */
export function instanced(mesh: THREE.Mesh, transforms: THREE.Matrix4[]): THREE.InstancedMesh {
  const im = new THREE.InstancedMesh(mesh.geometry, mesh.material, transforms.length);
  transforms.forEach((m, i) => im.setMatrixAt(i, m));
  im.instanceMatrix.needsUpdate = true;
  return im;
}

export const at = (x: number, y: number, z: number, ry = 0, s = 1) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry), new THREE.Vector3(s, s, s));

export function disposeKit() {
  for (const g of geos.values()) g.dispose();
  for (const m of mats.values()) m.dispose();
  geos.clear();
  mats.clear();
}

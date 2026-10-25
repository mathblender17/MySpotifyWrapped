import { expect, test } from 'vitest';
import * as THREE from 'three';
import { createTrack } from '../../src/world/rails';
import { DISTRICTS } from '../../src/world/districts';
import { trackCurve } from '../../src/world/track';

const centre = trackCurve.getSpacedPoints(4000);
/** Horizontal distance from a point to the track's centre line. */
const offCentre = (p: THREE.Vector3) => Math.min(...centre.map((c) => Math.hypot(c.x - p.x, c.z - p.z)));

test('both rails follow the curve, 0.7 either side of the centre line, the whole way', () => {
  const { group } = createTrack();
  for (const name of ['rail-l', 'rail-r']) {
    const pos = (group.getObjectByName(name) as THREE.Mesh).geometry.getAttribute('position');
    for (let i = 0; i < pos.count; i += 97) {
      const d = offCentre(new THREE.Vector3().fromBufferAttribute(pos, i));
      expect(d).toBeGreaterThan(0.55);
      expect(d).toBeLessThan(0.85);
    }
  }
});

test('sleepers sit on the curve about every unit, turned with it', () => {
  const { group } = createTrack();
  const sleepers = group.getObjectByName('sleepers') as THREE.InstancedMesh;
  expect(Math.abs(sleepers.count - trackCurve.getLength())).toBeLessThan(2);
  const m = new THREE.Matrix4();
  const p = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  for (let i = 0; i < sleepers.count; i += 37) {
    sleepers.getMatrixAt(i, m);
    m.decompose(p, q, s);
    expect(offCentre(p)).toBeLessThan(0.08); // the centre line is sampled every ~0.13 units
    // A sleeper lies across the track: its local x runs along the rail.
    const along = new THREE.Vector3(1, 0, 0).applyQuaternion(q);
    const t = i / (sleepers.count - 1);
    expect(Math.abs(along.dot(trackCurve.getTangentAt(t)))).toBeGreaterThan(0.98);
  }
});

test('districts no longer draw their own straight rails', () => {
  for (const [id, d] of Object.entries(DISTRICTS)) {
    const g = d(new THREE.Vector3(), new THREE.Vector3(1, 0, 0));
    g.traverse((o) => {
      const geo = (o as THREE.Mesh).geometry as THREE.BoxGeometry | undefined;
      const straightRail = geo?.type === 'BoxGeometry' && geo.parameters.width === 44 && geo.parameters.height === 0.15;
      expect(straightRail, id).toBe(false);
    });
  }
});

import * as THREE from 'three';
import { box, mat } from './kit';
import { trackCurve } from './track';

const GAUGE = 0.7; // each rail's distance from the centre line
const SAMPLES = 600; // points along the line for the rails and ballast

/** Unit vector across the track at t (to the right of travel), level with the ground. */
const across = (t: number) => {
  const a = trackCurve.getTangentAt(t);
  return new THREE.Vector3(-a.z, 0, a.x).normalize();
};

/** A flat strip of `width` following the line at height y. */
function ribbon(width: number, y: number): THREE.BufferGeometry {
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const t = i / SAMPLES;
    const p = trackCurve.getPointAt(t);
    const s = across(t).multiplyScalar(width / 2);
    pos.push(p.x - s.x, y, p.z - s.z, p.x + s.x, y, p.z + s.z);
    if (i) idx.push(2 * i - 2, 2 * i, 2 * i - 1, 2 * i - 1, 2 * i, 2 * i + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** One rail: a thin tube along the line, offset `side` (−1 left, +1 right). */
function rail(side: -1 | 1): THREE.BufferGeometry {
  const pts = Array.from({ length: SAMPLES + 1 }, (_, i) => {
    const t = i / SAMPLES;
    return trackCurve.getPointAt(t).add(across(t).multiplyScalar(side * GAUGE)).setY(0.18);
  });
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), SAMPLES * 2, 0.07, 4, false);
}

/**
 * The whole line's track, laid along the real curve: ballast, sleepers about every unit, and two rails. Districts are
 * straight pieces of scenery, so they no longer carry track; this keeps rails continuous through every bend.
 */
export function createTrack() {
  const group = new THREE.Group();
  group.name = 'track';
  const ballast = new THREE.Mesh(ribbon(3, 0.005), mat('#6b6259'));
  const steel = mat('#b8b8c0');
  const left = Object.assign(new THREE.Mesh(rail(-1), steel), { name: 'rail-l' });
  const right = Object.assign(new THREE.Mesh(rail(1), steel), { name: 'rail-r' });
  const tie = box(0.3, 0.12, 2.6, '#4a3b2c');
  const n = Math.round(trackCurve.getLength());
  const sleepers = new THREE.InstancedMesh(tie.geometry, tie.material, n);
  sleepers.name = 'sleepers';
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const one = new THREE.Vector3(1, 1, 1);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const a = trackCurve.getTangentAt(t);
    q.setFromAxisAngle(up, Math.atan2(-a.z, a.x));
    sleepers.setMatrixAt(i, m.compose(trackCurve.getPointAt(t).setY(0.06), q, one));
  }
  sleepers.instanceMatrix.needsUpdate = true;
  group.add(ballast, sleepers, left, right);
  return {
    group,
    /** Frees the track's own buffers; the shared kit materials and sleeper box go with disposeKit(). */
    dispose() {
      for (const g of [ballast.geometry, left.geometry, right.geometry]) g.dispose();
      sleepers.dispose();
    },
  };
}

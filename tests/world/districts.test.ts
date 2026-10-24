import { expect, test } from 'vitest';
import * as THREE from 'three';
import { createDistrictWindow, DISTRICTS } from '../../src/world/districts';
import { STATIONS } from '../../src/journey/stations';

const ids = STATIONS.map((s) => s.id);
const districtsIn = (scene: THREE.Scene) => scene.children.filter((c) => c.userData.district !== undefined).map((c) => c.userData.district as number).sort((a, b) => a - b);

test('every station has a district', () => {
  expect(Object.keys(DISTRICTS).sort()).toEqual([...ids].sort());
});

test.each(ids)('%s builds a group with something visible in it', (id) => {
  const g = DISTRICTS[id](new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0));
  let meshes = 0;
  g.traverse((o) => (o instanceof THREE.Mesh || o instanceof THREE.InstancedMesh) && meshes++);
  expect(g).toBeInstanceOf(THREE.Group);
  expect(meshes).toBeGreaterThan(0);
});

test('only the stations around the camera exist; the rest are released', () => {
  const scene = new THREE.Scene();
  const w = createDistrictWindow(scene, ids);
  w.focus(5);
  expect(districtsIn(scene)).toEqual([4, 5, 6]);
  w.focus(9);
  expect(districtsIn(scene)).toEqual([8, 9, 10]);
  expect(w.built).toEqual([8, 9, 10]);
  w.focus(0);
  expect(districtsIn(scene)).toEqual([0, 1]);
  w.focus(12);
  expect(districtsIn(scene)).toEqual([11, 12]);
});

test('focusing the same station twice builds nothing new', () => {
  const scene = new THREE.Scene();
  const w = createDistrictWindow(scene, ids);
  w.focus(5);
  const first = scene.children.find((c) => c.userData.district === 5);
  w.focus(5);
  expect(scene.children.find((c) => c.userData.district === 5)).toBe(first);
});

test('dispose removes every district', () => {
  const scene = new THREE.Scene();
  const w = createDistrictWindow(scene, ids);
  w.focus(6);
  w.dispose();
  expect(districtsIn(scene)).toEqual([]);
});

import { expect, test, vi } from 'vitest';
import * as THREE from 'three';
import { createSeasonFx, seasonLook } from '../../src/world/season';

test('the ends of the dial are spring sakura and a New Year night', () => {
  expect(seasonLook(0).particle).toBe('sakura');
  expect(seasonLook(1).sky[0]).toBe('#0d1030');
  expect(seasonLook(1).particle).toBe('snow');
});

test('between seasons the colours blend', () => {
  const expected = new THREE.Color('#f7d9e6').lerp(new THREE.Color('#ffcf8f'), 0.165 / (1 / 3)).getHexString();
  expect(seasonLook(0.165).fog).toBe(`#${expected}`);
});

test('the particle type switches halfway between seasons', () => {
  expect(seasonLook(0.15).particle).toBe('sakura');
  expect(seasonLook(0.2).particle).toBe('haze');
  expect(seasonLook(0.6).particle).toBe('leaf');
});

test('reduced motion: no particles at all', () => {
  const scene = new THREE.Scene();
  createSeasonFx(scene, { reduced: true, count: 600 });
  const points: THREE.Object3D[] = [];
  scene.traverse((o) => o instanceof THREE.Points && points.push(o));
  expect(points).toHaveLength(0);
});

test('with motion: a particle field, which quality can thin out', () => {
  const scene = new THREE.Scene();
  const fx = createSeasonFx(scene, { reduced: false, count: 600 });
  let p: THREE.Points | undefined;
  scene.traverse((o) => o instanceof THREE.Points && (p = o));
  expect(p!.geometry.drawRange.count).toBe(600);
  fx.setCount(300);
  expect(p!.geometry.drawRange.count).toBe(300);
});

test('set() applies fog colour and dispose() releases GPU resources', () => {
  const scene = new THREE.Scene();
  const fx = createSeasonFx(scene, { reduced: false, count: 100 });
  fx.set(1);
  expect((scene.fog as THREE.Fog).color.getHexString()).toBe('141838');
  const spies: ReturnType<typeof vi.fn>[] = [];
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.geometry) spies.push(vi.spyOn(m.geometry, 'dispose') as never);
  });
  fx.dispose();
  expect(spies.length).toBeGreaterThan(0);
  for (const s of spies) expect(s).toHaveBeenCalled();
});

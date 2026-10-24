import * as THREE from 'three';

type Particle = 'sakura' | 'haze' | 'leaf' | 'snow';
type Stop = { sky: [string, string]; fog: string; light: string; particle: Particle };

// Spring departure → summer-night hype → autumn looking back → New Year's night (spec §7; art spec §7: act 2 is night).
const STOPS: Stop[] = [
  { sky: ['#ffd6e8', '#ffeef5'], fog: '#f7d9e6', light: '#fff1f6', particle: 'sakura' },
  { sky: ['#141a4a', '#ff7a8a'], fog: '#2a1f4a', light: '#ffd1e8', particle: 'haze' },
  { sky: ['#b8461f', '#f4a261'], fog: '#c9734a', light: '#ffd7b0', particle: 'leaf' },
  { sky: ['#0d1030', '#1a1f4a'], fog: '#141838', light: '#9fb4ff', particle: 'snow' },
];

const mix = (a: string, b: string, t: number) => `#${new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString()}`;

export function seasonLook(dial: number): Stop {
  const x = Math.min(1, Math.max(0, dial)) * (STOPS.length - 1);
  const i = Math.min(STOPS.length - 2, Math.floor(x));
  const t = x - i;
  const [a, b] = [STOPS[i], STOPS[i + 1]];
  if (t === 0) return a;
  return {
    sky: [mix(a.sky[0], b.sky[0], t), mix(a.sky[1], b.sky[1], t)],
    fog: mix(a.fog, b.fog, t),
    light: mix(a.light, b.light, t),
    particle: t < 0.5 ? a.particle : b.particle,
  };
}

const PARTICLE_LOOK: Record<Particle, { color: string; size: number; fall: number; drift: number }> = {
  sakura: { color: '#ffb7d5', size: 0.35, fall: 1.2, drift: 0.8 },
  haze: { color: '#ffb3d9', size: 0.25, fall: -0.6, drift: 0.3 },
  leaf: { color: '#e8722b', size: 0.4, fall: 1.6, drift: 1.2 },
  snow: { color: '#ffffff', size: 0.3, fall: 1.0, drift: 0.4 },
};

const BOX = 60; // particles live in a box this wide around the camera

/** Sky gradient, fog, light and the drifting particles; everything driven by one 0–1 dial. */
export function createSeasonFx(scene: THREE.Scene, opts: { reduced: boolean; count: number }) {
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { top: { value: new THREE.Color() }, bottom: { value: new THREE.Color() } },
    vertexShader: 'varying float h; void main(){ h = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying float h; void main(){ gl_FragColor = vec4(mix(bottom, top, smoothstep(-0.1, 0.6, h)), 1.0); }',
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(600, 24, 12), skyMat);
  scene.add(sky);
  scene.fog = new THREE.Fog('#ffffff', 40, 260);
  const hemi = new THREE.HemisphereLight('#ffffff', '#555566', 1.1);
  const sun = new THREE.DirectionalLight('#ffffff', 1.2);
  sun.position.set(30, 60, 20);
  scene.add(hemi, sun);

  let points: THREE.Points | undefined;
  let kind: Particle | undefined;
  const velocity = { fall: 0, drift: 0 };
  if (!opts.reduced) {
    const pos = new Float32Array(opts.count * 3);
    for (let i = 0; i < opts.count; i++) {
      // Deterministic scatter (golden-ratio sequence): no randomness needed for drifting weather.
      pos[i * 3] = ((i * 0.618) % 1) * BOX - BOX / 2;
      pos[i * 3 + 1] = ((i * 0.381) % 1) * BOX * 0.6;
      pos[i * 3 + 2] = ((i * 0.786) % 1) * BOX - BOX / 2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setDrawRange(0, opts.count);
    points = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.3, transparent: true, opacity: 0.85, depthWrite: false }));
    points.frustumCulled = false;
    scene.add(points);
  }

  return {
    set(dial: number) {
      const look = seasonLook(dial);
      skyMat.uniforms.top.value.set(look.sky[0]);
      skyMat.uniforms.bottom.value.set(look.sky[1]);
      (scene.fog as THREE.Fog).color.set(look.fog);
      hemi.color.set(look.light);
      sun.color.set(look.light);
      if (points && kind !== look.particle) {
        kind = look.particle;
        const p = PARTICLE_LOOK[kind];
        const m = points.material as THREE.PointsMaterial;
        m.color.set(p.color);
        m.size = p.size;
        velocity.fall = p.fall;
        velocity.drift = p.drift;
      }
    },
    /** Move the weather; `center` keeps the field wrapped around the camera. */
    tick(dt: number, center?: THREE.Vector3) {
      if (!points) return;
      if (center) points.position.set(center.x, 0, center.z);
      const a = points.geometry.getAttribute('position') as THREE.BufferAttribute;
      const n = points.geometry.drawRange.count;
      for (let i = 0; i < n; i++) {
        let y = a.getY(i) - velocity.fall * dt;
        if (y < 0) y += BOX * 0.6;
        if (y > BOX * 0.6) y -= BOX * 0.6;
        a.setY(i, y);
        a.setX(i, a.getX(i) + Math.sin(y * 0.3 + i) * velocity.drift * dt);
      }
      a.needsUpdate = true;
    },
    setCount(n: number) {
      points?.geometry.setDrawRange(0, n);
    },
    dispose() {
      sky.geometry.dispose();
      skyMat.dispose();
      scene.remove(sky, hemi, sun);
      if (points) {
        points.geometry.dispose();
        (points.material as THREE.Material).dispose();
        scene.remove(points);
      }
      scene.fog = null;
    },
  };
}

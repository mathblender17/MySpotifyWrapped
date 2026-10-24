import { gsap } from 'gsap';
import * as THREE from 'three';
import { createDistrictWindow } from './districts';
import { disposeKit } from './kit';
import { createQuality } from './quality';
import { createSeasonFx } from './season';
import { stationT, trackFrame } from './track';

export type World = {
  travel(from: number, to: number, seconds: number): gsap.core.Timeline;
  jump(i: number): void;
  setSeason(dial: number): void;
  pause(): void;
  resume(): void;
  destroy(): void;
  readonly canvas: HTMLCanvasElement;
  readonly camera: THREE.PerspectiveCamera;
  readonly scene: THREE.Scene;
  readonly renderer: THREE.WebGLRenderer;
};

export type WorldOpts = {
  reduced: boolean;
  stationIds?: string[];
  onLost?: () => void;
  makeRenderer?: (canvas: HTMLCanvasElement) => THREE.WebGLRenderer;
};

function defaultRenderer(canvas: HTMLCanvasElement): THREE.WebGLRenderer {
  if (!canvas.getContext('webgl2')) throw new Error('WebGL2 unavailable');
  return new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
}

/** One persistent 3D Japan behind the story. Returns null when WebGL can't start: the flat 2a journey runs instead. */
export function createWorld(container: HTMLElement, opts: WorldOpts): World | null {
  const canvas = document.createElement('canvas');
  canvas.className = 'world-canvas';
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = (opts.makeRenderer ?? defaultRenderer)(canvas);
  } catch {
    return null;
  }
  container.append(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 800);
  const state = { t: 0 };
  const PARTICLES = 600;
  const season = createSeasonFx(scene, { reduced: opts.reduced, count: PARTICLES });
  season.set(0);
  const districts = opts.stationIds ? createDistrictWindow(scene, opts.stationIds) : undefined;
  const clock = new THREE.Clock();
  const quality = createQuality((level) => {
    if (level === 1) season.setCount(PARTICLES / 2);
    else renderer.setPixelRatio(1);
  });
  let running = false;
  let lost = false;
  let destroyed = false;

  const place = () => {
    const { pos, look } = trackFrame(state.t);
    camera.position.copy(pos);
    camera.lookAt(look);
  };

  const size = () => {
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  };

  const loop = () => {
    const dt = clock.getDelta();
    quality.frame(dt * 1000);
    season.tick(Math.min(dt, 0.1), camera.position);
    renderer.render(scene, camera);
  };
  const start = () => {
    if (running || lost || destroyed) return;
    running = true;
    clock.getDelta(); // don't count the paused time as one huge frame
    renderer.setAnimationLoop(loop);
  };
  const stop = () => {
    running = false;
    renderer.setAnimationLoop(null);
  };
  const onVisibility = () => (document.hidden ? stop() : start());
  const onLost = (e: Event) => {
    e.preventDefault();
    if (lost) return;
    lost = true;
    stop();
    opts.onLost?.();
  };

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  size();
  place();
  window.addEventListener('resize', size);
  document.addEventListener('visibilitychange', onVisibility);
  canvas.addEventListener('webglcontextlost', onLost);
  start();

  return {
    travel(from, to, seconds) {
      districts?.focus(to);
      const tl = gsap.timeline({ paused: true });
      if (opts.reduced) {
        state.t = stationT(to);
        place();
        return tl;
      }
      tl.fromTo(state, { t: stationT(from) }, { t: stationT(to), duration: seconds, ease: 'power2.inOut', onUpdate: place });
      return tl;
    },
    jump(i) {
      districts?.focus(i);
      state.t = stationT(i);
      place();
    },
    setSeason: (dial) => season.set(dial),
    pause: stop,
    resume: start,
    destroy() {
      destroyed = true;
      stop();
      window.removeEventListener('resize', size);
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('webglcontextlost', onLost);
      districts?.dispose();
      season.dispose();
      disposeKit();
      renderer.dispose();
      // dispose() frees GPU objects but not the context itself; browsers cap live contexts (~16), and every year
      // pick builds a new world.
      renderer.forceContextLoss?.();
      canvas.remove();
    },
    canvas,
    camera,
    scene,
    renderer,
  };
}

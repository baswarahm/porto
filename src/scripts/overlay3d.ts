/* ==========================================================================
   OVERLAY3D.TS — a fullscreen 3D room that opens over the page (the skill
   tree, the code city). Its own renderer, camera, orbit controls and the
   same bloom + CRT as the world (fx.ts). While it is open the main world
   pauses, the page behind can't scroll, Esc or the close key leaves, and
   focus goes back where it was.
   ========================================================================== */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createFx } from './fx';
import { isDark, quality, reducedMotion, emit } from './env';

export interface Room {
  scene: THREE.Scene; camera: THREE.PerspectiveCamera; controls: OrbitControls; renderer: THREE.WebGLRenderer;
  el: HTMLElement; canvas: HTMLCanvasElement; dark: boolean;
  /** called every frame with seconds since open and the frame's dt */
  onFrame?: (t: number, dt: number) => void;
  close: () => void;
}

export function openRoom(opts: { title: string; sub: string; label: string; legend?: string }): Room {
  const lastFocus = document.activeElement as HTMLElement | null;
  const el = document.createElement('div');
  el.className = 'room'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', opts.label);
  el.innerHTML = `<canvas aria-hidden="true"></canvas>
    <header class="room-bar"><div><p class="room-k">${opts.sub}</p><h2>${opts.title}</h2></div>
      <button type="button" class="key room-x"><span>esc · close</span></button></header>
    ${opts.legend ?? ''}
    <aside class="room-card" hidden aria-live="polite"></aside>
    <p class="room-tip" aria-hidden="true"></p>
    <p class="room-hint">drag to orbit · scroll to zoom · click to inspect</p>`;
  document.body.append(el);
  document.documentElement.classList.add('room-open');
  emit('worldpause', true);
  const canvas = el.querySelector('canvas')!;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, quality === 'low' ? 1 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const dark = isDark();
  const scene = new THREE.Scene();
  const bg = new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue('--paper').trim());
  scene.background = bg; scene.fog = new THREE.Fog(bg, 30, 90);
  const camera = new THREE.PerspectiveCamera(45, 1, .1, 300);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = .07; controls.autoRotate = !reducedMotion; controls.autoRotateSpeed = .5;
  controls.addEventListener('start', () => { controls.autoRotate = false; });
  const fx = createFx(renderer, scene, camera); fx.setTheme(dark); fx.setEnabled(quality === 'high');
  const resize = () => {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); fx.setSize(w, h, renderer.getPixelRatio());
  };
  resize(); addEventListener('resize', resize);

  let alive = true, t0 = performance.now(), prev = t0;
  const room: Room = { scene, camera, controls, renderer, el, canvas, dark, close: () => {} };
  const loop = (now: number) => {
    if (!alive) return;
    requestAnimationFrame(loop);
    const dt = Math.min(.1, (now - prev) / 1000); prev = now;
    controls.update();
    room.onFrame?.((now - t0) / 1000, dt);
    fx.render(now / 1000, dt);
  };
  requestAnimationFrame(loop);

  const close = () => {
    if (!alive) return;
    alive = false;
    removeEventListener('resize', resize); removeEventListener('keydown', onKey, true);
    el.classList.add('out');
    setTimeout(() => { controls.dispose(); renderer.dispose(); el.remove(); }, reducedMotion ? 0 : 350);
    document.documentElement.classList.remove('room-open');
    emit('worldpause', false);
    lastFocus?.focus?.({ preventScroll: true });
  };
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape'){ e.preventDefault(); e.stopPropagation(); close(); } };
  addEventListener('keydown', onKey, true);
  el.querySelector('.room-x')!.addEventListener('click', close);
  setTimeout(() => el.querySelector<HTMLButtonElement>('.room-x')?.focus({ preventScroll: true }), 30);
  room.close = close;
  return room;
}

/** pointer → which of `targets` is under it (for hover tips and clicks) */
export function picker(room: Room, targets: () => THREE.Object3D[]){
  const ray = new THREE.Raycaster(), m = new THREE.Vector2(9, 9);
  room.canvas.addEventListener('pointermove', e => { m.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); });
  room.canvas.addEventListener('pointerleave', () => m.set(9, 9));
  return {
    mouse: m,
    pick(): THREE.Intersection | null {
      if (m.x > 5) return null;
      ray.setFromCamera(m, room.camera);
      return ray.intersectObjects(targets(), false)[0] ?? null;
    },
  };
}

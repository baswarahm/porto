/* ==========================================================================
   WORLD.TS — the one WebGL world behind the whole page (three.js).
     · a drifting particle field and a grid floor fading into the fog
     · the hex firewall with a hologram of me in front of it (top of page);
       cells push toward the cursor, the hologram glitches when you get close
     · scrolling past the dossier shatters the wall and dissolves the
       hologram into the network (network.ts)
     · each section has its own 3D object at its host:
         progress  8 semester pillars       now      4 course satellites
         goals     3 spinning target rings  projects a locked red cube
         journey   my life as a 3D git graph, HEAD riding main
         contact   a beacon sending out rings
     · the camera follows the page: it holds on the section you are reading
       and flies to the next one as it scrolls up
   Sections declare data-stage (which object) and data-side (where their
   text sits, so the scene shifts the other way).
   ========================================================================== */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { cssVar, isDark, reducedMotion, THEME_EVENT, quality, QUALITY_EVENT, WORLD, emit } from './env';
import { createFx } from './fx';
import { HOSTS, createNetwork, readPalette, type Palette } from './network';
import { penangWeather, penangHour, type Weather } from './weather';
import { graph } from '../data/journey-graph';
import { JOURNEY_EVENT } from './journey';

interface WorldData { sems: { state: string; fill: number }[]; courses: number; goals: number[]; skills: { name: string; path: string | null; color: string }[];
  plan?: { state: string; fill: number; courses: { code: string; name: string }[] }[] }
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (t: number) => t * t * (3 - 2 * t);
let seed = 5;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

/* the hologram: me as a black silhouette (like the old opening) with a
   glowing outline, faint scanlines, a moving light band, glitches, and a
   dissolve with a glowing edge */
const HOLO_VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const HOLO_FRAG = `
uniform sampler2D uMap; uniform float uTime, uGlitch, uDissolve; uniform vec3 uTint, uBody; varying vec2 vUv;
float rand(vec2 c){ return fract(sin(dot(c, vec2(12.9898, 78.233))) * 43758.5453); }
void main(){
  vec2 uv = vUv;
  float row = floor(uv.y * 48.0), tick = floor(uTime * 14.0);
  float g = uGlitch * step(.9, rand(vec2(row, tick)));
  uv.x += g * .05 * (rand(vec2(tick, row)) - .5);
  float a = texture2D(uMap, uv).a;
  float e = .007;
  float aN = min(min(texture2D(uMap, uv + vec2(e, 0.)).a, texture2D(uMap, uv - vec2(e, 0.)).a),
                 min(texture2D(uMap, uv + vec2(0., e * .45)).a, texture2D(uMap, uv - vec2(0., e * .45)).a));
  float edge = clamp((a - aN) * 2.6, 0., 1.);
  vec3 col = uBody + uTint * edge * 1.5;
  col += uTint * .06 * step(.55, fract(uv.y * 160.0));
  col += uTint * step(.986, fract(uv.y * 2.5 - uTime * .3)) * .55;
  col += uTint * g * .6;
  float n = rand(floor(vUv * vec2(70., 170.)));
  float keep = step(uDissolve, n);
  col += uTint * keep * (1. - step(uDissolve + .07, n)) * 2.5 * step(.001, uDissolve);
  if (a * keep < .45) discard;
  gl_FragColor = vec4(col, 1.);
  #include <colorspace_fragment>
}`;

export async function initWorld(){
  const canvas = document.getElementById('world') as HTMLCanvasElement | null;
  if (!canvas) return;
  const data: WorldData = JSON.parse(canvas.dataset.world ?? '{"sems":[],"courses":4,"goals":[0,0,0]}');
  const zones = Array.from(document.querySelectorAll<HTMLElement>('.zone[data-stage]'));

  let renderer: THREE.WebGLRenderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); }
  catch { document.documentElement.classList.add('no-gl'); emit(WORLD.ready); return; }
  document.documentElement.classList.add('gl');
  const phone = innerWidth < 640;
  const ratio = () => quality === 'low' ? 1 : Math.min(devicePixelRatio, phone ? 1.5 : 2);
  renderer.setPixelRatio(ratio());
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), .04).texture;
  scene.fog = new THREE.Fog(0, 14, 62);
  const camera = new THREE.PerspectiveCamera(42, 1, .1, 220);
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(-6, 8, 12); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 1.2); rim.position.set(8, -3, -8); scene.add(rim);
  scene.add(new THREE.AmbientLight(0xffffff, .3));
  // bloom + CRT (fx.ts); a glitch spike is skipped when motion is reduced
  const fx = createFx(renderer, scene, camera);
  const kick = (v: number) => { if (!reducedMotion) fx.kick(v); };

  /* ---- background: particle field + grid floor ------------------------------------------------- */
  const N = phone ? 1400 : 3200;
  const pPos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++){ pPos[i * 3] = (rnd() - .5) * 90; pPos[i * 3 + 1] = (rnd() - .4) * 40; pPos[i * 3 + 2] = (rnd() - .55) * 90; }
  const dustMat = new THREE.PointsMaterial({ size: .06, transparent: true, opacity: .75, depthWrite: false });
  const dust = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pPos, 3)), dustMat);
  scene.add(dust);
  const grid = new THREE.GridHelper(220, 110);
  const gridMat = grid.material as THREE.LineBasicMaterial;
  gridMat.vertexColors = false; gridMat.transparent = true; gridMat.opacity = .22; gridMat.depthWrite = false;
  grid.position.y = -7.5; scene.add(grid);

  /* ---- the firewall ---------------------------------------------------------------------------------- */
  const R = .56, DEPTH = .5, WALL_Z = 8;
  const hexGeo = new THREE.CylinderGeometry(R * .95, R * .95, DEPTH, 6); hexGeo.rotateX(Math.PI / 2);
  const hexMat = new THREE.MeshStandardMaterial({ metalness: .7, roughness: .3 });
  const cols = 40, rows = 26, HW = Math.sqrt(3) * R;
  const cells: { base: THREE.Vector3; dir: THREE.Vector3; spin: THREE.Vector3; delay: number; push: number; hit: number }[] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++){
    const x = (c - cols / 2) * HW + (r % 2 ? HW / 2 : 0), y = (r - rows / 2) * R * 1.5;
    const o = V(x, y, 0).normalize();
    cells.push({ base: V(x, y, WALL_Z), push: 0, hit: -1, delay: clamp(Math.hypot(x, y) / 16) * .45 + rnd() * .12,
      dir: V(o.x * (2 + rnd() * 7), o.y * (2 + rnd() * 7) + (rnd() - .5) * 2, 7 + rnd() * 10),
      spin: V((rnd() - .5) * 8, (rnd() - .5) * 8, (rnd() - .5) * 4) });
  }
  const wall = new THREE.InstancedMesh(hexGeo, hexMat, cells.length);
  wall.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(wall);
  const hexA = new THREE.Color(), hexB = new THREE.Color(), tmpC = new THREE.Color();

  /* ---- the hologram of me, on a projector in front of the wall ---------------------------------------- */
  const holoU = { uMap: { value: null as THREE.Texture | null }, uTime: { value: 0 }, uGlitch: { value: .1 }, uDissolve: { value: 0 }, uTint: { value: new THREE.Color() }, uBody: { value: new THREE.Color() } };
  const holo = new THREE.Group(); holo.position.set(0, -2.4, 11.2); scene.add(holo);
  const meTex = await new THREE.TextureLoader().loadAsync('/images/me-cutout.webp').catch(() => null);
  if (meTex){
    meTex.colorSpace = THREE.SRGBColorSpace;
    holoU.uMap.value = meTex;
    const H = 4.4, W = H * (meTex.image.width / meTex.image.height);
    const g = new THREE.PlaneGeometry(W, H); g.translate(0, H / 2, 0);
    holo.add(new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: holoU, vertexShader: HOLO_VERT, fragmentShader: HOLO_FRAG, transparent: true, side: THREE.DoubleSide, toneMapped: false })));
  }
  const beamMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: .07, side: THREE.DoubleSide, depthWrite: false });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.5, 4.8, 48, 1, true), beamMat); beam.position.y = 2.4; holo.add(beam);
  const padMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: .9 });
  const pad = new THREE.Mesh(new THREE.TorusGeometry(1.5, .025, 8, 96), padMat); pad.rotation.x = Math.PI / 2; holo.add(pad);
  const pad2 = new THREE.Mesh(new THREE.TorusGeometry(1.2, .012, 8, 96), padMat); pad2.rotation.x = Math.PI / 2; pad2.position.y = .05; holo.add(pad2);

  /* ---- my stack: logos orbiting the hologram on a tilted ring ------------------------------------------- */
  const stack = new THREE.Group(); stack.position.y = 2.2; stack.rotation.set(.3, 0, -.12); holo.add(stack);
  const spin = new THREE.Group(); stack.add(spin);
  const skills = data.skills ?? [];
  const badge = (sk: WorldData['skills'][number], dark: boolean) => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d')!;
    g.fillStyle = dark ? '#111316' : '#f7f7f2'; g.beginPath(); g.arc(64, 64, 58, 0, Math.PI * 2); g.fill();
    g.lineWidth = 3; g.strokeStyle = dark ? 'rgba(198,255,61,.55)' : 'rgba(63,112,0,.5)'; g.stroke();
    const ink = dark ? '#eef1f3' : '#0b0c0d', col = sk.color.startsWith('var') ? ink : sk.color;
    if (sk.path){ g.save(); g.translate(34, 34); g.scale(60 / 24, 60 / 24); g.fillStyle = col; g.fill(new Path2D(sk.path)); g.restore(); }
    else { g.fillStyle = col; g.font = '600 40px IBM Plex Mono, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(sk.name.split(/\s/).map(w => w[0]).join('').slice(0, 2), 64, 66); }
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    return tex;
  };
  const sprites = skills.map((sk, i) => {
    const a = i / skills.length * Math.PI * 2;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false }));
    sp.position.set(Math.cos(a) * 2.35, 0, Math.sin(a) * 2.35); sp.scale.setScalar(.58);
    sp.userData = { name: sk.name, i };
    spin.add(sp);
    return sp;
  });
  const paintStack = () => { const dark = isDark(); sprites.forEach((sp, i) => { sp.material.map?.dispose(); sp.material.map = badge(skills[i], dark); sp.material.needsUpdate = true; }); };
  const tip = document.getElementById('skillTip');
  let hoverSkill: THREE.Sprite | null = null;

  /* ---- the network ------------------------------------------------------------------------------------- */
  const net = await createNetwork();
  scene.add(net.group);

  /* ---- one 3D object per section, at its host ------------------------------------------------------------ */
  const lime = new THREE.MeshStandardMaterial({ metalness: .2, roughness: .35, emissiveIntensity: .55 });
  const ghost = new THREE.MeshBasicMaterial({ transparent: true, opacity: .14, wireframe: true });
  const lineM = new THREE.LineBasicMaterial({ transparent: true, opacity: .8 });
  const alertLine = new THREE.LineBasicMaterial({ transparent: true, opacity: .9 });
  const props: Record<string, THREE.Group> = {};
  const at = (id: string) => { const g = new THREE.Group(); g.position.fromArray(HOSTS[id]); g.scale.setScalar(.001); scene.add(g); props[id] = g; return g; };

  // progress: a crescent of pillars, one per semester, filled as far as I've got
  const pg = at('progress'); const pillarGeo = new THREE.BoxGeometry(.3, 1, .3); pillarGeo.translate(0, .5, 0);
  data.sems.forEach((s, i) => {
    const a = (i / Math.max(1, data.sems.length - 1) - .5) * 2.2, h = 2.4 * (s.state === 'now' ? Math.max(.08, s.fill) : 1);
    const m = new THREE.Mesh(pillarGeo, s.state === 'future' ? ghost : lime);
    m.position.set(Math.sin(a) * 2.4, -1.4, -Math.cos(a) * 2.4 + 1.2); m.scale.y = h; pg.add(m);
  });
  // now: one satellite per course on its own orbit
  const ng = at('now'); const sats: { m: THREE.Mesh; r: number; sp: number; tilt: number }[] = [];
  const laneMats = [1, 2, 3, 4].map(() => new THREE.MeshStandardMaterial({ metalness: .3, roughness: .3, emissiveIntensity: .6 }));
  for (let i = 0; i < data.courses; i++){
    const r = 1.4 + i * .32, tilt = (i - 1.5) * .35;
    const orbit = new THREE.Mesh(new THREE.TorusGeometry(r, .006, 6, 120), new THREE.MeshBasicMaterial({ transparent: true, opacity: .35, color: 0x888888 }));
    orbit.rotation.set(Math.PI / 2 + tilt, 0, 0); ng.add(orbit);
    const m = new THREE.Mesh(new THREE.BoxGeometry(.2, .2, .2), laneMats[i % 4]); ng.add(m);
    sats.push({ m, r, sp: .5 - i * .08, tilt });
  }
  // goals: three target rings (doing, next, done) with a dot per goal
  const gg = at('targets'); const rings: THREE.Group[] = [];
  data.goals.forEach((n, i) => {
    const ring = new THREE.Group();
    ring.add(new THREE.Mesh(new THREE.TorusGeometry(1.25 + i * .45, .018, 8, 120), i === 0 ? lime : new THREE.MeshStandardMaterial({ color: 0x777777, metalness: .5, roughness: .3 })));
    for (let k = 0; k < n; k++){
      const a = (k / Math.max(1, n)) * Math.PI * 2, rr = 1.25 + i * .45;
      const dot = new THREE.Mesh(new THREE.SphereGeometry(.07, 12, 12), lime); dot.position.set(Math.cos(a) * rr, Math.sin(a) * rr, 0); ring.add(dot);
    }
    gg.add(ring); rings.push(ring);
  });
  // projects: a locked cube, red wireframe around a dark core
  const prg = at('projects');
  const cage = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.9, 1.9, 1.9)), alertLine); prg.add(cage);
  const cage2 = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.2, 1.2, 1.2)), alertLine); prg.add(cage2);
  // journey: my life as a 3D git graph. main (school -> degree) runs up the middle,
  // each experience branch forks off in its own direction and merges back into the degree;
  // HEAD rides main as you scroll the section, small packets run along the branches
  const jg = at('journey'); const globe = new THREE.Group(); jg.add(globe);
  const RY = (i: number) => -2.1 + i * (4.2 / Math.max(1, graph.length - 1));
  const LANE = [V(0, 0, 0), V(1.55, 0, .35), V(-1.15, 0, 1.05), V(.35, 0, -1.5)];
  const nodeAt = (i: number) => LANE[graph[i].lane].clone().setY(RY(i));
  const mainCurve = new THREE.LineCurve3(V(0, RY(0), 0), V(0, RY(graph.length - 1), 0));
  globe.add(new THREE.Mesh(new THREE.TubeGeometry(mainCurve, 8, .045, 10), laneMats[0]));
  const bCurves: { c: THREE.Curve<THREE.Vector3>; o: number; m: THREE.Mesh }[] = [];
  for (let l = 1; l < LANE.length; l++){
    const ids = graph.map((r, i) => r.lane === l ? i : -1).filter(i => i >= 0);
    if (!ids.length) continue;
    const end = graph.length - 1;
    const pts = [V(0, RY(ids[0] - 1) + .2, 0), ...ids.map(nodeAt), LANE[l].clone().multiplyScalar(.55).setY(RY(end) - .35), V(0, RY(end), 0)];
    const c = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    globe.add(new THREE.Mesh(new THREE.TubeGeometry(c, 60, .028, 8), laneMats[l]));
    const m = new THREE.Mesh(new THREE.SphereGeometry(.06, 10, 10), new THREE.MeshBasicMaterial({ color: 0xffffff })); globe.add(m);
    bCurves.push({ c, o: l * .31, m });
  }
  graph.forEach((r, i) => {
    const merge = i === graph.length - 1;
    const d = new THREE.Mesh(merge ? new THREE.OctahedronGeometry(.2) : new THREE.SphereGeometry(.12, 14, 14), laneMats[r.lane]);
    d.position.copy(nodeAt(i)); globe.add(d);
  });
  const headRing = new THREE.Mesh(new THREE.TorusGeometry(.36, .018, 8, 64), lime); headRing.position.copy(nodeAt(graph.length - 1)); globe.add(headRing);
  const flyer = new THREE.Mesh(new THREE.OctahedronGeometry(.13), new THREE.MeshBasicMaterial({ color: 0xffffff })); globe.add(flyer);
  let jHead = 0, jHeadS = 0;
  addEventListener(JOURNEY_EVENT, e => { jHead = (e as CustomEvent<number>).detail; });
  // contact: a beacon sending out rings
  const cg = at('contact'); const pulses: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++){ const p = new THREE.Mesh(new THREE.TorusGeometry(1, .015, 8, 96), new THREE.MeshBasicMaterial({ transparent: true })); cg.add(p); pulses.push(p); }

  /* ---- labels for the hosts (shown over the whole-network views) --------------------------------------------- */
  const labelBox = document.getElementById('worldLabels');
  const labels = Object.keys(HOSTS).map((id, i) => {
    const el = document.createElement('span'); el.className = 'wl' + (id === 'projects' ? ' deny' : '');
    el.innerHTML = `<b>${id === 'you' ? 'baswara' : id === 'targets' ? 'goals' : id}</b>10.0.0.${i + 1}`;
    labelBox?.append(el); return { id, el };
  });

  /* ---- theme ---------------------------------------------------------------------------------------------------- */
  let P: Palette = readPalette();
  const paint = () => {
    const dark = isDark(); P = readPalette();
    scene.background = P.bg; (scene.fog as THREE.Fog).color = P.bg;
    renderer.toneMappingExposure = dark ? 1 : 1.08;
    hexA.set(dark ? '#15181b' : '#d4d6cf'); hexB.copy(P.signal); hexMat.color.set('#ffffff');
    dustMat.color.copy(dark ? P.ink3 : P.ink3); gridMat.color.copy(P.ink3); gridMat.opacity = dark ? .22 : .3;
    holoU.uTint.value.set(dark ? cssVar('--lime') : '#5a9e00'); padMat.color.set(cssVar('--signal'));
    holoU.uBody.value.set(dark ? '#020203' : '#0b0c0d');
    beamMat.color.set(dark ? cssVar('--lime') : '#0b0c0d'); beamMat.opacity = dark ? .06 : .045;
    beamMat.blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending; beamMat.needsUpdate = true;
    paintStack();
    lime.color.set(cssVar('--lime')); lime.emissive.set(cssVar('--lime')); lime.emissiveIntensity = dark ? .55 : .15;
    ghost.color.copy(P.ink3); lineM.color.copy(P.ink); alertLine.color.copy(P.alert);
    laneMats.forEach((m, i) => { m.color.set(cssVar(`--b${i + 1}`)); m.emissive.set(cssVar(`--b${i + 1}`)); });
    pulses.forEach(p => (p.material as THREE.MeshBasicMaterial).color.set(cssVar('--lime')));
    net.paint(P);
    fx.setTheme(dark);
  };
  paint();
  document.documentElement.addEventListener(THEME_EVENT, paint);

  /* ---- layout, input ------------------------------------------------------------------------------------------------- */
  let w = 1, h = 1, tops: number[] = [];
  const measure = () => { tops = zones.map(z => z.getBoundingClientRect().top + scrollY); };
  const resize = () => { w = innerWidth; h = innerHeight; renderer.setSize(w, h, false); fx.setSize(w, h, renderer.getPixelRatio()); camera.aspect = w / h; measure(); };
  resize(); addEventListener('resize', resize); addEventListener('load', measure);
  new ResizeObserver(measure).observe(document.body);
  const mouse = new THREE.Vector2(9, 9), lean = { x: 0, y: 0 };
  addEventListener('pointermove', e => mouse.set(e.clientX / w * 2 - 1, -(e.clientY / h) * 2 + 1), { passive: true });

  /* ---- free-look: drag empty space (mouse) to look around; it springs back when you let go -------------------------- */
  const UI = '.b-win, .wrap > *, a, button, input, textarea, summary, details, label, dialog, .hud, .term-wrap, .tour, .minimap, .fx-pop, .boot';
  let overUi = true, drag: { x: number; y: number; moved: boolean } | null = null, dragged = false;
  const freeLook = { yaw: 0, pitch: 0, ty: 0, tp: 0 };
  addEventListener('pointermove', e => {
    overUi = !!(e.target as Element).closest?.(UI);
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) > 6){ drag.moved = true; document.documentElement.classList.add('looking'); }
    if (drag.moved){ freeLook.ty = clamp(-dx / w * 2.6, -.8, .8); freeLook.tp = clamp(dy / h * 1.6, -.4, .4); }
  }, { passive: true });
  addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || (e.target as Element).closest?.(UI)) return;
    drag = { x: e.clientX, y: e.clientY, moved: false };
  });
  addEventListener('pointerup', () => {
    if (drag?.moved){ dragged = true; setTimeout(() => { dragged = false; }, 0); }
    drag = null; freeLook.ty = 0; freeLook.tp = 0; document.documentElement.classList.remove('looking');
  });

  /* ---- hover a host: it glows and answers like an nmap scan; click flies there ---------------------------------- */
  const hostTip = Object.assign(document.createElement('div'), { className: 'host-tip' }); hostTip.setAttribute('aria-hidden', 'true'); document.body.append(hostTip);
  const HOST_INFO: Record<string, string> = { progress: 'degree progress', now: 'courses this semester', targets: 'goals board', projects: 'locked, coming soon', journey: 'experience & education', contact: 'say hi' };
  let hoverHost = '';
  addEventListener('click', e => {
    if (dragged || !hoverHost || (e.target as Element).closest?.(UI)) return;
    zones.find(z => z.dataset.stage === hoverHost)?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
  });
  const ray = new THREE.Raycaster(), wallPlane = new THREE.Plane(V(0, 0, 1), -(WALL_Z + DEPTH / 2)), hit = V();
  const navLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('.hud-nav a, .m3d-list a'));

  /* ---- break the firewall yourself: click (or tap) the wall around the dossier --------------------------------- */
  const counter = document.getElementById('breachCount');
  let broken = 0;
  addEventListener('click', e => {
    if (dragged || scrollY > h * .05) return;
    if ((e.target as Element).closest('.b-win, a, button, input, summary, label, .hud, .m3d')) return;
    const pt = new THREE.Vector2(e.clientX / w * 2 - 1, -(e.clientY / h) * 2 + 1);
    ray.setFromCamera(pt, camera);
    const hitCell = ray.intersectObject(wall, false)[0];
    if (hitCell?.instanceId === undefined) return;
    const c0 = cells[hitCell.instanceId].base, stamp = performance.now();
    cells.forEach(c => {
      // the struck cell and the ones around it go, a little later the further out they are
      const d = c.base.distanceTo(c0);
      if (c.hit < 0 && d < 1.6){ c.hit = stamp + d * 140; broken++; }
    });
    kick(.35);
    if (counter){
      counter.textContent = broken >= 160 ? `${broken} cells down · the firewall is failing, scroll to finish it`
        : `${broken} / ${cells.length} cells breached`;
      counter.classList.add('on');
    }
  });

  /* ---- radar: a top-down minimap of the network, turning with the camera ----------------------------------------- */
  const radar = document.createElement('canvas');
  radar.className = 'radar'; radar.width = radar.height = 264; radar.setAttribute('aria-hidden', 'true');
  document.body.append(radar);
  const rc = radar.getContext('2d')!;
  const fwd = V();
  const drawRadar = (t: number, active: string) => {
    const S = 264, C = S / 2, Rr = C - 10, scale = Rr / 22;
    rc.clearRect(0, 0, S, S);
    rc.strokeStyle = cssVar('--rule'); rc.lineWidth = 2;
    rc.fillStyle = cssVar('--paper'); rc.globalAlpha = .82;
    rc.beginPath(); rc.arc(C, C, Rr, 0, Math.PI * 2); rc.fill(); rc.globalAlpha = 1; rc.stroke();
    [.33, .66].forEach(f => { rc.beginPath(); rc.arc(C, C, Rr * f, 0, Math.PI * 2); rc.stroke(); });
    rc.beginPath(); rc.moveTo(C - Rr, C); rc.lineTo(C + Rr, C); rc.moveTo(C, C - Rr); rc.lineTo(C, C + Rr); rc.stroke();
    // the sweep
    const a = t * 1.4, lime = P.signal.getStyle();
    const grad = rc.createConicGradient(a, C, C);
    grad.addColorStop(0, 'rgba(198,255,61,.35)'); grad.addColorStop(.12, 'rgba(198,255,61,0)'); grad.addColorStop(1, 'rgba(198,255,61,0)');
    rc.fillStyle = grad; rc.beginPath(); rc.arc(C, C, Rr, 0, Math.PI * 2); rc.fill();
    // hosts, seen from above and turned so the camera always looks up
    camera.getWorldDirection(fwd);
    const head = Math.atan2(fwd.x, -fwd.z);
    for (const [id, p] of Object.entries(HOSTS)){
      const dx = p[0] - camera.position.x, dz = p[2] - camera.position.z;
      const rx = dx * Math.cos(head) + dz * Math.sin(head), rz = -dx * Math.sin(head) + dz * Math.cos(head);
      let px = C + rx * scale, py = C + rz * scale;
      const dist = Math.hypot(px - C, py - C);
      if (dist > Rr - 6){ px = C + (px - C) / dist * (Rr - 6); py = C + (py - C) / dist * (Rr - 6); }
      const on = id === active;
      rc.fillStyle = id === 'projects' ? P.alert.getStyle() : on ? lime : id === 'you' ? P.ink.getStyle() : P.ink3.getStyle();
      rc.beginPath(); rc.arc(px, py, on ? 7 : 4.5, 0, Math.PI * 2); rc.fill();
      if (on){ rc.strokeStyle = lime; rc.lineWidth = 2; rc.beginPath(); rc.arc(px, py, 12 + Math.sin(t * 5) * 2, 0, Math.PI * 2); rc.stroke(); }
    }
    // the camera, at the centre
    rc.fillStyle = P.ink.getStyle();
    rc.beginPath(); rc.moveTo(C, C - 9); rc.lineTo(C - 6, C + 6); rc.lineTo(C + 6, C + 6); rc.closePath(); rc.fill();
  };

  /* ---- the swarm: ~12,000 particles that explode and re-form into each section's object ---------------- */
  const NS = phone ? 4500 : 12000;
  const swarmPos = new Float32Array(NS * 3), scat = new Float32Array(NS * 3), phase = new Float32Array(NS);
  for (let n = 0; n < NS; n++){
    const u = V(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1).normalize().multiplyScalar(2 + rnd() * 4);
    scat[n * 3] = u.x; scat[n * 3 + 1] = u.y; scat[n * 3 + 2] = u.z; phase[n] = rnd() * 6.283;
  }
  const shape = (fn: (n: number, o: THREE.Vector3) => void) => {
    const a = new Float32Array(NS * 3), o = V();
    for (let n = 0; n < NS; n++){ fn(n, o); a[n * 3] = o.x; a[n * 3 + 1] = o.y; a[n * 3 + 2] = o.z; }
    return a;
  };
  const at3 = (id: string) => V(...HOSTS[id]);
  // the silhouette, sampled from the cut-out's alpha
  const sil: number[] = []; const SILH = 4.4; let silW = 1.8;
  if (meTex){
    const img = meTex.image as HTMLImageElement; silW = SILH * img.width / img.height;
    const cw = 90, chh = Math.round(cw * img.height / img.width);
    const c = document.createElement('canvas'); c.width = cw; c.height = chh;
    const g = c.getContext('2d', { willReadFrequently: true })!; g.drawImage(img, 0, 0, cw, chh);
    const d = g.getImageData(0, 0, cw, chh).data;
    for (let yy = 0; yy < chh; yy++) for (let xx = 0; xx < cw; xx++) if (d[(yy * cw + xx) * 4 + 3] > 140) sil.push(xx / cw, yy / chh);
  }
  const silN = sil.length / 2;
  const shapes: Record<string, Float32Array> = {
    hero: shape((_, o) => {
      if (!silN){ o.set(0, 0, 11); return; }
      const q2 = ((rnd() * silN) | 0) * 2;
      o.set((sil[q2] - .5) * silW * 1.1 + (rnd() - .5) * .06, -2.4 + (1 - sil[q2 + 1]) * SILH * 1.03, 11.2 + (rnd() - .5) * .7);
    }),
    network: shape((_, o) => { const r = 3 + Math.pow(rnd(), .55) * 16, a = rnd() * 6.283 + r * .32; o.set(Math.cos(a) * r, (rnd() - .5) * (1.2 + r * .1), Math.sin(a) * r); }),
    progress: shape((n, o) => {
      const p = at3('progress'), cnt = data.sems.length || 8, kk = n % cnt, a = (kk / Math.max(1, cnt - 1) - .5) * 2.2, st = data.sems[kk];
      const hgt = 2.4 * (st?.state === 'now' ? Math.max(.08, st.fill) : 1) * 1.15;
      o.set(p.x + Math.sin(a) * 3.1 + (rnd() - .5) * .5, p.y - 1.4 + rnd() * hgt, p.z - Math.cos(a) * 3.1 + 1.2 + (rnd() - .5) * .5);
    }),
    now: shape((n, o) => {
      const p = at3('now'), kk = n % Math.max(1, data.courses), r = (1.4 + kk * .32) * 1.25 + (rnd() - .5) * .12, tl = (kk - 1.5) * .35, a = rnd() * 6.283;
      o.set(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r * Math.sin(tl), p.z + Math.sin(a) * r * Math.cos(tl));
    }),
    targets: shape((n, o) => { const p = at3('targets'), kk = n % 3, r = (1.25 + kk * .45) * 1.3 + (rnd() - .5) * .1, a = rnd() * 6.283; o.set(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, p.z + (rnd() - .5) * .25); }),
    projects: shape((n, o) => {
      const p = at3('projects'), S = 1.6, f = n % 6, u = (rnd() * 2 - 1) * S, w2 = (rnd() * 2 - 1) * S, sg = f & 1 ? 1 : -1, ax = f >> 1;
      const c3 = ax === 0 ? [sg * S, u, w2] : ax === 1 ? [u, sg * S, w2] : [u, w2, sg * S];
      o.set(p.x + c3[0], p.y + c3[1], p.z + c3[2]);
    }),
    journey: shape((_, o) => { const u = rnd(), a = u * 6.283 * 5 + rnd() * .4, r = 2.25 + (rnd() - .5) * .25; o.set(Math.cos(a) * r, -2.6 + u * 5.2, Math.sin(a) * r).add(at3('journey')); }),
    contact: shape((n, o) => { const p = at3('contact'), kk = n % 5, r = .7 + kk * .62 + (rnd() - .5) * .08, a = rnd() * 6.283; o.set(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, p.z + (rnd() - .5) * .3); }),
    root: shape((_, o) => { o.set(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1).normalize().multiplyScalar(22 + rnd() * 10); }),
  };
  const dotTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d')!, gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.35, 'rgba(255,255,255,.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  const swarmMat = new THREE.PointsMaterial({ size: .07, map: dotTex, transparent: true, depthWrite: false, opacity: .9 });
  const swarmGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(swarmPos, 3));
  const swarm = new THREE.Points(swarmGeo, swarmMat); swarm.frustumCulled = false; scene.add(swarm);
  swarmPos.set(shapes.hero);
  const updateSwarm = (a: string, b: string, kk: number, rt: number) => {
    const A = shapes[a] ?? shapes.network, B = shapes[b] ?? shapes.network;
    const s2 = kk * kk * (3 - 2 * kk), burst = Math.sin(kk * Math.PI) * 3.2 + swarmKick, wob = reducedMotion ? 0 : .045;
    for (let n = 0, j = 0; n < NS; n++, j += 3){
      const ph = phase[n];
      swarmPos[j] = A[j] + (B[j] - A[j]) * s2 + scat[j] * burst + Math.sin(rt * 1.3 + ph) * wob;
      swarmPos[j + 1] = A[j + 1] + (B[j + 1] - A[j + 1]) * s2 + scat[j + 1] * burst + Math.cos(rt * 1.1 + ph) * wob;
      swarmPos[j + 2] = A[j + 2] + (B[j + 2] - A[j + 2]) * s2 + scat[j + 2] * burst;
    }
    swarmGeo.attributes.position.needsUpdate = true;
  };

  /* ---- quality: low skips bloom/CRT, renders at pixel ratio 1 and thins the swarm ------------------------------------ */
  const applyQuality = () => {
    const hi = quality === 'high';
    fx.setEnabled(hi); renderer.setPixelRatio(ratio()); swarmGeo.setDrawRange(0, hi ? NS : Math.round(NS * .4)); resize();
  };
  document.documentElement.addEventListener(QUALITY_EVENT, applyQuality); applyQuality();

  /* ---- shatter (click my name, or `breach`): the network blows apart and the swarm bursts, then both re-form --------- */
  let kickAt = -1e9, swarmKick = 0;
  addEventListener(WORLD.shatter, () => { net.shatter(); kickAt = performance.now(); kick(.8); });
  addEventListener(WORLD.breach, () => { net.shatter(); kickAt = performance.now(); kick(1); });

  /* ---- nmap: a scan sphere sweeps out from the core and every host it passes answers -------------------------------- */
  const scanMat = new THREE.MeshBasicMaterial({ wireframe: true, transparent: true, opacity: 0, depthWrite: false });
  const scan = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 3), scanMat); scan.visible = false; scene.add(scan);
  let scanAt = -1e9; const scanned = new Set<string>();
  addEventListener(WORLD.nmap, () => { scanAt = performance.now(); scanned.clear(); kick(.25); });

  /* ---- x-ray (`x`): everything solid turns to wireframe -------------------------------------------------------------- */
  const wireOrig = new Map<THREE.Material, boolean>(); let xrayOn = false;
  const setXray = (on: boolean) => {
    if (on === xrayOn) return; xrayOn = on;
    scene.traverse(o => {
      const mm = (o as THREE.Mesh).isMesh ? (o as THREE.Mesh).material : null;
      if (!mm) return;
      for (const m of Array.isArray(mm) ? mm : [mm]){
        if (!('wireframe' in m) || m instanceof THREE.ShaderMaterial || !m.visible) continue;
        const wm = m as THREE.MeshBasicMaterial;
        if (!wireOrig.has(m)) wireOrig.set(m, wm.wireframe);
        wm.wireframe = on ? true : wireOrig.get(m)!;
      }
    });
    kick(.4);
  };
  new MutationObserver(() => setXray(document.body.classList.contains('xray'))).observe(document.body, { attributes: true, attributeFilter: ['class'] });

  /* ---- warp speed: rings rush past and lines stretch when the camera travels fast ------------------------------- */
  const warpRings = Array.from({ length: 22 }, () => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(2.4, .025, 6, 72), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
    m.visible = false; scene.add(m); return m;
  });
  scene.add(camera);
  const streakPos = new Float32Array(260 * 6);
  for (let n = 0; n < 260; n++){
    const a = rnd() * 6.283, r = 1.2 + rnd() * 5, z = -2 - rnd() * 30;
    streakPos.set([Math.cos(a) * r, Math.sin(a) * r, z, Math.cos(a) * r, Math.sin(a) * r, z - 1], n * 6);
  }
  const streakMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
  const streaks = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(streakPos, 3)), streakMat);
  streaks.frustumCulled = false; streaks.visible = false; camera.add(streaks);
  const flash = document.createElement('div'); flash.className = 'warp-flash'; flash.setAttribute('aria-hidden', 'true'); document.body.append(flash);
  let warp = 0, warpPeak = false, prevCam: THREE.Vector3 | null = null;
  const fwd2 = V();

  /* ---- root mode: red alert, the firewall rebuilds, hidden nodes appear --------------------------------------------- */
  const secretMat = new THREE.MeshStandardMaterial({ color: 0xff3b30, emissive: 0xff3b30, emissiveIntensity: .9 });
  const secretGroup = new THREE.Group(); secretGroup.visible = false; scene.add(secretGroup);
  const secrets = ([[-11, 5, 8, 'you found me'], [12, -6, 9, 'be happy and chill'], [0, 9.5, -12, 'see you in 2030']] as const).map(([x, y, z, msg]) => {
    const m = new THREE.Mesh(new THREE.OctahedronGeometry(.55, 0), secretMat); m.position.set(x, y, z); secretGroup.add(m);
    const el = document.createElement('span'); el.className = 'wl deny secret'; el.innerHTML = `<b>hidden node</b>${msg}`; labelBox?.append(el);
    return { p: V(x, y, z), el, m };
  });
  let rootOn = false;
  // the new pieces follow the theme (and root mode) like everything else
  const paintExtra = () => {
    const dark = isDark(), lime = cssVar('--lime');
    swarmMat.color.set(dark ? lime : cssVar('--signal'));
    swarmMat.blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending; swarmMat.opacity = dark ? .85 : .7; swarmMat.needsUpdate = true;
    warpRings.forEach(r => { const m = r.material as THREE.MeshBasicMaterial; m.color.set(lime); m.blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending; m.needsUpdate = true; });
    streakMat.color.set(dark ? lime : cssVar('--ink'));
  };
  paintExtra();
  document.documentElement.addEventListener(THEME_EVENT, paintExtra);
  document.documentElement.addEventListener('rootmode', e => {
    rootOn = !!(e as CustomEvent).detail; kick(1);
    secretGroup.visible = rootOn;
    if (rootOn){
      cells.forEach(c => { c.hit = -1; }); broken = 0;
      if (counter){ counter.textContent = 'root mode: the firewall rebuilt itself'; counter.classList.add('on'); }
    }
  });

  /* ---- my degree as rings under the network: one per semester, every course a node; they fill as I go ------------ */
  const plan = data.plan ?? [];
  const degRings = new THREE.Group(); degRings.position.y = -6.2; scene.add(degRings);
  const ringDone = new THREE.LineBasicMaterial({ transparent: true, opacity: .9 });
  const ringGhost = new THREE.LineBasicMaterial({ transparent: true, opacity: .22 });
  const ringArc = (R: number, a0: number, a1: number) => {
    const pts: THREE.Vector3[] = [];
    for (let k = 0; k <= 96; k++){ const a = a0 + (a1 - a0) * k / 96; pts.push(V(Math.cos(a) * R, 0, Math.sin(a) * R)); }
    return new THREE.BufferGeometry().setFromPoints(pts);
  };
  let nowArc: THREE.Line | null = null, arcFill = 0;
  const courseList: { code: string; name: string; state: string; pos: THREE.Vector3 }[] = [];
  plan.forEach((sem, i) => {
    const R = 4.6 + i * 1.55;
    degRings.add(new THREE.Line(ringArc(R, 0, Math.PI * 2), sem.state === 'done' ? ringDone : ringGhost));
    if (sem.state === 'now'){ nowArc = new THREE.Line(ringArc(R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(.02, sem.fill)), ringDone); degRings.add(nowArc); }
    sem.courses.forEach((c, k) => {
      const a = (k + .5) / sem.courses.length * Math.PI * 2 + i * .45;
      courseList.push({ ...c, state: sem.state, pos: V(Math.cos(a) * R, 0, Math.sin(a) * R) });
    });
  });
  const courseMat = new THREE.MeshBasicMaterial({ toneMapped: false });
  const courseMesh = new THREE.InstancedMesh(new THREE.OctahedronGeometry(.17, 0), courseMat, Math.max(1, courseList.length));
  courseMesh.count = courseList.length; degRings.add(courseMesh);
  const ringTip = Object.assign(document.createElement('p'), { className: 'skill-tip' }); ringTip.setAttribute('aria-hidden', 'true'); document.body.append(ringTip);
  let hoverCourse = -1;

  /* ---- live Penang weather: rain when it rains there, storms flash, the light follows Penang's clock ---------------- */
  let wx: Weather | null = null;
  penangWeather().then(x => { wx = x; });
  const RAIN = phone ? 500 : 1400;
  const rainBase = new Float32Array(RAIN * 3), rainPos = new Float32Array(RAIN * 6);
  for (let n = 0; n < RAIN; n++){ rainBase[n * 3] = (rnd() - .5) * 46; rainBase[n * 3 + 1] = rnd() * 30; rainBase[n * 3 + 2] = (rnd() - .5) * 46; }
  const rainMat = new THREE.LineBasicMaterial({ transparent: true, opacity: .35, depthWrite: false });
  const rainGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rain = new THREE.LineSegments(rainGeo, rainMat); rain.frustumCulled = false; rain.visible = false; scene.add(rain);
  const skyTint = new THREE.Color(), dawn = new THREE.Color('#ffb27a'), noon = new THREE.Color('#ffffff'), dusk = new THREE.Color('#ff9a6b'), night = new THREE.Color('#9db0ff');
  let nextStorm = 0;
  const lightForHour = (hr: number) => {
    // night → dawn → day → dusk → night, blended at the edges
    const seg = (a: number, b: number) => clamp((hr - a) / (b - a));
    if (hr < 5) return skyTint.copy(night);
    if (hr < 7) return skyTint.copy(night).lerp(dawn, seg(5, 6)).lerp(noon, seg(6, 7) * .5);
    if (hr < 17) return skyTint.copy(dawn).lerp(noon, seg(7, 9));
    if (hr < 19.5) return skyTint.copy(noon).lerp(dusk, seg(17, 18.5)).lerp(night, seg(18.5, 19.5));
    return skyTint.copy(night);
  };

  const paintMore = () => {
    const dark = isDark(), lime = cssVar('--lime');
    ringDone.color.set(dark ? lime : cssVar('--signal')); ringGhost.color.copy(readPalette().ink3);
    const accent = new THREE.Color(dark ? lime : cssVar('--signal')), ghostC = readPalette().ink3;
    courseList.forEach((c, n) => courseMesh.setColorAt(n, c.state === 'future' ? ghostC : accent));
    if (courseMesh.instanceColor) courseMesh.instanceColor.needsUpdate = true;
    rainMat.color.set(dark ? '#a9c4d6' : '#4f6271'); rainMat.opacity = dark ? .35 : .45;
  };
  paintMore();
  document.documentElement.addEventListener(THEME_EVENT, paintMore);

  /* ---- camera shots --------------------------------------------------------------------------------------------------- */
  const tmp = V(), tmp2 = V(), up = V(0, 1, 0);
  const shot = (i: number, t: number, pos: THREE.Vector3, look: THREE.Vector3) => {
    const st = zones[i]?.dataset.stage ?? 'root';
    if (st === 'hero'){ look.set(0, .2, 10.4); pos.set(0, .5, 19); return; }
    if (st === 'network'){ look.set(0, 0, 0); pos.set(0, 7, 30).applyAxisAngle(up, Math.sin(t * .1) * .25); return; }
    if (st === 'root'){ look.set(0, -.5, 0); pos.set(Math.sin(t * .06) * 33, 11, Math.cos(t * .06) * 33); return; }
    const p = tmp.fromArray(HOSTS[st]);
    look.copy(p);
    const dir = tmp2.copy(p).normalize().add(V(0, .35, 1.15)).normalize().applyAxisAngle(up, reducedMotion ? 0 : Math.sin(t * .15) * .3);
    pos.copy(p).addScaledVector(dir, st === 'progress' ? 9 : 8);
    if (st === 'journey'){ const ride = (jHeadS - .5) * 3.2; look.y += ride; pos.y += ride * .7; }
  };
  const sideOf = (i: number) => { const s = zones[i]?.dataset.side; return s === 'left' ? -1 : s === 'right' ? 1 : 0; };

  /* ---- the loop ----------------------------------------------------------------------------------------------------------- */
  const pa = V(), la = V(), pb = V(), lb = V(), camPos = V(), camLook = V(), v = V(), e3 = new THREE.Euler();
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = V();
  const tmpOff = V(), tmpRight = V();
  let arrived = '', arriveAt = -1e9;
  let cam: THREE.Vector3 | null = null, look: THREE.Vector3 | null = null, side = sideOf(0), lastActive = '', prev = 0;
  const frame = (now: number) => {
    requestAnimationFrame(frame);
    if (document.hidden) return;
    // reduced motion: the decorative spin and drift stand still; scrolling still moves the camera
    const t = reducedMotion ? 0 : now / 1000, y = scrollY;
    // easing by elapsed time, so a slow machine arrives as fast as a quick one
    const dt = Math.min(.1, prev ? (now - prev) / 1000 : .016); prev = now;
    lean.x += ((mouse.x > 5 ? 0 : mouse.x) - lean.x) * .05; lean.y += ((mouse.y > 5 ? 0 : mouse.y) - lean.y) * .05;

    // which section are we reading, and how close is the next one?
    let i = 0;
    for (let k = 0; k < tops.length; k++) if (tops[k] <= y + h * .45) i = k;
    const next = Math.min(zones.length - 1, i + 1);
    const k = next === i ? 0 : smooth(clamp(1 - (tops[next] - y - h * .3) / (h * .6)));
    shot(i, t, pa, la); shot(next, t, pb, lb);
    camPos.lerpVectors(pa, pb, k); camLook.lerpVectors(la, lb, k);
    // tall, narrow screens: step back so the object still fits across
    const fit = clamp(1.3 / (w / h), 1, 2.1);
    camPos.sub(camLook).multiplyScalar(fit).add(camLook);
    // glide, don't jump (also when you click a nav link far down)
    const ease = reducedMotion ? 1 : 1 - Math.exp(-dt * 4.2);
    if (!cam){ cam = camPos.clone(); look = camLook.clone(); }
    cam.lerp(camPos, ease); look!.lerp(camLook, ease);
    // free-look orbit around what we're looking at, plus a slow handheld drift
    const fe = 1 - Math.exp(-dt * (drag ? 10 : 3));
    freeLook.yaw += (freeLook.ty - freeLook.yaw) * fe; freeLook.pitch += (freeLook.tp - freeLook.pitch) * fe;
    const off = tmpOff.copy(cam).sub(look!).applyAxisAngle(up, freeLook.yaw);
    off.applyAxisAngle(tmpRight.crossVectors(up, off).normalize(), freeLook.pitch);
    camera.position.copy(look!).add(off).add(v.set(
      lean.x * 1.1 + Math.sin(t * .63) * .07 + Math.sin(t * 1.7) * .02,
      lean.y * .7 + Math.sin(t * .81) * .06,
      Math.sin(t * .47) * .05));
    // arrival: once the camera settles on a host it pulses, and the section hears about it
    const stageNow = zones[i]?.dataset.stage ?? '';
    if (k > .5) arrived = '';
    else if (k < .02 && stageNow !== arrived && cam.distanceTo(camPos) < .4){
      arrived = stageNow; arriveAt = now; net.ping(stageNow); emit(WORLD.arrive, zones[i]?.id);
    }
    camera.lookAt(look!);
    // warp speed: how fast is the camera travelling?
    const speed = prevCam ? camera.position.distanceTo(prevCam) / Math.max(dt, .001) : 0;
    prevCam = (prevCam ?? V()).copy(camera.position);
    const wT = reducedMotion ? 0 : clamp((speed - 10) / 26);
    warp += (wT - warp) * (1 - Math.exp(-dt * (wT > warp ? 7 : 2.5)));
    if (warp > .5) warpPeak = true;
    if (warpPeak && warp < .1){ warpPeak = false; flash.classList.remove('go'); void flash.offsetWidth; flash.classList.add('go'); }
    camera.fov = 42 + warp * 32;
    camera.getWorldDirection(fwd2);
    warpRings.forEach((r, n) => {
      r.visible = warp > .02;
      if (!r.visible) return;
      const d = ((n * 3.2 - now / 1000 * 46) % 70 + 70) % 70;
      r.position.copy(camera.position).addScaledVector(fwd2, 2 + d);
      r.quaternion.copy(camera.quaternion);
      (r.material as THREE.MeshBasicMaterial).opacity = warp * (1 - d / 70) * .9;
    });
    streaks.visible = warp > .02; streakMat.opacity = warp * .85; streaks.scale.z = 1 + warp * 16;
    const targetSide = sideOf(i) * (1 - k) + sideOf(next) * k;
    side += (targetSide - side) * ease;
    if (w >= 900) camera.setViewOffset(w, h, side * w * .25, 0, w, h);   // text on the left → scene shifts right, and back
    else camera.setViewOffset(w, h, 0, h * .2, w, h);   // phones: the object sits in the top half, above the panel
    camera.updateProjectionMatrix();

    // the firewall shatters and the hologram dissolves as you scroll off the dossier
    const brk = clamp(y / (h * .95));
    wall.visible = brk < 1;
    if (wall.visible){
      let hx = 99, hy = 99;
      if (brk < .05){ ray.setFromCamera(mouse, camera); if (ray.ray.intersectPlane(wallPlane, hit)){ hx = hit.x; hy = hit.y; } }
      cells.forEach((c, n) => {
        const d = Math.hypot(c.base.x - hx, c.base.y - hy);
        c.push += (Math.max(0, 1 - d / 2.6) - c.push) * .14;
        // a cell breaks when the scroll reaches it, or when you've hit it yourself
        const lp = Math.max(clamp((brk - c.delay) / .55), c.hit < 0 ? 0 : clamp((now - c.hit) / 900)), f = lp * lp;
        v.copy(c.base).addScaledVector(c.dir, f);
        v.z += c.push * .6 + (reducedMotion ? 0 : Math.sin(t * 1.2 + c.base.x * .4 + c.base.y * .3) * .05);
        e3.set(c.spin.x * f, c.spin.y * f, c.spin.z * f);
        const s2 = 1 - lp * .35;
        wall.setMatrixAt(n, m4.compose(v, q.setFromEuler(e3), sc.set(s2, s2, s2)));
        wall.setColorAt(n, tmpC.copy(hexA).lerp(hexB, Math.min(1, c.push * 1.1 + lp * .15 + (c.hit < 0 ? 0 : .6))));
      });
      wall.instanceMatrix.needsUpdate = true;
      if (wall.instanceColor) wall.instanceColor.needsUpdate = true;
    }
    holo.visible = brk < 1;
    holoU.uTime.value = t;
    holoU.uDissolve.value = brk * 1.15;
    // glitch: a little always, a lot when the cursor is on me
    v.set(0, 2.2, 0).applyMatrix4(holo.matrixWorld).project(camera);
    const near = 1 - clamp(Math.hypot(v.x - mouse.x, (v.y - mouse.y) * .6) / .35);
    holoU.uGlitch.value = reducedMotion ? 0 : .08 + near * .9 + (Math.sin(t * 2.3) > .97 ? .6 : 0) + (rootOn ? .6 : 0);
    holo.rotation.y = lean.x * .35;
    pad.rotation.z = t * .6; pad2.rotation.z = -t * .9;
    // the stack ring turns, shrinks away with the hologram, and names the logo under the cursor
    spin.rotation.y = reducedMotion ? 0 : t * .22;
    stack.scale.setScalar(Math.max(.001, 1 - brk * 1.2));
    let hs: THREE.Sprite | null = null;
    if (brk < .3 && mouse.x < 5){
      ray.setFromCamera(mouse, camera);
      hs = (ray.intersectObjects(sprites, false)[0]?.object as THREE.Sprite) ?? null;
    }
    if (hs !== hoverSkill){
      hoverSkill = hs; canvas.style.cursor = hs ? 'help' : '';
      if (tip){ tip.textContent = hs ? hs.userData.name : ''; tip.classList.toggle('on', !!hs); }
    }
    sprites.forEach(sp => sp.scale.setScalar(sp.scale.x + ((sp === hoverSkill ? .85 : .58) - sp.scale.x) * .2));
    if (hoverSkill && tip){ v.copy(hoverSkill.getWorldPosition(tmp)).project(camera); tip.style.transform = `translate(${((v.x + 1) / 2 * w).toFixed(0)}px, ${((1 - v.y) / 2 * h - 46).toFixed(0)}px)`; }

    // the network and its hosts
    net.group.visible = brk > .08;
    const active = zones[k > .5 ? next : i]?.dataset.stage ?? '';
    net.update(t, active);
    // hosts answer the cursor (not through the panels, and not on touch)
    let hh = '';
    if (net.group.visible && brk > .3 && !overUi && !drag?.moved && mouse.x < 5 && w >= 640){
      ray.setFromCamera(mouse, camera);
      hh = (ray.intersectObjects(net.hitTargets, false)[0]?.object.userData.host as string | undefined) ?? '';
    }
    if (hh !== hoverHost){
      hoverHost = hh; net.hover(hh);
      document.documentElement.classList.toggle('on-host', !!hh);
      if (hh) hostTip.innerHTML = `<span>$ nmap 10.0.0.${Object.keys(HOSTS).indexOf(hh) + 1}</span><b>${hh === 'targets' ? 'goals' : hh}</b><span>443/tcp ${hh === 'projects' ? 'filtered' : 'open'} · ${HOST_INFO[hh] ?? ''}</span><i>click to fly there</i>`;
      hostTip.classList.toggle('on', !!hh); hostTip.classList.toggle('deny', hh === 'projects');
    }
    if (hoverHost) hostTip.style.transform = `translate(${((mouse.x + 1) / 2 * w + 18).toFixed(0)}px, ${((1 - mouse.y) / 2 * h + 14).toFixed(0)}px)`;
    // the nmap scan sphere
    const su = (now - scanAt) / 2400;
    scan.visible = su >= 0 && su < 1;
    if (scan.visible){
      const r = 1 + su * 23; scan.scale.setScalar(r); scan.rotation.y = su * 2;
      scanMat.opacity = (1 - su) * .45; scanMat.color.copy(P.signal);
      for (const id of Object.keys(HOSTS)) if (!scanned.has(id) && v.fromArray(HOSTS[id]).length() < r){ scanned.add(id); net.ping(id); }
    }
    // this semester's ring fills up whenever the degree is in view
    arcFill += ((['network', 'root', 'progress'].includes(active) ? 1 : 0) - arcFill) * (1 - Math.exp(-dt * 1.4));
    nowArc?.geometry.setDrawRange(0, Math.max(2, Math.round(97 * arcFill)));
    dust.rotation.y = t * .01;
    // the degree rings and the weather
    degRings.rotation.y = t * .02;
    courseList.forEach((c, n) => {
      const pulse = c.state === 'now' ? 1.25 + Math.sin(t * 4 + n) * .35 : c.state === 'done' ? 1.1 : .75;
      const s3 = n === hoverCourse ? 2 : pulse;
      courseMesh.setMatrixAt(n, m4.compose(c.pos, q.identity(), sc.set(s3, s3, s3)));
    });
    courseMesh.instanceMatrix.needsUpdate = true;
    if (mouse.x < 5 && w >= 900){
      ray.setFromCamera(mouse, camera);
      const hit2 = ray.intersectObject(courseMesh, false)[0];
      const hc = hit2?.instanceId ?? -1;
      if (hc !== hoverCourse){
        hoverCourse = hc;
        ringTip.classList.toggle('on', hc >= 0);
        if (hc >= 0){ const c = courseList[hc]; ringTip.textContent = `${c.code} · ${c.name} · ${c.state === 'now' ? 'this semester' : c.state}`; }
      }
      if (hoverCourse >= 0) ringTip.style.transform = `translate(${((mouse.x + 1) / 2 * w).toFixed(0)}px, ${((1 - mouse.y) / 2 * h - 40).toFixed(0)}px)`;
    }
    // weather
    if ((frameNo & 63) === 0) key.color.copy(lightForHour(penangHour()));
    rain.visible = !!wx?.wet && !reducedMotion;
    if (rain.visible){
      const fall = now / 1000 * 24;
      for (let n = 0; n < RAIN; n++){
        const bx = rainBase[n * 3], by = ((rainBase[n * 3 + 1] - fall) % 30 + 30) % 30 - 12, bz = rainBase[n * 3 + 2];
        const x0 = camera.position.x + bx, y0 = camera.position.y + by, z0 = camera.position.z + bz, j = n * 6;
        rainPos[j] = x0; rainPos[j + 1] = y0; rainPos[j + 2] = z0;
        rainPos[j + 3] = x0 + .08; rainPos[j + 4] = y0 - .7; rainPos[j + 5] = z0;
      }
      rainGeo.attributes.position.needsUpdate = true;
    }
    if (wx?.storm && !reducedMotion && now > nextStorm){
      nextStorm = now + 5000 + Math.random() * 9000;
      flash.classList.remove('go', 'storm'); void flash.offsetWidth; flash.classList.add('go', 'storm');
    }
    // the swarm re-forms between the two sections you're between
    swarmKick = reducedMotion ? 0 : Math.sin(clamp((now - kickAt) / 1300) * Math.PI) * 2.6;
    updateSwarm(zones[i]?.dataset.stage ?? 'hero', zones[next]?.dataset.stage ?? 'hero', k, reducedMotion ? 0 : now / 1000);
    secrets.forEach(sx => { sx.m.rotation.set(t, t * 1.4, 0); });

    // section objects grow in when their section is close, shrink away after
    for (const [id, g] of Object.entries(props)){
      const zi = zones.findIndex(z => z.dataset.stage === id);
      const pres = zi === i ? 1 - k : zi === next ? k : 0;
      const base: number = g.userData.s ?? .001;
      const s0 = base + (Math.max(.001, smooth(pres)) - base) * (1 - Math.exp(-dt * 5)); g.userData.s = s0;
      const bu = id === arrived && !reducedMotion ? clamp(1 - (now - arriveAt) / 700) : 0;
      const s = s0 * (1 + Math.sin(bu * Math.PI) * .14);
      g.scale.setScalar(s); g.visible = s > .01;
    }
    if (props.progress.visible) props.progress.rotation.y = Math.sin(t * .3) * .25;
    sats.forEach((s, n) => {
      const a = t * s.sp + n * 1.7;
      s.m.position.set(Math.cos(a) * s.r, Math.sin(a) * s.r * Math.sin(s.tilt) , Math.sin(a) * s.r * Math.cos(s.tilt));
      s.m.rotation.set(t, t * 1.3, 0);
    });
    rings.forEach((r, n) => { r.rotation.x = t * (.3 + n * .15); r.rotation.y = t * (.2 - n * .1); });
    cage.rotation.set(t * .4, t * .5, 0); cage2.rotation.set(-t * .6, -t * .3, 0);
    alertLine.opacity = .6 + Math.sin(t * 9) * .2 * (Math.sin(t * 1.3) > .6 ? 1 : 0) + .2;
    jHeadS += (jHead - jHeadS) * .12;
    globe.rotation.y = .55 + Math.sin(t * .22) * .45;
    flyer.position.set(0, RY(0) + jHeadS * (RY(graph.length - 1) - RY(0)), 0); flyer.rotation.set(t * 2, t * 3, 0);
    bCurves.forEach(b => b.m.position.copy(b.c.getPoint((t * .16 + b.o) % 1)));
    headRing.rotation.set(t * .9, t * .6, 0);
    pulses.forEach((p, n) => {
      const f = ((t * .45 + n / pulses.length) % 1);
      p.scale.setScalar(.4 + f * 2.4); (p.material as THREE.MeshBasicMaterial).opacity = (1 - f) * .9;
      p.quaternion.copy(camera.quaternion);
    });

    // host labels over the whole-network views
    const isOv = (x?: string) => x === 'network';
    const st = zones[i]?.dataset.stage, overview = isOv(st) ? 1 - k : isOv(zones[next]?.dataset.stage) ? k : 0;   // not on the root screen, where the picker sits
    labels.forEach(({ id, el }) => {
      v.fromArray(HOSTS[id]).project(camera);
      const vis = overview > .05 && v.z < 1;
      el.style.opacity = vis ? String(overview) : '0';
      if (vis) el.style.transform = `translate(${((v.x + 1) / 2 * w).toFixed(1)}px, ${((1 - v.y) / 2 * h).toFixed(1)}px)`;
    });

    // the nav marks the section you're in
    const cur = zones[i]?.id ?? '';
    if (cur !== lastActive){
      lastActive = cur;
      navLinks.forEach(a => { if (a.hash === `#${cur}`) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    }
    secrets.forEach(({ p, el }) => {
      v.copy(p).project(camera);
      const vis = rootOn && v.z < 1;
      el.style.opacity = vis ? '1' : '0';
      if (vis) el.style.transform = `translate(${((v.x + 1) / 2 * w).toFixed(1)}px, ${((1 - v.y) / 2 * h).toFixed(1)}px)`;
    });
    if (w >= 900 && (frameNo++ & 1) === 0) drawRadar(t, active);
    fx.render(now / 1000, dt, rootOn && !reducedMotion ? .05 : 0);
    if (!readySent){ readySent = true; emit(WORLD.ready); }
  };
  let readySent = false;
  let frameNo = 0;
  requestAnimationFrame(frame);
}

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
         journey   a wire globe, arc from Solo to Penang
         contact   a beacon sending out rings
     · the camera follows the page: it holds on the section you are reading
       and flies to the next one as it scrolls up
   Sections declare data-stage (which object) and data-side (where their
   text sits, so the scene shifts the other way).
   ========================================================================== */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { cssVar, isDark, reducedMotion, THEME_EVENT } from './env';
import { HOSTS, createNetwork, readPalette, type Palette } from './network';

interface WorldData { sems: { state: string; fill: number }[]; courses: number; goals: number[]; skills: { name: string; path: string | null; color: string }[] }
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
  catch { document.documentElement.classList.add('no-gl'); return; }
  document.documentElement.classList.add('gl');
  const phone = innerWidth < 640;
  renderer.setPixelRatio(Math.min(devicePixelRatio, phone ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), .04).texture;
  scene.fog = new THREE.Fog(0, 14, 62);
  const camera = new THREE.PerspectiveCamera(42, 1, .1, 220);
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(-6, 8, 12); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 1.2); rim.position.set(8, -3, -8); scene.add(rim);
  scene.add(new THREE.AmbientLight(0xffffff, .3));

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
  const cells: { base: THREE.Vector3; dir: THREE.Vector3; spin: THREE.Vector3; delay: number; push: number }[] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++){
    const x = (c - cols / 2) * HW + (r % 2 ? HW / 2 : 0), y = (r - rows / 2) * R * 1.5;
    const o = V(x, y, 0).normalize();
    cells.push({ base: V(x, y, WALL_Z), push: 0, delay: clamp(Math.hypot(x, y) / 16) * .45 + rnd() * .12,
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
  // journey: a wire globe with the arc from Solo to Penang and a packet flying it
  const jg = at('journey'); const globe = new THREE.Group(); jg.add(globe);
  globe.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.7, 3)), new THREE.LineBasicMaterial({ transparent: true, opacity: .22, color: 0x888888 })));
  const ll = (lat: number, lon: number, r = 1.72) => { const p = (90 - lat) * Math.PI / 180, t = (lon + 180) * Math.PI / 180; return V(-r * Math.sin(p) * Math.cos(t), r * Math.cos(p), r * Math.sin(p) * Math.sin(t)); };
  const solo = ll(-7.57, 110.82), penang = ll(5.41, 100.33);
  const arc = new THREE.QuadraticBezierCurve3(solo, solo.clone().add(penang).multiplyScalar(.5).normalize().multiplyScalar(2.6), penang);
  globe.add(new THREE.Mesh(new THREE.TubeGeometry(arc, 64, .022, 8), lime));
  [solo, penang].forEach(p => { const d = new THREE.Mesh(new THREE.SphereGeometry(.07, 12, 12), lime); d.position.copy(p); globe.add(d); });
  const flyer = new THREE.Mesh(new THREE.SphereGeometry(.09, 12, 12), new THREE.MeshBasicMaterial({ color: 0xffffff })); globe.add(flyer);
  // turn the globe so the arc faces the camera
  globe.rotation.y = Math.atan2(-(solo.x + penang.x), solo.z + penang.z) + .3;
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
  };
  paint();
  document.documentElement.addEventListener(THEME_EVENT, paint);

  /* ---- layout, input ------------------------------------------------------------------------------------------------- */
  let w = 1, h = 1, tops: number[] = [];
  const measure = () => { tops = zones.map(z => z.getBoundingClientRect().top + scrollY); };
  const resize = () => { w = innerWidth; h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; measure(); };
  resize(); addEventListener('resize', resize); addEventListener('load', measure);
  new ResizeObserver(measure).observe(document.body);
  const mouse = new THREE.Vector2(9, 9), lean = { x: 0, y: 0 };
  addEventListener('pointermove', e => mouse.set(e.clientX / w * 2 - 1, -(e.clientY / h) * 2 + 1), { passive: true });
  const ray = new THREE.Raycaster(), wallPlane = new THREE.Plane(V(0, 0, 1), -(WALL_Z + DEPTH / 2)), hit = V();
  const navLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('.hud-nav a, .m3d-list a'));

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
  };
  const sideOf = (i: number) => { const s = zones[i]?.dataset.side; return s === 'left' ? -1 : s === 'right' ? 1 : 0; };

  /* ---- the loop ----------------------------------------------------------------------------------------------------------- */
  const pa = V(), la = V(), pb = V(), lb = V(), camPos = V(), camLook = V(), v = V(), e3 = new THREE.Euler();
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = V();
  let cam: THREE.Vector3 | null = null, look: THREE.Vector3 | null = null, side = sideOf(0), lastActive = '', prev = 0;
  const frame = (now: number) => {
    requestAnimationFrame(frame);
    if (document.hidden) return;
    const t = now / 1000, y = scrollY;
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
    camera.position.copy(cam).add(v.set(lean.x * 1.1, lean.y * .7, 0));
    camera.lookAt(look!);
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
        const lp = clamp((brk - c.delay) / .55), f = lp * lp;
        v.copy(c.base).addScaledVector(c.dir, f);
        v.z += c.push * .6 + (reducedMotion ? 0 : Math.sin(t * 1.2 + c.base.x * .4 + c.base.y * .3) * .05);
        e3.set(c.spin.x * f, c.spin.y * f, c.spin.z * f);
        const s2 = 1 - lp * .35;
        wall.setMatrixAt(n, m4.compose(v, q.setFromEuler(e3), sc.set(s2, s2, s2)));
        wall.setColorAt(n, tmpC.copy(hexA).lerp(hexB, Math.min(1, c.push * 1.1 + lp * .15)));
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
    holoU.uGlitch.value = reducedMotion ? 0 : .08 + near * .9 + (Math.sin(t * 2.3) > .97 ? .6 : 0);
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
    dust.rotation.y = t * .01;

    // section objects grow in when their section is close, shrink away after
    for (const [id, g] of Object.entries(props)){
      const zi = zones.findIndex(z => z.dataset.stage === id);
      const pres = zi === i ? 1 - k : zi === next ? k : 0;
      const s = g.scale.x + (Math.max(.001, smooth(pres)) - g.scale.x) * (1 - Math.exp(-dt * 5));
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
    flyer.position.copy(arc.getPoint((t * .25) % 1));
    pulses.forEach((p, n) => {
      const f = ((t * .45 + n / pulses.length) % 1);
      p.scale.setScalar(.4 + f * 2.4); (p.material as THREE.MeshBasicMaterial).opacity = (1 - f) * .9;
      p.quaternion.copy(camera.quaternion);
    });

    // host labels over the whole-network views
    const st = zones[i]?.dataset.stage, overview = st === 'network' ? 1 - k : zones[next]?.dataset.stage === 'network' ? k : 0;   // not on the root screen, where the picker sits
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
    renderer.render(scene, camera);
  };
  requestAnimationFrame(frame);
}

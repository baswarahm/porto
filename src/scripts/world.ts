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
import { createFluid } from './fluid';
import { createPhysics } from './physics';
import { createSky } from './sky';
import { createTitles } from './titles';
import { music } from './music';
import { createOcean } from './ocean';
import { TIME_EVENT, journeyHeadAt } from './timemachine';
import { degreeProgress } from '../lib/degree';
import { createDrone } from './drone';
import { createPhotoUI } from './photo';
import { createMelt } from './melt';
import { createBanner } from './banner';
import { createDefense } from './defend';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GHOST_EVENT, type Ghost } from './ghosts';
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
  // kept under the bloom threshold, so the glow never floods the black body
  vec3 col = uBody + uTint * edge * .78;
  col += uTint * .06 * step(.55, fract(uv.y * 160.0));
  col += uTint * step(.986, fract(uv.y * 2.5 - uTime * .3)) * .3;
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
  // the real sky over Penang (sky.ts)
  const sky = createSky(); scene.add(sky.group);
  // the sea under the network and Penang's real clouds over it
  const ocean = createOcean(sky.uniforms, phone); scene.add(ocean.group);
  const sunFar = new THREE.Vector3();

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
  // the beam (and the particle halo) draw before the hologram, so the black body always covers them
  beam.renderOrder = -2;
  const padMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: .9 });
  const pad = new THREE.Mesh(new THREE.TorusGeometry(1.5, .025, 8, 96), padMat); pad.rotation.x = Math.PI / 2; holo.add(pad);
  const pad2 = new THREE.Mesh(new THREE.TorusGeometry(1.2, .012, 8, 96), padMat); pad2.rotation.x = Math.PI / 2; pad2.position.y = .05; holo.add(pad2);
  // my name on a cloth banner flying over the network like a flag planted after the breach, blowing in Penang's real wind;
  // click it to tear it (banner.ts)
  const banner = createBanner({ width: 10, height: 3.5, name: 'BASWARA HAFIZH MUTTAQIN', sub: 'CS · INTELLIGENT COMPUTING · USM PENANG', lime: cssVar('--lime') || '#c6ff3d', dark: true });
  banner.group.position.set(0, 8.4, 0); banner.group.rotation.y = -.24; scene.add(banner.group);
  penangWeather().then(x => { if (x) banner.setWind(x.wind, x.windDir); });
  // when the song plays: a ring of equalizer bars stands up around the pad (and around the core), driven by the real audio
  const EQN = music.bands.length, eqGeo = new THREE.BoxGeometry(.075, 1, .075).translate(0, .5, 0);
  const eqMat = new THREE.MeshBasicMaterial({ toneMapped: false, transparent: true, opacity: .9 });
  const eqRing = (r: number, parent: THREE.Object3D, y: number) => {
    const m = new THREE.InstancedMesh(eqGeo, eqMat, EQN); m.position.y = y; m.frustumCulled = false; m.visible = false; parent.add(m);
    return { m, r, h: new Float32Array(EQN) };
  };
  const eqRings = [eqRing(1.9, holo, 0), eqRing(2.6, scene, -1.1)];

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
  const pillars: { m: THREE.Mesh; h: number }[] = [];
  const pg = at('progress'); const pillarGeo = new THREE.BoxGeometry(.3, 1, .3); pillarGeo.translate(0, .5, 0);
  data.sems.forEach((s, i) => {
    const a = (i / Math.max(1, data.sems.length - 1) - .5) * 2.2, h = 2.4 * (s.state === 'now' ? Math.max(.08, s.fill) : 1);
    const m = new THREE.Mesh(pillarGeo, s.state === 'future' ? ghost : lime);
    m.position.set(Math.sin(a) * 2.4, -1.4, -Math.cos(a) * 2.4 + 1.2); m.scale.y = h; pg.add(m);
    m.userData.tip = `Year ${Math.floor(i / 2) + 1}, semester ${i % 2 + 1} · ${s.state === 'now' ? `in progress, ${(s.fill * 100).toFixed(0)}%` : s.state === 'done' ? 'done' : 'ahead'}`;
    pillars.push({ m, h });
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
  // ...inside a red hex force field. A scan line sweeps it, and when you try to get in (arrive, or click the host)
  // a ripple runs across it from your side and it flares
  const fieldU = { uTime: { value: 0 }, uColor: { value: new THREE.Color() }, uHit: { value: 9 }, uHitDir: { value: V(0, 0, 1) }, uAlpha: { value: 1 } };
  const field = new THREE.Mesh(new THREE.SphereGeometry(1.75, 48, 32), new THREE.ShaderMaterial({
    uniforms: fieldU, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: `varying vec3 vP, vN, vV; void main(){ vP = position; vN = normalize(normalMatrix * normal);
      vec4 mv = modelViewMatrix * vec4(position, 1.); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uTime, uHit, uAlpha; uniform vec3 uColor, uHitDir; varying vec3 vP, vN, vV;
      vec2 hexCell(vec2 uv){ vec2 r = vec2(1., 1.732), h = r * .5; vec2 a = mod(uv, r) - h, b = mod(uv - h, r) - h; return dot(a, a) < dot(b, b) ? a : b; }
      float hexD(vec2 p){ p = abs(p); return max(dot(p, vec2(.5, .866)), p.x); }
      void main(){
        vec3 n = normalize(vP);
        vec2 g = hexCell(vec2(atan(n.z, n.x) * 3.2 + uTime * .05, n.y * 5.5));
        float edge = smoothstep(.4, .5, hexD(g));
        float fres = pow(1. - abs(dot(normalize(vN), vV)), 2.2);
        float scan = smoothstep(.07, 0., abs(n.y - (fract(uTime * .3) * 2.6 - 1.3)));
        float ang = acos(clamp(dot(n, uHitDir), -1., 1.));
        float ring = uHit < 1.4 ? smoothstep(.28, 0., abs(ang - uHit * 2.6)) * (1. - uHit / 1.4) : 0.;
        float flare = uHit < .5 ? (1. - uHit / .5) * .35 : 0.;
        float a = fres * .5 + edge * (.08 + fres * .3 + ring * 2.) + scan * (.18 + edge * .4) + ring * .8 + flare;
        gl_FragColor = vec4(uColor * (1. + ring * .8), clamp(a, 0., 1.) * uAlpha);
      }`,
  }));
  prg.add(field);
  // and a band of text circling it, round and round
  const bandTex = (() => {
    const c = document.createElement('canvas'); c.width = 2048; c.height = 64;
    const g = c.getContext('2d')!; g.font = '600 34px ui-monospace, Menlo, Consolas, monospace'; g.textBaseline = 'middle'; g.fillStyle = '#fff';
    const s = 'LOCKED  ·  COMING SOON  ·  ACCESS DENIED  ·  443/TCP FILTERED  ·  ';
    let x = 0; while (x < c.width){ g.fillText(s, x, 34); x += g.measureText(s).width; }
    const tx = new THREE.CanvasTexture(c); tx.wrapS = THREE.RepeatWrapping; tx.repeat.x = 2; tx.anisotropy = 4; return tx;
  })();
  const bandMat = new THREE.MeshBasicMaterial({ map: bandTex, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  const band = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, .24, 96, 1, true), bandMat); band.rotation.z = .12; prg.add(band);
  let lockHit = -1e9;
  const tryLock = () => { lockHit = performance.now(); net.deny(); };
  addEventListener('vaulttry', tryLock);
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
  const jNodes: THREE.Mesh[] = [];
  graph.forEach((r, i) => {
    const merge = i === graph.length - 1;
    const d = new THREE.Mesh(merge ? new THREE.OctahedronGeometry(.2) : new THREE.SphereGeometry(.12, 14, 14), laneMats[r.lane]);
    d.position.copy(nodeAt(i)); globe.add(d);
    d.userData.tip = `${r.hash} · ${r.item.title} · ${r.item.date}`; jNodes.push(d);
  });
  const headRing = new THREE.Mesh(new THREE.TorusGeometry(.36, .018, 8, 64), lime); headRing.position.copy(nodeAt(graph.length - 1)); globe.add(headRing);
  const flyer = new THREE.Mesh(new THREE.OctahedronGeometry(.13), new THREE.MeshBasicMaterial({ color: 0xffffff })); globe.add(flyer);
  let jHead = 0, jHeadS = 0;
  addEventListener(JOURNEY_EVENT, e => { jHead = (e as CustomEvent<number>).detail; });
  // contact: a beacon sending out rings
  const cg = at('contact'); const pulses: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++){ const p = new THREE.Mesh(new THREE.TorusGeometry(1, .015, 8, 96), new THREE.MeshBasicMaterial({ transparent: true })); cg.add(p); pulses.push(p); }

  /* ---- section titles as point-cloud holograms floating above each host (titles.ts) ------------------------------ */
  await document.fonts?.ready;
  const titles = createTitles(zones.filter(z => HOSTS[z.dataset.stage ?? '']).map(z => {
    const h2 = z.querySelector('.sec-head h2 .txt');
    const text = (h2?.querySelector('.sr-only')?.textContent ?? h2?.textContent ?? z.id).trim();
    const st = z.dataset.stage!;
    return { stage: st, text, at: V(...HOSTS[st]).add(V(0, st === 'journey' ? 3.9 : 3.3, 0)) };
  }));
  scene.add(titles.group);

  /* ---- labels for the hosts (shown over the whole-network views) --------------------------------------------- */
  const labelBox = document.getElementById('worldLabels');
  const labels = Object.keys(HOSTS).map((id, i) => {
    const el = document.createElement('span'); el.className = 'wl' + (id === 'projects' ? ' deny' : '');
    el.innerHTML = `<b>${id === 'you' ? 'baswara' : id === 'targets' ? 'goals' : id}</b>10.0.0.${i + 1}`;
    labelBox?.append(el); return { id, el };
  });

  /* ---- theme ---------------------------------------------------------------------------------------------------- */
  let P: Palette = readPalette(), dayFog = false;
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
    fieldU.uColor.value.copy(P.alert); fieldU.uAlpha.value = dark ? 1 : .8;
    (field.material as THREE.ShaderMaterial).blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending; (field.material as THREE.ShaderMaterial).needsUpdate = true;
    bandMat.color.copy(P.alert); bandMat.blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending; bandMat.needsUpdate = true;
    laneMats.forEach((m, i) => { m.color.set(cssVar(`--b${i + 1}`)); m.emissive.set(cssVar(`--b${i + 1}`)); });
    pulses.forEach(p => (p.material as THREE.MeshBasicMaterial).color.set(cssVar('--lime')));
    net.paint(P);
    fx.setTheme(dark);
    sky.paint(dark, P.bg);
    ocean.paint(dark, P.bg, new THREE.Color(dark ? cssVar('--lime') : cssVar('--signal')));
    titles.paint(dark ? new THREE.Color(cssVar('--lime')) : P.ink.clone(), dark ? P.signal.clone().multiplyScalar(.35) : P.signal.clone(), dark);
    dayFog = !dark;
  };
  paint();
  document.documentElement.addEventListener(THEME_EVENT, paint);

  /* ---- layout, input ------------------------------------------------------------------------------------------------- */
  let w = 1, h = 1, tops: number[] = [];
  const measure = () => { tops = zones.map(z => z.getBoundingClientRect().top + scrollY); };
  const resize = () => { w = innerWidth; h = innerHeight; renderer.setSize(w, h, false); fx.setSize(w, h, renderer.getPixelRatio()); camera.aspect = w / h; net.setViewHeight(h * renderer.getPixelRatio()); measure(); };
  resize(); addEventListener('resize', resize); addEventListener('load', measure);
  new ResizeObserver(measure).observe(document.body);
  const mouse = new THREE.Vector2(9, 9), lean = { x: 0, y: 0 };
  addEventListener('pointermove', e => mouse.set(e.clientX / w * 2 - 1, -(e.clientY / h) * 2 + 1), { passive: true });

  /* ---- drone mode (drone.ts): fly the network yourself; fly into a host to land on its section ---------------------- */
  const drone = createDrone(Object.keys(HOSTS).map(id => ({ id, label: id === 'you' ? 'baswara' : id === 'targets' ? 'goals' : id, pos: () => V(...HOSTS[id]) })), {
    floor: -10.5,
    onDock: id => {
      const z = zones.find(zz => zz.dataset.stage === (id === 'you' ? 'network' : id));
      z?.scrollIntoView({ behavior: 'auto', block: 'start' });
      net.pingBurst(id === 'you' ? 'progress' : id);
    },
    // the page camera picks up from wherever the drone was and glides home
    onExit: () => { cam?.copy(camera.position); look?.copy(camera.position).add(camera.getWorldDirection(V()).multiplyScalar(6)); },
  });
  addEventListener('dronemode', () => (drone.active ? drone.stop() : drone.start(camera)));
  /* ---- photo mode (photo.ts): freeze, frame the shot with an orbit camera, focus by clicking, save a poster ------------ */
  const pcam = new THREE.PerspectiveCamera(42, 1, .1, 400);
  let orbit: OrbitControls | null = null, photoT: number | null = null, lastT = 0, fxWasOn = true;
  const focusables: THREE.Object3D[] = [], pray = new THREE.Raycaster();
  const savePoster = async () => {
    const pr = renderer.getPixelRatio(), big = Math.min(3, Math.max(2, pr * 1.5));
    renderer.setPixelRatio(big); renderer.setSize(w, h, false); fx.setSize(w, h, big);
    fx.render(lastT, 0);
    const out = document.createElement('canvas'); out.width = renderer.domElement.width; out.height = renderer.domElement.height;
    const g = out.getContext('2d')!; g.drawImage(renderer.domElement, 0, 0);
    renderer.setPixelRatio(pr); renderer.setSize(w, h, false); fx.setSize(w, h, pr);
    // a small caption, bottom left
    const u = out.height / 900, when = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kuala_Lumpur' }).format(travelMs ?? Date.now());
    g.fillStyle = cssVar('--lime') || '#c6ff3d'; g.fillRect(36 * u, out.height - 74 * u, 4 * u, 40 * u);
    g.font = `600 ${20 * u}px ui-monospace, Menlo, Consolas, monospace`; g.fillStyle = '#ffffff'; g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 8 * u;
    g.fillText('BASWARA.HM', 52 * u, out.height - 52 * u);
    g.font = `${13 * u}px ui-monospace, Menlo, Consolas, monospace`; g.fillStyle = 'rgba(255,255,255,.75)';
    g.fillText(`baswarahm.my.id · ${when} · Penang`, 52 * u, out.height - 32 * u);
    const blob = await new Promise<Blob | null>(r => out.toBlob(r, 'image/png'));
    if (!blob) throw new Error('could not encode the image');
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `baswara-hm-${new Date().toISOString().slice(0, 10)}.png`;
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  };
  const photo = createPhotoUI({
    enter: () => {
      if (drone.active) drone.stop();
      pcam.position.copy(camera.position); pcam.quaternion.copy(camera.quaternion); pcam.aspect = w / h; pcam.updateProjectionMatrix();
      orbit = new OrbitControls(pcam, canvas); orbit.enableDamping = true; orbit.dampingFactor = .08; orbit.maxDistance = 70; orbit.minDistance = 1.5;
      orbit.target.copy(look ?? V()); orbit.update();
      photoT = lastT; fxWasOn = fx.enabled; fx.setEnabled(true);
      focusables.length = 0; scene.traverse(o => { if ((o as THREE.Mesh).isMesh && o.visible) focusables.push(o); });
    },
    exit: () => {
      orbit?.dispose(); orbit = null; photoT = null; fx.setPhoto({ on: false }); fx.setEnabled(fxWasOn);
      cam?.copy(camera.position); look?.copy(camera.position).add(camera.getWorldDirection(V()).multiplyScalar(6));
    },
    change: s => fx.setPhoto({ on: true, focus: s.focus, blur: s.blur, grade: s.grade }),
    save: savePoster,
  });
  addEventListener('photomode', () => (photo.on ? photo.close() : photo.open()));
  let pDown = { x: 0, y: 0 };
  canvas.addEventListener('pointerdown', e => { pDown = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener('click', e => {
    if (!orbit || Math.hypot(e.clientX - pDown.x, e.clientY - pDown.y) > 5) return;
    pray.setFromCamera(new THREE.Vector2(e.clientX / w * 2 - 1, -(e.clientY / h) * 2 + 1), camera);
    const hitP = pray.intersectObjects(focusables, false)[0];
    if (hitP) photo.focused(hitP.distance, e.clientX, e.clientY);
  });
  /* ---- panels melt into particles (melt.ts): leaving a section, its panel streams into its host; the next one assembles out of its own ---- */
  const melt = createMelt(), meltState = new Map<number, 'shown' | 'gone'>();
  const wrapOf = (n: number) => zones[n]?.querySelector<HTMLElement>('.wrap') ?? null;
  const hostScreen = (n: number) => {
    const hp = HOSTS[zones[n]?.dataset.stage ?? ''];
    if (!hp) return { x: w * .7, y: h * .4 };
    const s = V(...hp).project(camera);
    return { x: clamp((s.x + 1) / 2, .03, .97) * w, y: clamp((1 - s.y) / 2, .03, .97) * h };
  };
  /* ---- defend the firewall (defend.ts): a mini-game in the network; the hosts are turrets ------------------------------- */
  const defense = createDefense(scene, Object.keys(HOSTS).filter(id => id !== 'you').map(id => V(...HOSTS[id])), fx);
  addEventListener('defend', () => {
    if (defense.active) return defense.stop();
    if (drone.active) drone.stop(); if (photo.on) photo.close();
    defense.start(() => { cam?.copy(camera.position); look?.set(0, 0, 0); });
  });
  const gray = new THREE.Raycaster();
  addEventListener('click', e => {
    if (!defense.active || (e.target as Element).closest?.('button, a, .def-bar, .def-over, .deck')) return;
    gray.setFromCamera(new THREE.Vector2(e.clientX / w * 2 - 1, -(e.clientY / h) * 2 + 1), camera);
    defense.shoot(gray, V(0, 0, 0));
  });
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
    if (drone.active || photo.on || defense.active || e.pointerType !== 'mouse' || e.button !== 0 || (e.target as Element).closest?.(UI)) return;
    drag = { x: e.clientX, y: e.clientY, moved: false };
  });
  addEventListener('pointerup', () => {
    if (drag?.moved){ dragged = true; setTimeout(() => { dragged = false; }, 0); }
    drag = null; freeLook.ty = 0; freeLook.tp = 0; document.documentElement.classList.remove('looking');
  });

  /* ---- hover a host: it glows and answers like an nmap scan; click flies there ---------------------------------- */
  const hostTip = Object.assign(document.createElement('div'), { className: 'host-tip' }); hostTip.setAttribute('aria-hidden', 'true'); document.body.append(hostTip);
  const HOST_INFO: Record<string, string> = { you: 'me, the core of it all', progress: 'degree progress', now: 'courses this semester', targets: 'goals board', projects: 'locked, coming soon', journey: 'experience & education', contact: 'say hi' };
  let hoverHost = '', hoverOther = '';
  addEventListener('click', e => {
    if (drone.active || photo.on || defense.active || dragged || !hoverHost || (e.target as Element).closest?.(UI)) return;
    if (hoverHost === 'projects') tryLock();
    zones.find(z => z.dataset.stage === hoverHost)?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
  });
  // click the banner to tear it
  addEventListener('click', e => {
    if (drone.active || photo.on || defense.active || dragged || !banner.group.visible || (e.target as Element).closest?.(UI)) return;
    bray.setFromCamera(new THREE.Vector2(e.clientX / w * 2 - 1, -(e.clientY / h) * 2 + 1), camera);
    banner.tear(bray);
  });
  const bray = new THREE.Raycaster();  const ray = new THREE.Raycaster(), wallPlane = new THREE.Plane(V(0, 0, 1), -(WALL_Z + DEPTH / 2)), hit = V();
  const navLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('.hud-nav a, .m3d-list a'));

  /* ---- break the firewall yourself: click (or tap) the wall around the dossier --------------------------------- */
  const counter = document.getElementById('breachCount');
  let broken = 0;
  // Rapier loads in the background once the world is up (desktop, high quality, full motion)
  // the debris lands on its own glowing floor just under the hologram's pad, where the hero camera can see the pile
  const FLOOR_Y = -4.3;
  const debrisFloor = new THREE.GridHelper(40, 40); debrisFloor.position.set(0, FLOOR_Y, 10);
  const dfMat = debrisFloor.material as THREE.LineBasicMaterial; dfMat.transparent = true; dfMat.opacity = 0; dfMat.depthWrite = false; dfMat.vertexColors = false;
  debrisFloor.visible = false; scene.add(debrisFloor);
  let phys: Awaited<ReturnType<typeof createPhysics>> | null = null;
  const pv = V(), pv2 = V(), pImp = V(), pSpin = V(), pq = new THREE.Quaternion(), sweep = V(), lastSweep = V(), sweepHit = V();
  let sweepOk = false;
  const loadPhysics = () => {
    if (phys || phone || reducedMotion || quality !== 'high') return;
    const go = () => createPhysics(cells, R, DEPTH, FLOOR_Y).then(p => { phys = p; }).catch(err => console.warn('physics unavailable', err));
    ('requestIdleCallback' in window) ? requestIdleCallback(go, { timeout: 3000 }) : setTimeout(go, 1200);
  };
  addEventListener(WORLD.ready, loadPhysics, { once: true });
  addEventListener('click', e => {
    if (drone.active || photo.on || defense.active || dragged || scrollY > h * .05) return;
    if ((e.target as Element).closest('.b-win, a, button, input, summary, label, .hud, .m3d')) return;
    const pt = new THREE.Vector2(e.clientX / w * 2 - 1, -(e.clientY / h) * 2 + 1);
    ray.setFromCamera(pt, camera);
    const hitCell = ray.intersectObject(wall, false)[0];
    if (hitCell?.instanceId === undefined) return;
    const c0 = cells[hitCell.instanceId].base, stamp = performance.now();
    if (phys){
      // real physics: the struck cell and its neighbours come loose, spinning
      const at0 = hitCell.point;
      cells.forEach((c, n) => {
        const live = phys!.isLive(n);
        if (live) phys!.pose(n, pv, pq); else pv.copy(c.base);
        const d = pv.distanceTo(at0);
        if (d > 1.7 || pv.y < FLOOR_Y + .6) return;
        if (!live){ c.hit = stamp; broken++; }
        const f = (1 - d / 1.7);
        // they burst out toward you, a little apart from the impact, and fall onto the floor in front
        pImp.copy(ray.ray.direction).multiplyScalar(-(2.4 * f + .5)).add(pv2.copy(pv).sub(at0).normalize().multiplyScalar(1.1 * f));
        pImp.y += 1.4 * f;
        pSpin.set((rnd() - .5) * .5, (rnd() - .5) * .5, (rnd() - .5) * .3);
        phys!.knock(n, pImp, pSpin);
      });
      wall.boundingSphere = null;
    } else cells.forEach(c => {
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

  /* ---- the swarm: a GPU fluid of ~200,000 particles (fluid.ts) that melts from one section's shape into the next;
          without WebGL2 it falls back to 12,000 particles moved on the CPU ---------------------------------------- */
  const FS = phone ? 256 : 448, GPU_OK = true;   // three r170 is WebGL2-only; a failed GPGPU init still falls back
  const NS = GPU_OK ? FS * FS : (phone ? 4500 : 12000);
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
    // only the outline: the particles make a halo around the black silhouette, never fill it in
    const A = (xx: number, yy: number) => xx < 0 || yy < 0 || xx >= cw || yy >= chh ? 0 : d[(yy * cw + xx) * 4 + 3];
    for (let yy = 0; yy < chh; yy++) for (let xx = 0; xx < cw; xx++){
      if (A(xx, yy) <= 140) continue;
      if (A(xx - 2, yy) <= 140 || A(xx + 2, yy) <= 140 || A(xx, yy - 2) <= 140 || A(xx, yy + 2) <= 140) sil.push(xx / cw, yy / chh);
    }
  }
  const silN = sil.length / 2;
  const shapes: Record<string, Float32Array> = {
    hero: shape((_, o) => {
      if (!silN){ o.set(0, 0, 11); return; }
      const q2 = ((rnd() * silN) | 0) * 2;
      // a soft halo just behind the body (the hologram hides whatever lands on it)
      const sp = .03 + Math.pow(rnd(), 3) * .22, a2 = rnd() * 6.283;
      o.set((sil[q2] - .5) * silW * 1.03 + Math.cos(a2) * sp, -2.4 + (1 - sil[q2 + 1]) * SILH * 1.02 + Math.sin(a2) * sp, 10.75 + (rnd() - .5) * .3);
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
      // a tilted belt of debris circling the locked vault, leaving the padlock and its field clear
      const p = at3('projects'), a = rnd() * 6.283, r = 2.5 + Math.pow(rnd(), 1.8) * 1.4 + (n % 3) * .05, yy = (rnd() - .5) * .22 * (r - 2.2);
      const tl = .38, x = Math.cos(a) * r, z = Math.sin(a) * r;
      o.set(p.x + x, p.y + yy * Math.cos(tl) - z * Math.sin(tl), p.z + yy * Math.sin(tl) + z * Math.cos(tl));
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
  const swarm = new THREE.Points(swarmGeo, swarmMat); swarm.frustumCulled = false; swarm.renderOrder = -2; scene.add(swarm);
  swarmPos.set(shapes.hero);
  let fluid: ReturnType<typeof createFluid> | null = null;
  if (GPU_OK){
    try { fluid = createFluid(renderer, FS, shapes, 'hero'); fluid.points.renderOrder = -2; scene.add(fluid.points); swarm.visible = false; }
    catch (e){ console.warn('GPU fluid unavailable, using the CPU swarm', e); }
  }
  const cpuN = fluid ? 0 : Math.min(NS, phone ? 4500 : 12000);
  swarmGeo.setDrawRange(0, cpuN);
  const fluidPlane = new THREE.Plane(), fluidMouse = V(), camDir = V();
  const updateSwarm = (a: string, b: string, kk: number, rt: number) => {
    const A = shapes[a] ?? shapes.network, B = shapes[b] ?? shapes.network;
    const s2 = kk * kk * (3 - 2 * kk), burst = Math.sin(kk * Math.PI) * 3.2 + swarmKick, wob = reducedMotion ? 0 : .045;
    for (let n = 0, j = 0; n < cpuN; n++, j += 3){
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
    fx.setEnabled(hi); renderer.setPixelRatio(ratio()); if (fluid) fluid.setFraction(hi ? 1 : .35); else swarmGeo.setDrawRange(0, hi ? cpuN : Math.round(cpuN * .4)); resize();
  };
  document.documentElement.addEventListener(QUALITY_EVENT, applyQuality); applyQuality();

  /* ---- shatter (click my name, or `breach`): the network blows apart and the swarm bursts, then both re-form --------- */
  let kickAt = -1e9, swarmKick = 0;
  addEventListener(WORLD.shatter, () => { if (reducedMotion) return; net.shatter(); kickAt = performance.now(); kick(.8); });
  addEventListener(WORLD.breach, () => { if (reducedMotion) return; net.shatter(); kickAt = performance.now(); kick(1); });

  /* ---- ghosts: other visitors, live (ghosts.ts) — a glowing packet each, orbiting the section they're reading -------- */
  type GhostView = { m: THREE.Mesh; trail: THREE.Points; tpos: Float32Array; stage: string; a: number; seen: boolean; fade: number };
  const ghosts = new Map<string, GhostView>();
  const ghostMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, transparent: true });
  const ghostTrailMat = new THREE.PointsMaterial({ size: .1, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const ghostSpot = (st: string, a: number, t: number, out: THREE.Vector3) => {
    const base = HOSTS[st] ?? (st === 'hero' ? [0, 1, 9] : [0, 0, 0]);
    const r = HOSTS[st] && st !== 'you' ? 1.8 : 3.4, ang = a + t * .5;
    return out.set(base[0] + Math.cos(ang) * r, base[1] + Math.sin(t * .9 + a) * .5 + .6, base[2] + Math.sin(ang) * r);
  };
  addEventListener(GHOST_EVENT, e => {
    const list = (e as CustomEvent<Ghost[]>).detail;
    ghosts.forEach(g => { g.seen = false; });
    list.forEach(gh => {
      let g = ghosts.get(gh.id);
      if (!g){
        const m = new THREE.Mesh(new THREE.OctahedronGeometry(.2), ghostMat); scene.add(m);
        const tpos = new Float32Array(14 * 3);
        const trail = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(tpos, 3)), ghostTrailMat); trail.frustumCulled = false; scene.add(trail);
        let hsh = 0; for (const ch of gh.id) hsh = (hsh * 31 + ch.charCodeAt(0)) % 1000;
        g = { m, trail, tpos, stage: gh.stage, a: hsh / 1000 * 6.283, seen: true, fade: 0 };
        ghostSpot(gh.stage, g.a, 0, m.position); for (let k = 0; k < 14; k++) m.position.toArray(tpos, k * 3);
        m.userData.tip = ''; ghosts.set(gh.id, g);
      }
      g.stage = gh.stage; g.seen = true;
      g.m.userData.tip = `another visitor · reading ${gh.stage === 'targets' ? 'goals' : gh.stage === 'hero' ? 'the profile' : gh.stage}`;
    });
  });
  const ghostTo = V();

  /* ---- arrival shockwave: a ring that rushes out from the host you just reached ------------------------------------- */
  const shockMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  const shock = new THREE.Mesh(new THREE.RingGeometry(.94, 1, 96), shockMat); shock.visible = false; scene.add(shock);

  /* ---- ping <host>: a burst of data down the stream to one host --------------------------------------------------- */
  addEventListener('pinghost', e => { const id = (e as CustomEvent<string>).detail; net.pingBurst(id); if (HOSTS[id] && !reducedMotion){ shock.position.fromArray(HOSTS[id]); shock.visible = true; shockAt = performance.now(); } });
  let shockAt = -1e9;

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
    fluid?.setLook(new THREE.Color(dark ? lime : cssVar('--signal')), new THREE.Color(dark ? '#ffffff' : cssVar('--ink')), dark);
    warpRings.forEach(r => { const m = r.material as THREE.MeshBasicMaterial; m.color.set(lime); m.blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending; m.needsUpdate = true; });
    streakMat.color.set(dark ? lime : cssVar('--ink'));
  };
  paintExtra();
  document.documentElement.addEventListener(THEME_EVENT, paintExtra);
  document.documentElement.addEventListener('rootmode', e => {
    rootOn = !!(e as CustomEvent).detail; kick(1);
    secretGroup.visible = rootOn;
    if (rootOn){
      cells.forEach(c => { c.hit = -1; }); broken = 0; phys?.reset(); wall.boundingSphere = null;
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
  let nowArc: THREE.Line | null = null, arcFill = 0, nowIdx = 0;
  const ringLines: THREE.Line[] = [];
  const courseList: { code: string; name: string; state: string; pos: THREE.Vector3; sem: number }[] = [];
  plan.forEach((sem, i) => {
    const R = 4.6 + i * 1.55;
    const full = new THREE.Line(ringArc(R, 0, Math.PI * 2), sem.state === 'done' ? ringDone : ringGhost); degRings.add(full); ringLines.push(full);
    if (sem.state === 'now'){ nowIdx = i; nowArc = new THREE.Line(ringArc(R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(.02, sem.fill)), ringDone); degRings.add(nowArc); }
    sem.courses.forEach((c, k) => {
      const a = (k + .5) / sem.courses.length * Math.PI * 2 + i * .45;
      courseList.push({ ...c, state: sem.state, pos: V(Math.cos(a) * R, 0, Math.sin(a) * R), sem: i });
    });
  });
  // a bright bead rides the end of this semester's arc
  const arcTip = new THREE.Mesh(new THREE.SphereGeometry(.16, 12, 12), new THREE.MeshBasicMaterial({ toneMapped: false })); degRings.add(arcTip);
  const courseMat = new THREE.MeshBasicMaterial({ toneMapped: false });
  const courseMesh = new THREE.InstancedMesh(new THREE.OctahedronGeometry(.17, 0), courseMat, Math.max(1, courseList.length));
  courseMesh.count = courseList.length; degRings.add(courseMesh);
  const ringTip = Object.assign(document.createElement('p'), { className: 'skill-tip' }); ringTip.setAttribute('aria-hidden', 'true'); document.body.append(ringTip);
  let hoverCourse = -1;
  // a sonar wave rolls out from the first semester to the last, lighting every course it passes;
  // the bead on this semester's arc drags a comet tail; pointing at a semester on the page lights its ring here
  const waveMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
  const wave = new THREE.Line(ringArc(1, 0, Math.PI * 2), waveMat); degRings.add(wave);
  const focusMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
  const focusRing = new THREE.Mesh(new THREE.TorusGeometry(1, .05, 6, 160), focusMat); focusRing.rotation.x = Math.PI / 2; degRings.add(focusRing);
  let semFocus = -1, focusR = 4.6;
  addEventListener('semfocus', e => { semFocus = (e as CustomEvent<number>).detail; });
  const TAIL = 18, tailPos = new Float32Array(TAIL * 3), tailCol = new Float32Array(TAIL * 3);
  const tailMat = new THREE.PointsMaterial({ map: dotTex, size: .5, transparent: true, depthWrite: false, opacity: .9, vertexColors: true });
  const tail = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(tailPos, 3)).setAttribute('color', new THREE.BufferAttribute(tailCol, 3)), tailMat);
  tail.frustumCulled = false; degRings.add(tail);

  /* ---- the time machine: the degree rings, the semester pillars, HEAD on the journey rail and the sky go to that day ---- */
  let travelMs: number | null = null, travelHead: number | null = null;
  const applyDegree = (ms: number) => {
    const dp = degreeProgress(ms);
    dp.semesters.forEach((s, i) => {
      if (plan[i]){ plan[i].state = s.state; plan[i].fill = s.fill; }
      const pl = pillars[i];
      if (pl){
        pl.h = 2.4 * (s.state === 'now' ? Math.max(.08, s.fill) : 1); pl.m.material = s.state === 'future' ? ghost : lime;
        pl.m.userData.tip = `Year ${Math.floor(i / 2) + 1}, semester ${i % 2 + 1} · ${s.state === 'now' ? `in progress, ${(s.fill * 100).toFixed(0)}%` : s.state === 'done' ? 'done' : 'ahead'}`;
      }
      if (ringLines[i]) ringLines[i].material = s.state === 'done' ? ringDone : ringGhost;
    });
    nowIdx = dp.current;
    const R = 4.6 + nowIdx * 1.55, f = dp.semesters[nowIdx].fill;
    if (!nowArc){ nowArc = new THREE.Line(ringArc(R, 0, 1), ringDone); degRings.add(nowArc); }
    nowArc.geometry.dispose(); nowArc.geometry = ringArc(R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(.02, f));
    nowArc.visible = dp.pct < 1;
    courseList.forEach(c => { c.state = plan[c.sem]?.state ?? c.state; });
    paintMore();
  };
  addEventListener(TIME_EVENT, e => {
    travelMs = (e as CustomEvent<number | null>).detail;
    applyDegree(travelMs ?? Date.now());
    travelHead = travelMs === null ? null : journeyHeadAt(travelMs).frac;
  });
  /* ---- live Penang weather: rain when it rains there, storms flash, the light follows Penang's clock ---------------- */
  let wx: Weather | null = null;
  penangWeather().then(x => { wx = x; if (x) ocean.setWeather(x.cloud, x.wind, x.windDir); });
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
  const portalCam = new THREE.PerspectiveCamera(42, 1, .1, 220); let wasPortal = false;
  let pillarGrow = 0;
  let arrived = '', arriveAt = -1e9;
  let cam: THREE.Vector3 | null = null, look: THREE.Vector3 | null = null, side = sideOf(0), lastActive = '', prev = 0;
  const frame = (now: number) => {
    requestAnimationFrame(frame);
    if (document.hidden || worldPaused) return;
    // reduced motion: the decorative spin and drift stand still; scrolling still moves the camera
    const t = photoT !== null && photo.state.freeze ? photoT : reducedMotion ? 0 : now / 1000, y = scrollY;
    lastT = t;
    // easing by elapsed time, so a slow machine arrives as fast as a quick one
    const dt = Math.min(.1, prev ? (now - prev) / 1000 : .016); prev = now;
    lean.x += ((mouse.x > 5 ? 0 : mouse.x) - lean.x) * .05; lean.y += ((mouse.y > 5 ? 0 : mouse.y) - lean.y) * .05;

    // which section are we reading, and how close is the next one?
    let i = 0;
    for (let k = 0; k < tops.length; k++) if (tops[k] <= y + h * .45) i = k;
    const next = Math.min(zones.length - 1, i + 1);
    const k = next === i ? 0 : smooth(clamp(1 - (tops[next] - y - h * .3) / (h * .6)));
    shot(i, t, pa, la); shot(next, t, pb, lb);
    // portal dive (high quality): between two sections the next one opens as a portal you fall through,
    // instead of the camera gliding across. Reduced motion: no flying at all, the camera cuts to each section.
    const portalOn = !reducedMotion && quality === 'high' && next !== i && k > .015 && k < .985;
    const kc = reducedMotion || portalOn ? 0 : k;
    camPos.lerpVectors(pa, pb, kc); camLook.lerpVectors(la, lb, kc);
    if (portalOn) camPos.lerp(camLook, k * .4);   // lean in toward the portal
    // tall, narrow screens: step back so the object still fits across
    const fit = clamp(1.3 / (w / h), 1, 2.1);
    camPos.sub(camLook).multiplyScalar(fit).add(camLook);
    let snapped = false;
    if (portalOn !== wasPortal){ wasPortal = portalOn; if (cam){ cam.copy(camPos); look!.copy(camLook); snapped = true; } }
    // the fog steps back with the camera, or the whole network fades out on narrow screens
    const fogK = fit * (dayFog ? 1.7 : 1); (scene.fog as THREE.Fog).near = 14 * fogK; (scene.fog as THREE.Fog).far = 62 * fogK;
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
      if (!reducedMotion) net.arrive(stageNow);
      if (stageNow === 'projects') lockHit = now;
      if (HOSTS[stageNow] && !reducedMotion){ shock.position.fromArray(HOSTS[stageNow]); shock.visible = true; }
    }
    camera.lookAt(look!);
    // the drone, when it's flying, has the camera
    const flying = drone.update(dt, camera);
    // photo mode: the orbit camera has it
    const shooting = !!orbit;
    if (orbit){ orbit.update(); camera.position.copy(pcam.position); camera.quaternion.copy(pcam.quaternion); }
    // the game: a high camera slowly circling the core
    const gaming = defense.active;
    if (gaming){ const ga = now / 1000 * .05; camera.position.set(Math.sin(ga) * 25, 12.5, Math.cos(ga) * 25); camera.lookAt(0, 0, 0); }
    defense.update(dt, now / 1000);
    // warp speed: how fast is the camera travelling?
    if (snapped) prevCam = null;
    const speed = prevCam ? camera.position.distanceTo(prevCam) / Math.max(dt, .001) : 0;
    prevCam = (prevCam ?? V()).copy(camera.position);
    const wT = reducedMotion || shooting || gaming ? 0 : clamp((speed - 10) / 26);
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
    const targetSide = flying || shooting || gaming ? 0 : portalOn ? sideOf(i) : sideOf(i) * (1 - k) + sideOf(next) * k;
    side = snapped ? targetSide : side + (targetSide - side) * ease;
    if (w >= 900) camera.setViewOffset(w, h, side * w * .25, 0, w, h);   // text on the left → scene shifts right, and back
    else camera.setViewOffset(w, h, 0, h * .2, w, h);   // phones: the object sits in the top half, above the panel
    camera.updateProjectionMatrix();
    if (portalOn){
      // the portal looks from the next section's own camera, framed for its side of the screen
      portalCam.position.copy(pb).sub(lb).multiplyScalar(fit).add(lb); portalCam.lookAt(lb);
      portalCam.aspect = w / h;
      if (w >= 900) portalCam.setViewOffset(w, h, sideOf(next) * w * .25, 0, w, h); else portalCam.setViewOffset(w, h, 0, h * .2, w, h);
      portalCam.updateProjectionMatrix();
      // it opens where the next host sits on screen, drifting to the centre as it grows to fill the view
      camera.updateMatrixWorld();
      const hp = HOSTS[zones[next]?.dataset.stage ?? ''];
      let cx = .5, cy = .5;
      if (hp){ v.fromArray(hp).project(camera); if (v.z < 1){ cx = clamp((v.x + 1) / 2, .2, .8); cy = clamp((v.y + 1) / 2, .25, .75); } }
      const g = smooth(clamp((k - .03) / .9));
      cx += (.5 - cx) * g; cy += (.5 - cy) * g;
      fx.setPortal(portalCam, cx, cy, Math.pow(g, 1.6) * (Math.hypot(w / h, 1) * .55 + .05), w / h, P.signal);
    } else fx.setPortal(null);

    // the firewall shatters and the hologram dissolves as you scroll off the dossier
    const brk = clamp(y / (h * .95));
    wall.visible = brk < 1;
    if (wall.visible){
      let hx = 99, hy = 99;
      if (brk < .05){ ray.setFromCamera(mouse, camera); if (ray.ray.intersectPlane(wallPlane, hit)){ hx = hit.x; hy = hit.y; } }
      debrisFloor.visible = !!phys?.liveCount;
      if (debrisFloor.visible){ dfMat.opacity += ((1 - brk * 3) * .35 - dfMat.opacity) * .08; dfMat.color.copy(P.signal); }
      if (phys && phys.liveCount){
        phys.step(dt);
        // the cursor shoves fallen cells along the way it moves
        if (mouse.x < 5){
          ray.setFromCamera(mouse, camera);
          if (ray.ray.intersectPlane(wallPlane, sweepHit)){
            if (sweepOk){ sweep.copy(sweepHit).sub(lastSweep).divideScalar(Math.max(dt, .001)); phys.push(ray.ray.origin, ray.ray.direction, sweep); }
            lastSweep.copy(sweepHit); sweepOk = true;
          }
        }
        wall.boundingSphere = null;
      }
      cells.forEach((c, n) => {
        if (phys?.isLive(n)){
          phys.pose(n, v, q);
          wall.setMatrixAt(n, m4.compose(v, q, sc.set(1, 1, 1)));
          wall.setColorAt(n, tmpC.copy(hexA).lerp(hexB, .75));
          return;
        }
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
    // the cloth banner flies over the network once the firewall is down
    banner.group.visible = brk > .3 && !defense.active;
    if (banner.group.visible) banner.update(dt, t, reducedMotion);
    // the music: equalizer rings, the pad thumps on the beat, the network core breathes with the bass
    const mOn = music.playing || eqRings[0].h[0] > .01;
    net.setMusic(music.playing ? music.bass : 0, music.beat);
    pad.scale.setScalar(1 + music.beat * .12); pad2.scale.setScalar(1 + music.beat * .2);
    eqMat.color.copy(dayFog ? P.ink : P.signal).lerp(new THREE.Color(dayFog ? 0x000000 : 0xffffff), dayFog ? 0 : .15);
    eqRings.forEach((ring, ri) => {
      ring.m.visible = mOn && !reducedMotion && (ri === 0 ? holo.visible : net.group.visible);
      if (!ring.m.visible) return;
      for (let n = 0; n < EQN; n++){
        // mirror the spectrum so the ring is symmetric, lows at the front
        const b = music.bands[n < EQN / 2 ? n * 2 : (EQN - 1 - n) * 2] ?? 0;
        ring.h[n] += ((music.playing ? b : 0) - ring.h[n]) * (b > ring.h[n] ? .5 : .12);
        const a = n / EQN * Math.PI * 2 + (ri ? t * .2 : -t * .1), hh = .04 + ring.h[n] * (ri ? 2.6 : 1.8);
        v.set(Math.sin(a) * ring.r, 0, Math.cos(a) * ring.r);
        ring.m.setMatrixAt(n, m4.compose(v, q.setFromAxisAngle(up, a), sc.set(1, hh, 1)));
      }
      ring.m.instanceMatrix.needsUpdate = true;
    });
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
    net.update(t, active, camera);
    // hosts answer the cursor (not through the panels, and not on touch)
    let hh = '', other = '';
    if (net.group.visible && brk > .3 && !overUi && !drag?.moved && mouse.x < 5 && w >= 640){
      ray.setFromCamera(mouse, camera);
      hh = (ray.intersectObjects(net.hitTargets, false)[0]?.object.userData.host as string | undefined) ?? '';
      if (!hh){
        // section objects (semester pillars, journey commits), then the little relay nodes
        const pool = [...[...ghosts.values()].map(g => g.m), ...(props.progress.visible ? pillars.map(p => p.m) : []), ...(props.journey.visible ? jNodes : [])];
        const o = pool.length ? ray.intersectObjects(pool, false)[0]?.object : undefined;
        if (o) other = o.userData.tip;
        else {
          const r = ray.intersectObject(net.minorMesh, false)[0];
          if (r?.instanceId !== undefined) other = `relay 10.0.1.${r.instanceId + 10} · forwarding packets`;
        }
      }
    }
    if (other !== hoverOther){
      hoverOther = other; ringTip.classList.toggle('on', !!other || hoverCourse >= 0);
      if (other) ringTip.textContent = other;
      document.documentElement.classList.toggle('on-thing', !!other);
    }
    if (hoverOther) ringTip.style.transform = `translate(${((mouse.x + 1) / 2 * w).toFixed(0)}px, ${((1 - mouse.y) / 2 * h - 40).toFixed(0)}px)`;
    if (hh !== hoverHost){
      hoverHost = hh; net.hover(hh);
      document.documentElement.classList.toggle('on-host', !!hh);
      if (hh) hostTip.innerHTML = `<span>$ nmap 10.0.0.${Object.keys(HOSTS).indexOf(hh) + 1}</span><b>${hh === 'targets' ? 'goals' : hh === 'you' ? 'baswara' : hh}</b><span>443/tcp ${hh === 'projects' ? 'filtered' : 'open'} · ${HOST_INFO[hh] ?? ''}</span><i>click to fly there</i>`;
      hostTip.classList.toggle('on', !!hh); hostTip.classList.toggle('deny', hh === 'projects');
    }
    if (hoverHost) hostTip.style.transform = `translate(${((mouse.x + 1) / 2 * w + 18).toFixed(0)}px, ${((1 - mouse.y) / 2 * h + 14).toFixed(0)}px)`;
    // arrival shockwave
    if (shock.visible){
      const su2 = (now - Math.max(arriveAt, shockAt)) / 1000;
      if (su2 > 1) shock.visible = false;
      else { shock.scale.setScalar(.6 + smooth(su2) * 5.5); shockMat.opacity = (1 - su2) * .9; shockMat.color.copy(P.signal); shock.quaternion.copy(camera.quaternion); }
    }
    // the nmap scan sphere
    const su = (now - scanAt) / 2400;
    scan.visible = su >= 0 && su < 1;
    if (scan.visible){
      const r = 1 + su * 23; scan.scale.setScalar(r); scan.rotation.y = su * 2;
      scanMat.opacity = (1 - su) * .45; scanMat.color.copy(P.signal);
      for (const id of Object.keys(HOSTS)) if (!scanned.has(id) && v.fromArray(HOSTS[id]).length() < r){ scanned.add(id); net.ping(id); }
    }
    // the degree rings draw themselves in, one semester after another, whenever the degree is in view;
    // this semester's arc fills last and a bead rides its end
    const degOn = ['network', 'root', 'progress'].includes(active) ? 1 : 0;
    arcFill = reducedMotion ? degOn : clamp(arcFill + (degOn ? dt * .45 : -dt * 1.2));
    const NR = ringLines.length + 1;
    ringLines.forEach((l, n) => l.geometry.setDrawRange(0, Math.max(0, Math.round(97 * clamp(arcFill * NR - n * .8)))));
    const nf = clamp(arcFill * NR - nowIdx * .8);
    nowArc?.geometry.setDrawRange(0, Math.max(2, Math.round(97 * nf)));
    const nowPlan = plan[nowIdx];
    arcTip.visible = !!nowArc && nf > .02;
    if (arcTip.visible && nowPlan){
      const R = 4.6 + nowIdx * 1.55, a = -Math.PI / 2 + Math.PI * 2 * Math.max(.02, nowPlan.fill) * nf;
      arcTip.position.set(Math.cos(a) * R, 0, Math.sin(a) * R); arcTip.scale.setScalar(1 + Math.sin(t * 5) * .25);
      (arcTip.material as THREE.MeshBasicMaterial).color.copy(P.signal);
      // the comet tail: points trailing back along the arc, shimmering
      for (let n = 0; n < TAIL; n++){
        const an = a - (n + 1) * .028 - Math.sin(t * 6 + n) * .004;
        tailPos[n * 3] = Math.cos(an) * R; tailPos[n * 3 + 1] = Math.sin(t * 7 + n * .8) * .04; tailPos[n * 3 + 2] = Math.sin(an) * R;
        tmpC.copy(P.signal).multiplyScalar(Math.pow(1 - n / TAIL, 1.6) * (dayFog ? .8 : 1.2));
        tailCol[n * 3] = tmpC.r; tailCol[n * 3 + 1] = tmpC.g; tailCol[n * 3 + 2] = tmpC.b;
      }
      tail.geometry.attributes.position.needsUpdate = true; tail.geometry.attributes.color.needsUpdate = true;
    }
    tail.visible = arcTip.visible && !reducedMotion;
    tailMat.blending = dayFog ? THREE.NormalBlending : THREE.AdditiveBlending;
    // the sonar wave, inner ring to outer, every few seconds while the degree is on screen
    const RMAX = 4.6 + Math.max(0, plan.length - 1) * 1.55;
    const wu = (t * .22) % 1, waveR = 3.6 + wu * (RMAX - 3.6 + 1.5);
    wave.visible = arcFill > .9 && !reducedMotion;
    if (wave.visible){ wave.scale.setScalar(waveR); waveMat.opacity = Math.sin(wu * Math.PI) * .85; waveMat.color.copy(P.signal); }
    // a ring for the semester you point at on the page
    const fOn = semFocus >= 0 && arcFill > .3;
    if (fOn) focusR = 4.6 + semFocus * 1.55;
    focusMat.opacity += ((fOn ? .9 : 0) - focusMat.opacity) * .15; focusMat.color.copy(P.signal);
    focusRing.visible = focusMat.opacity > .01;
    focusRing.scale.setScalar(focusRing.scale.x + (focusR - focusRing.scale.x) * .2 + (fOn ? Math.sin(t * 6) * .004 : 0));
    // the semester pillars grow up from the floor when you reach progress
    pillarGrow = reducedMotion ? 1 : clamp(pillarGrow + (active === 'progress' ? dt * .9 : -dt * 2));
    pillars.forEach((pl, n) => { pl.m.scale.y = Math.max(.001, pl.h * smooth(clamp(pillarGrow * 1.7 - n * .09))); });
    dust.rotation.y = t * .01;
    // the degree rings and the weather
    degRings.rotation.y = t * .02;
    courseList.forEach((c, n) => {
      const pulse = c.state === 'now' ? 1.25 + Math.sin(t * 4 + n) * .35 : c.state === 'done' ? 1.1 : .75;
      const swell = wave.visible ? Math.max(0, 1 - Math.abs(waveR - c.pos.length()) / 1.1) * waveMat.opacity * (c.state === 'future' ? .5 : 1) : 0;
      const s3 = n === hoverCourse ? 2 : pulse * (1 + swell * .9) * (fOn && c.sem === semFocus ? 1.6 : 1);
      courseMesh.setMatrixAt(n, m4.compose(c.pos, q.identity(), sc.set(s3, s3, s3)));
    });
    courseMesh.instanceMatrix.needsUpdate = true;
    if (mouse.x < 5 && w >= 900 && !hoverOther){
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
    swarm.visible = !fluid && !reducedMotion; if (fluid) fluid.points.visible = !reducedMotion; dust.visible = !reducedMotion; net.setCalm(reducedMotion);
    swarmKick = reducedMotion ? 0 : Math.sin(clamp((now - kickAt) / 1300) * Math.PI) * 2.6;
    if (fluid){
      if (!reducedMotion){
        // the cursor pushes through the fluid, on a plane through what the camera looks at
        let m: THREE.Vector3 | null = null;
        if (!overUi && mouse.x < 5){
          camera.getWorldDirection(camDir); fluidPlane.setFromNormalAndCoplanarPoint(camDir, look!);
          ray.setFromCamera(mouse, camera); m = ray.ray.intersectPlane(fluidPlane, fluidMouse);
        }
        const fog = scene.fog as THREE.Fog;
        fluid.setView(h * renderer.getPixelRatio(), fog.near, fog.far);
        fluid.update(zones[i]?.dataset.stage ?? 'hero', zones[next]?.dataset.stage ?? 'hero', k, dt, now / 1000, swarmKick, m);
      }
    } else updateSwarm(zones[i]?.dataset.stage ?? 'hero', zones[next]?.dataset.stage ?? 'hero', k, reducedMotion ? 0 : now / 1000);
    secrets.forEach(sx => { sx.m.rotation.set(t, t * 1.4, 0); });

    // section objects grow in when their section is close, shrink away after
    for (const [id, g] of Object.entries(props)){
      const zi = zones.findIndex(z => z.dataset.stage === id);
      const pres = zi === i ? 1 - k : zi === next ? k : 0;
      const base: number = g.userData.s ?? .001;
      const s0 = base + (Math.max(.001, smooth(pres)) - base) * (1 - Math.exp(-dt * 5)); g.userData.s = s0;
      const bu = id === arrived && !reducedMotion ? clamp(1 - (now - arriveAt) / 700) : 0;
      const s = s0 * (1 + Math.sin(bu * Math.PI) * .24);
      g.scale.setScalar(s); g.visible = s > .01;
      // idle: every object floats a little
      g.position.y = HOSTS[id][1] + Math.sin(t * .7 + HOSTS[id][0]) * .16;
    }
    if (props.progress.visible) props.progress.rotation.y = Math.sin(t * .3) * .25;
    sats.forEach((s, n) => {
      const a = t * s.sp + n * 1.7;
      s.m.position.set(Math.cos(a) * s.r, Math.sin(a) * s.r * Math.sin(s.tilt) , Math.sin(a) * s.r * Math.cos(s.tilt));
      s.m.rotation.set(t, t * 1.3, 0);
    });
    rings.forEach((r, n) => { r.rotation.x = t * (.3 + n * .15); r.rotation.y = t * (.2 - n * .1); });
    cage.rotation.set(t * .4, t * .5, 0); cage2.rotation.set(-t * .6, -t * .3, 0);
    // the locked vault: the field ripples from your side when you try it, the cages jolt, the whole thing shudders
    if (props.projects.visible){
      const lh = (now - lockHit) / 1000;
      fieldU.uTime.value = t; fieldU.uHit.value = reducedMotion ? 9 : lh;
      fieldU.uHitDir.value.copy(camera.position).sub(props.projects.position).normalize();
      band.rotation.y = -t * .35;
      bandMat.opacity = .6 + (Math.sin(t * 13) > .9 ? -.4 : 0) + (lh > 0 && lh < .6 ? .4 : 0);
      const jolt = !reducedMotion && lh > 0 && lh < .6 ? Math.sin(lh * 60) * (.6 - lh) * .14 : 0;
      props.projects.position.x = HOSTS.projects[0] + jolt;
      const cj = !reducedMotion && lh > 0 && lh < .4 ? Math.sin(lh / .4 * Math.PI) * .18 : 0;
      cage.scale.setScalar(1 + cj); cage2.scale.setScalar(1 - cj * .6);
    }
    alertLine.opacity = .6 + Math.sin(t * 9) * .2 * (Math.sin(t * 1.3) > .6 ? 1 : 0) + .2;
    jHeadS += ((travelHead ?? jHead) - jHeadS) * .12;
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

    // panels melt / assemble
    if (reducedMotion || flying || shooting || gaming){
      if (meltState.size){ meltState.forEach((_, n) => wrapOf(n) && melt.show(wrapOf(n)!)); meltState.clear(); }
    } else {
      const wi = wrapOf(i), wn = next !== i ? wrapOf(next) : null, si = meltState.get(i) ?? 'shown';
      if (wi && k > .14 && si === 'shown'){ melt.leave(wi, hostScreen(i)); meltState.set(i, 'gone'); }
      else if (wi && k < .1 && si === 'gone'){ melt.form(wi, hostScreen(i)); meltState.set(i, 'shown'); }
      if (wn && k > .14 && (meltState.get(next) ?? 'shown') === 'shown'){ melt.hide(wn); meltState.set(next, 'gone'); }
    }    // the nav marks the section you're in
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
    // ghosts glide along an arc to the section their visitor is reading, trailing light
    ghosts.forEach((g, gid) => {
      g.fade = clamp(g.fade + (g.seen ? dt : -dt) * 1.5);
      if (!g.seen && g.fade <= 0){ scene.remove(g.m, g.trail); ghosts.delete(gid); return; }
      ghostSpot(g.stage, g.a, t, ghostTo);
      const dist = g.m.position.distanceTo(ghostTo);
      g.m.position.lerp(ghostTo, 1 - Math.exp(-dt * 1.4)); g.m.position.y += Math.min(dist, 12) * dt * .5;
      g.m.rotation.set(t * 2, t * 3, 0); g.m.scale.setScalar(g.fade * (1 + Math.sin(t * 5 + g.a) * .15));
      g.tpos.copyWithin(3, 0, 13 * 3); g.m.position.toArray(g.tpos, 0); g.trail.geometry.attributes.position.needsUpdate = true;
    });
    ghostMat.color.copy(dayFog ? P.ink : P.signal).lerp(new THREE.Color(dayFog ? 0x000000 : 0xffffff), .4); ghostTrailMat.color.copy(P.signal);
    ghostTrailMat.blending = dayFog ? THREE.NormalBlending : THREE.AdditiveBlending;
    titles.update(arrived, camera, look!, now / 1000, dt, h * renderer.getPixelRatio() * .045, reducedMotion);
    // the sky follows the camera; when the sun is on screen it throws god rays
    sky.update(camera, travelMs ?? Date.now());
    ocean.update(now / 1000, camera, reducedMotion);
    sunFar.copy(camera.position).addScaledVector(sky.sunDir, 150).project(camera);
    const sunUp = Math.sin(sky.sun.alt);
    if (sunUp > -.04 && sunFar.z < 1 && Math.abs(sunFar.x) < 1.3 && Math.abs(sunFar.y) < 1.3)
      fx.setSun((sunFar.x + 1) / 2, (sunFar.y + 1) / 2, clamp(sunUp * 5 + .3) * (dayFog ? .5 : 1));
    else fx.setSun(.5, .5, 0);
    fx.render(now / 1000, dt, rootOn && !reducedMotion ? .05 : 0);
    fpsN++; if (now - fpsAt > 1000){ emit('worldfps', Math.round(fpsN * 1000 / (now - fpsAt))); fpsN = 0; fpsAt = now; }
    if (!readySent){ readySent = true; emit(WORLD.ready); }
  };
  let worldPaused = false;
  addEventListener('worldpause', e => { worldPaused = !!(e as CustomEvent<boolean>).detail; prev = 0; });
  let readySent = false, fpsN = 0, fpsAt = performance.now();
  let frameNo = 0;
  requestAnimationFrame(frame);
}

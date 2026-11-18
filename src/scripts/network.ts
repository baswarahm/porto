/* ==========================================================================
   NETWORK.TS — the 3D network shared by the home page (breach.ts) and every
   section page's hero (hostscene.ts): a glowing core inside two rings, six
   section hosts, ~140 minor nodes, and packets running along the links.
   Same seed every time, so the network looks the same on every page.
   ========================================================================== */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { cssVar } from './env';

export const HOSTS: Record<string, [number, number, number]> = {
  you: [0, 0, 0], progress: [-6, 2.6, -1], now: [-3.6, -3.1, 3.6], targets: [5.6, 3, 1.4],
  projects: [7, -2.3, -4], journey: [-7.2, -1.4, -6], contact: [2.6, -4, 5],
};

export interface Palette { signal: THREE.Color; alert: THREE.Color; ok: THREE.Color; ink: THREE.Color; ink3: THREE.Color; bg: THREE.Color }
export const readPalette = (): Palette => ({
  signal: new THREE.Color(cssVar('--signal')), alert: new THREE.Color(cssVar('--alert')), ok: new THREE.Color(cssVar('--ok')),
  ink: new THREE.Color(cssVar('--ink')), ink3: new THREE.Color(cssVar('--ink-3')), bg: new THREE.Color(cssVar('--paper')),
});

const CORE_VERT = `varying vec3 vPos; void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const CORE_FRAG = `
uniform vec3 uCam, uColor, uHot; uniform float uTime, uMorph, uDark; varying vec3 vPos;
float smin(float a, float b, float k){ float h = clamp(.5 + .5 * (b - a) / k, 0., 1.); return mix(b, a, h) - k * h * (1. - h); }
float map(vec3 p){
  float t = uTime * .7;
  float d = length(p) - .5 - .05 * sin(p.x * 7. + t * 2.) * sin(p.y * 6. + t) * sin(p.z * 8. - t);
  for (int i = 0; i < 4; i++){
    float fi = float(i);
    vec3 c = vec3(sin(t * (.7 + fi * .31) + fi * 2.1), cos(t * (.9 + fi * .23) + fi), sin(t * (.5 + fi * .37) + fi * 3.)) * (.42 + uMorph * .38);
    d = smin(d, length(p - c) - (.2 + .05 * fi), .38);
  }
  return d;
}
vec3 nrm(vec3 p){ vec2 e = vec2(.002, 0.); return normalize(vec3(map(p + e.xyy) - map(p - e.xyy), map(p + e.yxy) - map(p - e.yxy), map(p + e.yyx) - map(p - e.yyx))); }
void main(){
  vec3 rd = normalize(vPos - uCam), p = vPos; bool hit = false;
  for (int i = 0; i < 72; i++){ float d = map(p); if (d < .0015){ hit = true; break; } p += rd * d * .9; if (length(p) > 1.3) break; }
  if (!hit) discard;
  vec3 n = nrm(p), r = reflect(rd, n);
  float fres = pow(1. - max(dot(n, -rd), 0.), 3.);
  // liquid metal: a fake studio environment (dark floor, bright sky band, one hot key light)
  vec3 env = mix(uDark > .5 ? vec3(.015) : vec3(.55), uColor, smoothstep(-.25, .7, r.y));
  env += uHot * pow(max(0., dot(r, normalize(vec3(.4, .85, .3)))), 28.) * 2.2;
  env += uColor * pow(max(0., dot(r, normalize(vec3(-.7, -.2, .6)))), 6.) * .6;
  vec3 col = env * .85 + uColor * fres * (1.2 + uMorph);
  gl_FragColor = vec4(col, 1.);
}`;

const SHAPES: Record<string, () => THREE.BufferGeometry> = {
  progress: () => new THREE.CylinderGeometry(.26, .3, .62, 6),            // a semester pillar
  now: () => new THREE.TorusKnotGeometry(.2, .065, 72, 8),                 // courses, all tangled up
  targets: () => new THREE.TorusGeometry(.28, .1, 10, 28),                 // a target ring
  projects: () => new THREE.BoxGeometry(.46, .36, .22).translate(0, -.08, 0), // a padlock body (shackle added below)
  journey: () => new THREE.TetrahedronGeometry(.44),                       // a fork in the road
  contact: () => new THREE.CapsuleGeometry(.16, .34, 4, 12),               // an antenna
};

export async function createNetwork(){
  let seed = 23;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const group = new THREE.Group();
  const hostIds = Object.keys(HOSTS);
  const hostPos = hostIds.map(id => new THREE.Vector3(...HOSTS[id]));

  const minors: THREE.Vector3[] = [];
  while (minors.length < 140){
    const v = new THREE.Vector3(rnd() * 2 - 1, (rnd() * 2 - 1) * .7, rnd() * 2 - 1);
    if (v.length() > 1) continue;
    v.multiplyScalar(17);
    if (v.length() < 4) continue;
    minors.push(v);
  }
  // links: me to every host, hosts in a ring, each minor node to its nearest earlier node
  type Edge = [THREE.Vector3, THREE.Vector3];
  const edgesMajor: Edge[] = [], edgesMinor: Edge[] = [];
  hostPos.slice(1).forEach((p, i, arr) => { edgesMajor.push([hostPos[0], p]); edgesMajor.push([p, arr[(i + 1) % arr.length]]); });
  const all = [...hostPos];
  minors.forEach(m => {
    let best = all[0], bd = Infinity;
    for (const o of all){ const d = o.distanceTo(m); if (d < bd){ bd = d; best = o; } }
    edgesMinor.push([best, m]);
    if (rnd() < .35){ const o = all[(rnd() * all.length) | 0]; if (o.distanceTo(m) < 9) edgesMinor.push([o, m]); }
    all.push(m);
  });
  const lineGeo = (edges: Edge[]) => new THREE.BufferGeometry().setFromPoints(edges.flatMap(([a, b]) => [a, b]));
  const majorLineMat = new THREE.LineBasicMaterial({ transparent: true, opacity: .7 });
  const minorLineMat = new THREE.LineBasicMaterial({ transparent: true, opacity: .26 });
  group.add(new THREE.LineSegments(lineGeo(edgesMajor), majorLineMat), new THREE.LineSegments(lineGeo(edgesMinor), minorLineMat));

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), v = new THREE.Vector3();
  const minorMat = new THREE.MeshStandardMaterial({ metalness: .3, roughness: .5 });
  const minorMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.09, 0), minorMat, minors.length);
  const minorScale = minors.map(() => .6 + rnd() * 1.2);
  const placeMinors = (blow: number) => {
    minors.forEach((p, i) => { const s = minorScale[i]; v.copy(p).multiplyScalar(1 + blow * (.25 + (i % 7) * .06)); minorMesh.setMatrixAt(i, m4.compose(v, q.identity(), sc.set(s, s, s))); });
    minorMesh.instanceMatrix.needsUpdate = true;
  };
  placeMinors(0);
  group.add(minorMesh);

  // lock-on brackets: four corners that close in on a host when you arrive there
  const bracketGeo = (() => {
    // solid bars, not hairlines, so they still read over a busy glowing scene
    const L = .36, T = .045, parts: THREE.BufferGeometry[] = [];
    for (const [sx, sy] of [[1, 1], [-1, 1], [-1, -1], [1, -1]]){
      parts.push(new THREE.PlaneGeometry(L, T).translate(sx * (1 - L / 2), sy * (1 - T / 2), 0));
      parts.push(new THREE.PlaneGeometry(T, L).translate(sx * (1 - T / 2), sy * (1 - L / 2), 0));
    }
    return mergeGeometries(parts);
  })();
  const columnGeo = new THREE.CylinderGeometry(.04, .04, 1, 8, 1, true);
  const columnMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  const keyholeMat = new THREE.MeshBasicMaterial({ color: 0x050505 });

  // hosts: a solid core inside a slowly turning wire shell
  const hosts = hostIds.slice(1).map((id, i) => {
    const g = new THREE.Group(); g.position.copy(hostPos[i + 1]);
    // every host has its own shape, so you can tell them apart before reading the label
    const core = new THREE.Mesh(SHAPES[id]?.() ?? new THREE.IcosahedronGeometry(.34, 1), new THREE.MeshStandardMaterial({ metalness: .4, roughness: .3, flatShading: true }));
    const shell = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(.75, 1)), new THREE.LineBasicMaterial({ transparent: true, opacity: .55 }));
    // a bigger invisible ball, so the host is easy to hover
    const hit = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 10), new THREE.MeshBasicMaterial({ visible: false }));
    hit.userData.host = id;
    const bracket = new THREE.Mesh(bracketGeo, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, depthTest: false, side: THREE.DoubleSide, toneMapped: false }));
    bracket.renderOrder = 5;
    bracket.visible = false;
    const column = new THREE.Mesh(columnGeo, columnMat.clone()); column.visible = false;
    // projects is locked: its core is a padlock, with a shackle that can try (and fail) to open
    let shackle: THREE.Mesh | null = null;
    if (id === 'projects'){
      shackle = new THREE.Mesh(new THREE.TorusGeometry(.15, .045, 8, 24, Math.PI), core.material); shackle.position.y = .1;
      const hole = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, .25, 12), keyholeMat); hole.rotation.x = Math.PI / 2; hole.position.y = -.05;
      const slot = new THREE.Mesh(new THREE.BoxGeometry(.03, .09, .25), keyholeMat); slot.position.y = -.11;
      core.add(shackle, hole, slot);
    }
    g.add(core, shell, hit, bracket, column); group.add(g);
    return { id, g, core, shell, hit, bracket, column, shackle, flash: -1e9, arriveAt: -1e9, s: 1, sv: 0 };
  });
  // every host has a little satellite circling it while it idles
  const orbitMat = new THREE.MeshBasicMaterial({ toneMapped: false });
  const orbiters = new THREE.InstancedMesh(new THREE.SphereGeometry(.055, 8, 8), orbitMat, hosts.length);
  orbiters.instanceMatrix.setUsage(THREE.DynamicDrawUsage); orbiters.frustumCulled = false;
  group.add(orbiters);

  // the core (me): a glowing crystal inside a wire shell and two rings, no photo
  const ringMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: .8 });
  const ringA = new THREE.Mesh(new THREE.TorusGeometry(1.25, .012, 8, 96), ringMat);
  const ringB = new THREE.Mesh(new THREE.TorusGeometry(1.5, .008, 8, 96), ringMat);
  ringA.rotation.x = Math.PI / 2.4; ringB.rotation.y = Math.PI / 2.6;
  // the core is a raymarched liquid-metal blob: four metaballs melting into one another inside a sphere proxy.
  // It morphs harder when you hover it or arrive somewhere new.
  const coreU = { uCam: { value: new THREE.Vector3() }, uTime: { value: 0 }, uMorph: { value: 0 }, uColor: { value: new THREE.Color() }, uHot: { value: new THREE.Color() }, uDark: { value: 1 } };
  const coreMat = new THREE.ShaderMaterial({ uniforms: coreU, vertexShader: CORE_VERT, fragmentShader: CORE_FRAG });
  const core = new THREE.Mesh(new THREE.SphereGeometry(1.25, 32, 24), coreMat);
  const coreHit = new THREE.Mesh(new THREE.SphereGeometry(1.1, 10, 10), new THREE.MeshBasicMaterial({ visible: false }));
  coreHit.userData.host = 'you'; group.add(coreHit);
  let morph = 0, lastActive = '', morphKick = 0;
  const coreShell = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(.95, 1)), new THREE.LineBasicMaterial({ transparent: true, opacity: .5 }));
  group.add(ringA, ringB, core, coreShell);

  // packets running along the links
  const PACKETS = 240;
  const packetMat = new THREE.MeshBasicMaterial();
  const packets = new THREE.InstancedMesh(new THREE.OctahedronGeometry(.06, 0), packetMat, PACKETS);
  packets.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const flows = Array.from({ length: PACKETS }, () => {
    const major = rnd() < .45, list = major ? edgesMajor : edgesMinor;
    return { e: list[(rnd() * list.length) | 0], speed: .08 + rnd() * .35, off: rnd(), back: rnd() < .5, big: major };
  });
  group.add(packets);

  // data streams: glowing points flowing along arcs from me to every host and back,
  // and around the ring of hosts; the stream to the host you're on runs hot
  const STREAM_N = 34;
  const arcs = hostPos.slice(1).map((p, i) => {
    const mid = p.clone().multiplyScalar(.5), lift = new THREE.Vector3(0, 1, 0).cross(p).normalize().multiplyScalar(1.4).add(new THREE.Vector3(0, 1.2, 0));
    return { id: hostIds[i + 1], curve: new THREE.QuadraticBezierCurve3(hostPos[0], mid.add(lift), p) };
  });
  const ringArcs = hostPos.slice(1).map((p, i, arr) => new THREE.QuadraticBezierCurve3(p, p.clone().add(arr[(i + 1) % arr.length]).multiplyScalar(.5).multiplyScalar(1.25), arr[(i + 1) % arr.length]));
  // every packet is a soft glowing head with a short tail behind it.
  // On arrival a train of packets hands off from the host you left to the one you reached,
  // and the new host throws off a puff of sparks.
  const TRAIL = 4, RING_N = 14, HAND = 56, SPARK = 40;
  const streamCount = arcs.length * STREAM_N * TRAIL + ringArcs.length * RING_N * 2 + HAND + SPARK;
  const streamPos = new Float32Array(streamCount * 3), streamCol = new Float32Array(streamCount * 3), streamSize = new Float32Array(streamCount);
  const streamGeo = new THREE.BufferGeometry();
  streamGeo.setAttribute('position', new THREE.BufferAttribute(streamPos, 3));
  streamGeo.setAttribute('aCol', new THREE.BufferAttribute(streamCol, 3));
  streamGeo.setAttribute('aSize', new THREE.BufferAttribute(streamSize, 1));
  const streamU = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uViewH: { value: 900 }, uOpacity: { value: .95 } }]);
  const streamMat = new THREE.ShaderMaterial({
    uniforms: streamU, transparent: true, depthWrite: false, fog: true,
    vertexShader: `attribute vec3 aCol; attribute float aSize; uniform float uViewH; varying vec3 vC;
      #include <fog_pars_vertex>
      void main(){ vC = aCol; vec4 mvPosition = modelViewMatrix * vec4(position, 1.);
        gl_PointSize = min(64., aSize * uViewH * .5 / -mvPosition.z); gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `uniform float uOpacity; varying vec3 vC;
      #include <fog_pars_fragment>
      void main(){ float r = length(gl_PointCoord - .5); if (r > .5) discard;
        float a = smoothstep(.5, 0., r); float core = smoothstep(.22, 0., r);
        gl_FragColor = vec4(vC * (1. + core * .8), (a * a + core * .5) * uOpacity);
        #include <fog_fragment>
      }`,
  });
  const streams = new THREE.Points(streamGeo, streamMat); streams.frustumCulled = false;
  group.add(streams);
  const burst: Record<string, number> = {};
  const cHot = new THREE.Color(), cDim = new THREE.Color(), cTmp = new THREE.Color(), cBack = new THREE.Color();
  // the handoff train and the sparks
  let handAt = -1e9, handFrom = new THREE.Vector3(), handCurve: THREE.QuadraticBezierCurve3 | null = null, sparkAt = -1e9;
  const sparkAt0 = new THREE.Vector3();
  const sparkDir = Array.from({ length: SPARK }, () => {
    const u = rnd() * 2 - 1, a = rnd() * Math.PI * 2, s = Math.sqrt(1 - u * u);
    return new THREE.Vector3(Math.cos(a) * s, u, Math.sin(a) * s).multiplyScalar(.6 + rnd() * .8);
  });

  let P: Palette | null = null, isDarkPal = true;
  const paint = (pal: Palette) => {
    P = pal;
    majorLineMat.color.copy(pal.ink); minorLineMat.color.copy(pal.ink3);
    minorMat.color.copy(pal.ink3); packetMat.color.copy(pal.signal); ringMat.color.copy(pal.signal);
    coreU.uColor.value.copy(pal.signal); coreU.uHot.value.copy(pal.ink);
    const dark = pal.bg.getHSL({ h: 0, s: 0, l: 0 }).l < .5; isDarkPal = dark; coreU.uDark.value = dark ? 1 : 0;
    if (dark) coreU.uHot.value.set('#ffffff');
    minorMat.color.copy(dark ? pal.ink3 : pal.ink).lerp(pal.bg, dark ? 0 : .35);
    streamMat.blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending; streamU.uOpacity.value = dark ? .95 : .85; streamMat.needsUpdate = true;
    cHot.copy(dark ? new THREE.Color('#ffffff').lerp(pal.signal, .35) : pal.signal); cDim.copy(dark ? pal.signal : pal.signal.clone().lerp(pal.ink, .25)); (coreShell.material as THREE.LineBasicMaterial).color.copy(pal.ink);
    // replies coming back to me are a cooler tint than the requests going out
    cBack.copy(dark ? pal.signal.clone().lerp(new THREE.Color('#7fd8ff'), .55) : pal.ink.clone().lerp(pal.signal, .35));
    hosts.forEach(h => {
      const c = h.id === 'projects' ? pal.alert : pal.signal;
      (h.shell.material as THREE.LineBasicMaterial).color.copy(h.id === 'projects' ? pal.alert : pal.ink);
      (h.bracket.material as THREE.MeshBasicMaterial).color.copy(h.id === 'projects' ? pal.alert : dark ? new THREE.Color('#ffffff') : pal.ink);
      const cm = h.column.material as THREE.MeshBasicMaterial; cm.color.copy(c); cm.blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending; cm.needsUpdate = true;
    });
    orbitMat.color.set('#ffffff');
    hosts.forEach((h, n) => orbiters.setColorAt(n, h.id === 'projects' ? pal.alert : dark ? pal.signal : pal.ink));
    if (orbiters.instanceColor) orbiters.instanceColor.needsUpdate = true;
  };

  let hovered = '', shatterAt = -1e9;
  /** light a host up for a moment (arrival, an nmap scan passing it) */
  const ping = (id: string) => { const h = hosts.find(x => x.id === id); if (h) h.flash = performance.now(); };
  /** send a burst of data to one host (`ping`) */
  const pingBurst = (id: string) => { burst[id] = performance.now(); ping(id); };
  /** blow the network apart and let it fall back together */
  const shatter = () => { shatterAt = performance.now(); };
  const SHATTER_MS = 1500;
  /** the camera has settled on a host: it pops, spins once, the brackets lock on, a column of light
      shoots through it, and a train of packets hands off from where you were */
  let lastArrive = 'you';
  const arrive = (id: string) => {
    const to = hosts.find(x => x.id === id), now = performance.now();
    const fromPos = id === lastArrive ? null : lastArrive === 'you' ? hostPos[0] : hosts.find(x => x.id === lastArrive)?.g.position;
    if (to){
      to.arriveAt = now; to.sv += 7;
      sparkAt = now; sparkAt0.copy(to.g.position);
      if (fromPos){
        handFrom.copy(fromPos); const end = to.g.position.clone(), d = handFrom.distanceTo(end);
        const mid = handFrom.clone().lerp(end, .5).add(new THREE.Vector3(0, 1.6 + d * .18, 0));
        handCurve = new THREE.QuadraticBezierCurve3(handFrom.clone(), mid, end); handAt = now;
      }
      if (id === 'projects') deny();
    }
    if (to) lastArrive = id; else if (id === 'hero' || id === 'you') lastArrive = 'you';
  };
  /** projects is locked: the shackle tries to lift, slams back, and the padlock shakes */
  let denyAt = -1e9;
  const deny = () => { denyAt = performance.now(); ping('projects'); };
  let prevNow = 0;
  const ease3 = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
  /** each host idles in its own way, so it feels alive even when you're not on it */
  const idle = (h: typeof hosts[number], t: number, i: number) => {
    const c = h.core;
    c.scale.set(1, 1, 1);
    switch (h.id){
      case 'progress': c.rotation.set(0, t * .6, 0); c.scale.y = 1 + Math.sin(t * 2.2) * .12; break;           // charging up
      case 'now': c.rotation.set(t * .9 + i, t * 1.3, t * .4); break;                                             // all tangled up, tumbling
      case 'targets': c.rotation.set(Math.sin(t * .8) * .5, t * 1.6, 0); break;                                   // a coin spinning on its edge
      case 'journey': { const st = t * .45, f = st - Math.floor(st); c.rotation.set(.35, (Math.floor(st) + ease3(f / .3)) * Math.PI * 2 / 3, 0); break; } // ticks round, one face at a time
      case 'contact': c.rotation.set(0, t * .4, Math.sin(t * 1.7) * .35); break;                                   // an antenna swaying
      case 'projects': c.rotation.set(Math.sin(t * .7) * .12, Math.sin(t * .5) * .55, 0); break;                   // the padlock turns, warily
      default: c.rotation.set(t * .3 + i, t * .5, 0);
    }
  };

  /** advance one frame; `active` is the host to light up (or 'you' / '' for none) */
  const update = (t: number, active: string, camera?: THREE.Camera) => {
    // liquid core: follows the camera (for the raymarch), morphs on hover and on every new section
    if (camera){ core.updateWorldMatrix(true, false); coreU.uCam.value.copy(camera.position); core.worldToLocal(coreU.uCam.value); }
    if (active !== lastActive){ lastActive = active; morphKick = 1; }
    morphKick = Math.max(0, morphKick - .012);
    morph += ((hovered === 'you' ? 1 : 0) + morphKick * .8 + mBass * 1.1 - morph) * (mBass > morph ? .3 : .06);
    // the beat kicks every host's spring
    if (mBeat > .95 && !beatHeld){ beatHeld = true; hosts.forEach(h => { h.sv += 3.2; }); }
    if (mBeat < .5) beatHeld = false;
    coreU.uTime.value = t; coreU.uMorph.value = morph;
    if (!P) return;
    const now = performance.now();
    // shatter: minor nodes fly out and come back, the links blink out meanwhile
    const u = (now - shatterAt) / SHATTER_MS;
    const blow = u >= 0 && u <= 1 ? Math.sin(u * Math.PI) * (1 - u * .3) : 0;
    if (u >= 0 && u <= 1.05){
      placeMinors(blow);
      majorLineMat.opacity = .7 * (1 - blow * .9); minorLineMat.opacity = .26 * (1 - blow);
      packets.visible = blow < .3; streams.visible = blow < .3;
    }
    const dts = Math.min(.05, prevNow ? (now - prevNow) / 1000 : .016); prevNow = now;
    const camQ = camera?.quaternion;
    hosts.forEach((hst, i) => {
      // hosts float gently, and drift out when the network shatters
      hst.g.position.copy(hostPos[i + 1]).multiplyScalar(1 + blow * .35);
      hst.g.position.y += Math.sin(t * .9 + i * 1.3) * .14;
      idle(hst, t, i);
      const ar = (now - hst.arriveAt) / 1000, arriving = ar >= 0 && ar < 2.4;
      // arrival: one fast extra turn that eases out
      if (arriving) hst.core.rotation.y += ease3(ar / .9) * Math.PI * 2;
      const fl = Math.max(0, 1 - (now - hst.flash) / 700);
      const on = hst.id === active || hst.id === hovered || fl > 0, col = hst.id === 'projects' ? P!.alert : on ? P!.signal : isDarkPal ? P!.ink3 : P!.ink;
      const mat = hst.core.material as THREE.MeshStandardMaterial;
      mat.color.copy(col); mat.emissive.copy(col); mat.emissiveIntensity += ((on ? .9 + fl * 1.5 : .05 + Math.max(0, Math.sin(t * 1.3 + i * 2)) * .12) - mat.emissiveIntensity) * .1;
      // size rides a springy, slightly bouncy spring instead of a plain ease
      const target = (hst.id === active ? 1.3 : hst.id === hovered ? 1.45 : 1) + fl * .3;
      hst.sv += ((target - hst.s) * 170 - hst.sv * 13) * dts; hst.s += hst.sv * dts;
      hst.g.scale.setScalar(Math.max(.2, hst.s));
      // the wire shell bursts outward on arrival and settles back
      const sb = arriving && ar < .7 ? Math.sin(ar / .7 * Math.PI) * .75 : 0;
      hst.shell.scale.setScalar(1 + sb);
      (hst.shell.material as THREE.LineBasicMaterial).opacity = .55 * (1 - sb * .6) + (on ? .2 : Math.sin(t * 1.1 + i) * .08);
      hst.shell.rotation.y = t * (on ? .9 : .25) + (arriving ? ease3(ar / 1.2) * -Math.PI : 0); hst.shell.rotation.x = t * .15;
      // lock-on brackets: they close in from wide and rotate square when you arrive, stay on the host you're at,
      // and show faintly when you hover one
      const bm = hst.bracket.material as THREE.MeshBasicMaterial;
      const want = hst.id === active ? (arriving ? Math.min(1, ar / .15) : .55 + Math.sin(t * 3) * .15) : hst.id === hovered ? .4 : 0;
      bm.opacity += (want - bm.opacity) * .15;
      hst.bracket.visible = bm.opacity > .01 && !!camQ;
      if (hst.bracket.visible && camQ){
        const close = arriving ? ease3(ar / .55) : 1;
        hst.bracket.scale.setScalar((1.15 + (1 - close) * 2.4) * (hst.id === hovered && hst.id !== active ? 1.15 : 1) + Math.sin(t * 3) * .03);
        hst.bracket.quaternion.copy(camQ); hst.bracket.rotateZ((1 - close) * Math.PI / 2);
      }
      // a column of light shoots up and down through the host, then fades
      hst.column.visible = arriving && ar < 1.3;
      if (hst.column.visible){
        const cm = hst.column.material as THREE.MeshBasicMaterial;
        hst.column.scale.set(1 + (1 - ease3(ar / .3)) * 3, ease3(ar / .25) * 16, 1 + (1 - ease3(ar / .3)) * 3);
        cm.opacity = (1 - ar / 1.3) * (isDarkPal ? .75 : .5);
      }
      // the little satellite circling each host
      const oa = t * (on ? 2.2 : .9) + i * 1.7, tilt = .5 + i * .4;
      v.set(Math.cos(oa) * .98, Math.sin(oa) * .98 * Math.sin(tilt), Math.sin(oa) * .98 * Math.cos(tilt)).multiplyScalar(hst.g.scale.x).add(hst.g.position);
      const os = (on ? 1.3 : .9) * hst.g.scale.x;
      orbiters.setMatrixAt(i, m4.compose(v, q.identity(), sc.set(os, os, os)));
      // projects: the shackle tries to lift and gets slammed shut; every few seconds the lock glitches
      if (hst.shackle){
        const dn = (now - denyAt) / 1000;
        const lift = dn < 0 ? 0 : dn < .2 ? ease3(dn / .2) * .12 : dn < .3 ? (1 - (dn - .2) / .1) * .12 : 0;
        hst.shackle.position.y = .1 + Math.max(0, lift);
        const shake = dn > .28 && dn < .8 ? Math.sin(dn * 75) * (.8 - dn) * .22 : 0;
        const glitch = (t * .27) % 1 < .03 ? Math.sin(t * 97) * .05 : 0;
        hst.core.position.set(shake + glitch, 0, 0);
        if (dn > .28 && dn < .8) mat.emissiveIntensity = 2.2;
      }
    });
    orbiters.instanceMatrix.needsUpdate = true;
    ringA.rotation.z = t * .5; ringB.rotation.z = -t * .35;
    coreShell.rotation.set(-t * .15, -t * .25, 0);
    flows.forEach((f, i) => {
      let p = (t * f.speed + f.off) % 1; if (f.back) p = 1 - p;
      v.lerpVectors(f.e[0], f.e[1], p);
      const s3 = f.big ? 1.4 : 1;
      packets.setMatrixAt(i, m4.compose(v, q.identity(), sc.set(s3, s3, s3)));
    });
    packets.instanceMatrix.needsUpdate = true;
    // data streams: requests flow out to every host and replies come back, each packet a glowing head with a tail.
    // The stream to the host you're on runs hot and fast; packets bunch up in little bursts, like real traffic.
    let j = 0;
    const put = (p: THREE.Vector3, c: THREE.Color, s: number) => {
      streamPos[j * 3] = p.x; streamPos[j * 3 + 1] = p.y; streamPos[j * 3 + 2] = p.z;
      streamCol[j * 3] = c.r; streamCol[j * 3 + 1] = c.g; streamCol[j * 3 + 2] = c.b; streamSize[j] = s; j++;
    };
    const HALF = STREAM_N / 2;
    arcs.forEach((a, ai) => {
      const hot = a.id === active || a.id === hovered, b = Math.max(0, 1 - (now - (burst[a.id] ?? -1e9)) / 1600);
      const sp = (hot ? .5 : .14) + b * 1.6;
      for (let n = 0; n < STREAM_N; n++){
        // the first half flows out to the host, the second half comes back; spacing clumps them into bursts
        const out = n < HALF, m = n % HALF, slot = (m + Math.floor(m / 4) * 1.6) / (HALF * 1.4);
        const f = (t * sp * (out ? 1 : .8) + slot + ai * .13) % 1;
        const fade = Math.sin(f * Math.PI), lit = hot || b > 0;
        for (let k = 0; k < TRAIL; k++){
          const fk = Math.max(0, f - k * (.012 + sp * .02));
          a.curve.getPoint(out ? fk : 1 - fk, v);
          const tail = 1 - k / TRAIL;
          cTmp.copy(lit ? (out ? cHot : cBack) : out ? cDim : cBack).multiplyScalar((lit ? 1 : .5) * (.3 + fade * .7) * tail);
          put(v, cTmp, (lit ? .34 : .24) * (.45 + tail * .55) * (k === 0 ? 1 : .8));
        }
      }
    });
    ringArcs.forEach(c => {
      for (let n = 0; n < RING_N; n++){
        const f = (t * .07 + n / RING_N) % 1;
        for (let k = 0; k < 2; k++){
          c.getPoint(Math.max(0, f - k * .015), v);
          cTmp.copy(cDim).multiplyScalar((.45 * Math.sin(f * Math.PI) + .1) * (k ? .5 : 1));
          put(v, cTmp, k ? .12 : .18);
        }
      }
    });
    // handoff: a train of packets arcs from the host you left to the one you reached
    const hu = (now - handAt) / 1100;
    for (let n = 0; n < HAND; n++){
      const u = hu * 1.35 - n * .0065;
      if (!handCurve || u < 0 || u > 1){ put(v.set(0, 0, 0), cTmp.setRGB(0, 0, 0), 0); continue; }
      handCurve.getPoint(u, v);
      const tail = 1 - n / HAND;
      cTmp.copy(cHot).multiplyScalar(.4 + tail * .9);
      put(v, cTmp, .16 + tail * .3);
    }
    // sparks off the host you just reached
    const su = (now - sparkAt) / 900;
    for (let n = 0; n < SPARK; n++){
      if (su < 0 || su > 1){ put(v.set(0, 0, 0), cTmp.setRGB(0, 0, 0), 0); continue; }
      v.copy(sparkDir[n]).multiplyScalar(ease3(su) * 2.2).add(sparkAt0); v.y -= su * su * .6;
      cTmp.copy(cHot).multiplyScalar(1 - su);
      put(v, cTmp, .22 * (1 - su * .6));
    }
    streamGeo.attributes.position.needsUpdate = true; streamGeo.attributes.aCol.needsUpdate = true; streamGeo.attributes.aSize.needsUpdate = true;
  };
  const hitTargets = [coreHit, ...hosts.map(h => h.hit)];
  const hover = (id: string) => { hovered = id; };

  /** reduced motion: the moving data (packets, streams) stays hidden */
  const setCalm = (on: boolean) => { packets.visible = !on; streams.visible = !on; };
  /** the canvas height in device pixels, so packets keep their size on any screen */
  const setViewHeight = (px: number) => { streamU.uViewH.value = px; };
  /** the song playing on the page: bass makes the core swell, each beat bumps the hosts */
  let mBass = 0, mBeat = 0, beatHeld = false;
  const setMusic = (bass: number, beat: number) => { mBass = bass; mBeat = beat; };

  return { group, paint, update, ping, pingBurst, shatter, hover, hitTargets, minorMesh, setCalm, arrive, deny, setViewHeight, setMusic };
}

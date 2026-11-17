/* ==========================================================================
   NETWORK.TS — the 3D network shared by the home page (breach.ts) and every
   section page's hero (hostscene.ts): a glowing core inside two rings, six
   section hosts, ~140 minor nodes, and packets running along the links.
   Same seed every time, so the network looks the same on every page.
   ========================================================================== */
import * as THREE from 'three';
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

const SHAPES: Record<string, () => THREE.BufferGeometry> = {
  progress: () => new THREE.CylinderGeometry(.26, .3, .62, 6),            // a semester pillar
  now: () => new THREE.TorusKnotGeometry(.2, .065, 72, 8),                 // courses, all tangled up
  targets: () => new THREE.TorusGeometry(.28, .1, 10, 28),                 // a target ring
  projects: () => new THREE.BoxGeometry(.5, .5, .5),                       // the locked cube
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

  // hosts: a solid core inside a slowly turning wire shell
  const hosts = hostIds.slice(1).map((id, i) => {
    const g = new THREE.Group(); g.position.copy(hostPos[i + 1]);
    // every host has its own shape, so you can tell them apart before reading the label
    const core = new THREE.Mesh(SHAPES[id]?.() ?? new THREE.IcosahedronGeometry(.34, 1), new THREE.MeshStandardMaterial({ metalness: .4, roughness: .3, flatShading: true }));
    const shell = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(.75, 1)), new THREE.LineBasicMaterial({ transparent: true, opacity: .55 }));
    // a bigger invisible ball, so the host is easy to hover
    const hit = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 10), new THREE.MeshBasicMaterial({ visible: false }));
    hit.userData.host = id;
    g.add(core, shell, hit); group.add(g);
    return { id, g, core, shell, hit, flash: -1e9 };
  });

  // the core (me): a glowing crystal inside a wire shell and two rings, no photo
  const ringMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: .8 });
  const ringA = new THREE.Mesh(new THREE.TorusGeometry(1.25, .012, 8, 96), ringMat);
  const ringB = new THREE.Mesh(new THREE.TorusGeometry(1.5, .008, 8, 96), ringMat);
  ringA.rotation.x = Math.PI / 2.4; ringB.rotation.y = Math.PI / 2.6;
  const coreMat = new THREE.MeshStandardMaterial({ metalness: .2, roughness: .25, emissiveIntensity: .7, flatShading: true });
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(.55, 0), coreMat);
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
  const streamCount = arcs.length * STREAM_N + ringArcs.length * 14;
  const streamPos = new Float32Array(streamCount * 3), streamCol = new Float32Array(streamCount * 3);
  const streamGeo = new THREE.BufferGeometry();
  streamGeo.setAttribute('position', new THREE.BufferAttribute(streamPos, 3));
  streamGeo.setAttribute('color', new THREE.BufferAttribute(streamCol, 3));
  const streamMat = new THREE.PointsMaterial({ size: .16, vertexColors: true, transparent: true, depthWrite: false, opacity: .95 });
  const streams = new THREE.Points(streamGeo, streamMat); streams.frustumCulled = false;
  group.add(streams);
  const burst: Record<string, number> = {};
  const cHot = new THREE.Color(), cDim = new THREE.Color(), cTmp = new THREE.Color();

  let P: Palette | null = null, isDarkPal = true;
  const paint = (pal: Palette) => {
    P = pal;
    majorLineMat.color.copy(pal.ink); minorLineMat.color.copy(pal.ink3);
    minorMat.color.copy(pal.ink3); packetMat.color.copy(pal.signal); ringMat.color.copy(pal.signal);
    coreMat.color.copy(pal.signal); coreMat.emissive.copy(pal.signal);
    const dark = pal.bg.getHSL({ h: 0, s: 0, l: 0 }).l < .5; isDarkPal = dark;
    minorMat.color.copy(dark ? pal.ink3 : pal.ink).lerp(pal.bg, dark ? 0 : .35);
    streamMat.blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending; streamMat.size = dark ? .16 : .12; streamMat.needsUpdate = true;
    cHot.copy(dark ? new THREE.Color('#ffffff').lerp(pal.signal, .35) : pal.signal); cDim.copy(dark ? pal.signal : pal.signal.clone().lerp(pal.ink, .25)); (coreShell.material as THREE.LineBasicMaterial).color.copy(pal.ink);
    hosts.forEach(h => (h.shell.material as THREE.LineBasicMaterial).color.copy(h.id === 'projects' ? pal.alert : pal.ink));
  };

  let hovered = '', shatterAt = -1e9;
  /** light a host up for a moment (arrival, an nmap scan passing it) */
  const ping = (id: string) => { const h = hosts.find(x => x.id === id); if (h) h.flash = performance.now(); };
  /** send a burst of data to one host (`ping`) */
  const pingBurst = (id: string) => { burst[id] = performance.now(); ping(id); };
  /** blow the network apart and let it fall back together */
  const shatter = () => { shatterAt = performance.now(); };
  const SHATTER_MS = 1500;

  /** advance one frame; `active` is the host to light up (or 'you' / '' for none) */
  const update = (t: number, active: string) => {
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
    hosts.forEach((hst, i) => {
      // hosts float gently, and drift out when the network shatters
      hst.g.position.copy(hostPos[i + 1]).multiplyScalar(1 + blow * .35);
      hst.g.position.y += Math.sin(t * .9 + i * 1.3) * .14;
      hst.core.rotation.set(t * .3 + i, t * .5, 0);
      const fl = Math.max(0, 1 - (now - hst.flash) / 700);
      const on = hst.id === active || hst.id === hovered || fl > 0, col = hst.id === 'projects' ? P!.alert : on ? P!.signal : isDarkPal ? P!.ink3 : P!.ink;
      const mat = hst.core.material as THREE.MeshStandardMaterial;
      mat.color.copy(col); mat.emissive.copy(col); mat.emissiveIntensity += ((on ? .9 + fl * 1.5 : .05) - mat.emissiveIntensity) * .1;
      const target = (hst.id === active ? 1.3 : hst.id === hovered ? 1.45 : 1) + fl * .5;
      hst.g.scale.setScalar(hst.g.scale.x + (target - hst.g.scale.x) * .1);
      hst.shell.rotation.y = t * (on ? .9 : .25); hst.shell.rotation.x = t * .15;
    });
    ringA.rotation.z = t * .5; ringB.rotation.z = -t * .35;
    core.rotation.set(t * .4, t * .6, 0); coreShell.rotation.set(-t * .15, -t * .25, 0);
    flows.forEach((f, i) => {
      let p = (t * f.speed + f.off) % 1; if (f.back) p = 1 - p;
      v.lerpVectors(f.e[0], f.e[1], p);
      const s3 = f.big ? 1.4 : 1;
      packets.setMatrixAt(i, m4.compose(v, q.identity(), sc.set(s3, s3, s3)));
    });
    packets.instanceMatrix.needsUpdate = true;
    // data streams
    let j = 0;
    arcs.forEach(a => {
      const hot = a.id === active || a.id === hovered, b = Math.max(0, 1 - (now - (burst[a.id] ?? -1e9)) / 1600);
      const sp = (hot ? .55 : .16) + b * 1.6;
      for (let n = 0; n < STREAM_N; n++, j++){
        // the first half flows out to the host, the second half comes back
        const out = n < STREAM_N / 2, f = ((t * sp + (n % (STREAM_N / 2)) / (STREAM_N / 2)) % 1);
        a.curve.getPoint(out ? f : 1 - f, v);
        streamPos[j * 3] = v.x; streamPos[j * 3 + 1] = v.y; streamPos[j * 3 + 2] = v.z;
        const fade = Math.sin(f * Math.PI);
        cTmp.copy(hot || b > 0 ? cHot : cDim).multiplyScalar((hot || b > 0 ? 1 : .55) * (.35 + fade * .65));
        streamCol[j * 3] = cTmp.r; streamCol[j * 3 + 1] = cTmp.g; streamCol[j * 3 + 2] = cTmp.b;
      }
    });
    ringArcs.forEach(c => {
      for (let n = 0; n < 14; n++, j++){
        const f = (t * .07 + n / 14) % 1;
        c.getPoint(f, v);
        streamPos[j * 3] = v.x; streamPos[j * 3 + 1] = v.y; streamPos[j * 3 + 2] = v.z;
        cTmp.copy(cDim).multiplyScalar(.45 * Math.sin(f * Math.PI) + .1);
        streamCol[j * 3] = cTmp.r; streamCol[j * 3 + 1] = cTmp.g; streamCol[j * 3 + 2] = cTmp.b;
      }
    });
    streamGeo.attributes.position.needsUpdate = true; streamGeo.attributes.color.needsUpdate = true;
  };
  const hitTargets = hosts.map(h => h.hit);
  const hover = (id: string) => { hovered = id; };

  /** reduced motion: the moving data (packets, streams) stays hidden */
  const setCalm = (on: boolean) => { packets.visible = !on; streams.visible = !on; };

  return { group, paint, update, ping, pingBurst, shatter, hover, hitTargets, minorMesh, setCalm };
}

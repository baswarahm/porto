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
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(.34, 1), new THREE.MeshStandardMaterial({ metalness: .4, roughness: .3 }));
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

  let P: Palette | null = null;
  const paint = (pal: Palette) => {
    P = pal;
    majorLineMat.color.copy(pal.ink); minorLineMat.color.copy(pal.ink3);
    minorMat.color.copy(pal.ink3); packetMat.color.copy(pal.signal); ringMat.color.copy(pal.signal);
    coreMat.color.copy(pal.signal); coreMat.emissive.copy(pal.signal); (coreShell.material as THREE.LineBasicMaterial).color.copy(pal.ink);
    hosts.forEach(h => (h.shell.material as THREE.LineBasicMaterial).color.copy(h.id === 'projects' ? pal.alert : pal.ink));
  };

  let hovered = '', shatterAt = -1e9;
  /** light a host up for a moment (arrival, an nmap scan passing it) */
  const ping = (id: string) => { const h = hosts.find(x => x.id === id); if (h) h.flash = performance.now(); };
  /** blow the network apart and let it fall back together */
  const shatter = () => { shatterAt = performance.now(); };
  const SHATTER_MS = 1500;

  /** advance one frame; `active` is the host to light up (or 'you' / '' for none) */
  const update = (t: number, active: string) => {
    if (!P) return;
    const now = performance.now();
    hosts.forEach(hst => {
      const fl = Math.max(0, 1 - (now - hst.flash) / 700);
      const on = hst.id === active || hst.id === hovered || fl > 0, col = hst.id === 'projects' ? P!.alert : on ? P!.signal : P!.ink3;
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
    // shatter: minor nodes fly out and come back, the links blink out meanwhile
    const u = (now - shatterAt) / SHATTER_MS;
    if (u >= 0 && u <= 1.05){
      const blow = Math.sin(Math.min(1, u) * Math.PI) * (1 - Math.min(1, u) * .3);
      placeMinors(u > 1 ? 0 : blow);
      majorLineMat.opacity = .7 * (1 - blow * .9); minorLineMat.opacity = .26 * (1 - blow);
      packets.visible = blow < .3;
      hosts.forEach((h, i) => h.g.position.copy(hostPos[i + 1]).multiplyScalar(1 + blow * .35));
    }
  };
  const hitTargets = hosts.map(h => h.hit);
  const hover = (id: string) => { hovered = id; };

  return { group, paint, update, ping, shatter, hover, hitTargets };
}

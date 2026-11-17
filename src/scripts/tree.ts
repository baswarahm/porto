/* ==========================================================================
   TREE.TS — my whole four-year curriculum as a glowing 3D tech tree.
   The trunk is the degree, one ring per semester from year 1 (bottom) to
   year 4 (top). Every course is a node on a branch of its track (core CS,
   intelligent computing, project + industry), linked to the course before
   it on the same track. Done semesters glow, this semester pulses, the
   rest are locked wireframes. Orbit it, hover a node, click to read it.
   (The study plan has no prerequisite data, so branches follow the track
   and the semester order rather than invented prerequisites.)
   ========================================================================== */
import * as THREE from 'three';
import { openRoom, picker } from './overlay3d';
import { cssVar, reducedMotion } from './env';

interface PlanCourse { code: string; name: string; track?: 'core' | 'ic' | 'fyp'; credits?: number }
interface PlanSem { state: string; fill: number; courses: PlanCourse[] }
const TRACKS = { core: { label: 'core CS', c: '--b1', at: 0, spread: 1.25 }, ic: { label: 'intelligent computing', c: '--b2', at: 2.55, spread: .55 }, fyp: { label: 'project + industry', c: '--b4', at: 4.2, spread: .45 } } as const;

export function openTree(){
  const plan: PlanSem[] = JSON.parse(document.getElementById('world')?.dataset.world ?? '{}').plan ?? [];
  if (!plan.length) return;
  const legend = `<ul class="room-legend">${Object.values(TRACKS).map(t => `<li style="--c:var(${t.c})"><i></i>${t.label}</li>`).join('')}
    <li class="st"><i class="done"></i>done</li><li class="st"><i class="now"></i>this semester</li><li class="st"><i class="lock"></i>ahead</li></ul>`;
  const room = openRoom({ title: 'Skill tree', sub: 'curriculum.tree · B.CS Intelligent Computing · USM', label: 'My curriculum as a 3D skill tree', legend });
  const { scene, camera, controls, el } = room;
  camera.position.set(0, 9, 28); controls.target.set(0, 7, 0); controls.minDistance = 8; controls.maxDistance = 55;
  scene.add(new THREE.AmbientLight(0xffffff, .5));
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(6, 20, 12); scene.add(key);
  const col = (v: string) => new THREE.Color(cssVar(v));
  const ink3 = col('--ink-3'), signal = col('--signal');

  const LEVEL = 2.05;
  // trunk + semester rings
  const trunkMat = new THREE.MeshStandardMaterial({ color: ink3, metalness: .5, roughness: .4 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.16, .3, LEVEL * plan.length + 1.5, 12), trunkMat);
  trunk.position.y = LEVEL * plan.length / 2 - .9; scene.add(trunk);
  const grow: { obj: THREE.Object3D; at: number; s: number }[] = [];
  const rings: { m: THREE.Mesh; now: boolean }[] = [];
  plan.forEach((sem, i) => {
    const done = sem.state === 'done', now = sem.state === 'now';
    const m = new THREE.Mesh(new THREE.TorusGeometry(.62, .035, 8, 48), new THREE.MeshBasicMaterial({ color: done || now ? signal : ink3, transparent: true, opacity: done ? .9 : now ? 1 : .35, toneMapped: false }));
    m.rotation.x = Math.PI / 2; m.position.y = i * LEVEL; scene.add(m); rings.push({ m, now });
    grow.push({ obj: m, at: i * .22, s: 1 });
  });

  // course nodes
  type Node = { m: THREE.Mesh; c: PlanCourse; sem: number; state: string; pos: THREE.Vector3 };
  const nodes: Node[] = [];
  const byTrack: Record<string, Node[][]> = { core: [], ic: [], fyp: [] };
  plan.forEach((sem, i) => {
    (Object.keys(TRACKS) as (keyof typeof TRACKS)[]).forEach(tk => {
      const list = sem.courses.filter(c => (c.track ?? 'core') === tk);
      const T = TRACKS[tk], r = 2.3 + i * .42;
      byTrack[tk][i] = list.map((c, j) => {
        const a = T.at + (list.length > 1 ? (j / (list.length - 1) - .5) * 2 * T.spread : 0);
        const pos = new THREE.Vector3(Math.cos(a) * r, i * LEVEL + .35, Math.sin(a) * r);
        const size = .2 + (c.credits ?? 3) * .025;
        const color = col(T.c);
        const mat = sem.state === 'future'
          ? new THREE.MeshBasicMaterial({ color: color.clone().lerp(ink3, .45), wireframe: true, transparent: true, opacity: .6 })
          : new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: sem.state === 'now' ? 1.4 : .7, metalness: .3, roughness: .3 });
        const m = new THREE.Mesh(new THREE.OctahedronGeometry(size, sem.state === 'future' ? 0 : 1), mat);
        m.position.copy(pos); scene.add(m);
        const n: Node = { m, c, sem: i, state: sem.state, pos }; nodes.push(n); m.userData.node = n;
        grow.push({ obj: m, at: i * .22 + .1 + j * .05, s: 1 });
        return n;
      });
    });
  });
  // branches: each course links to the nearest course on the same track in the semester before it,
  // or to the trunk when it is the first of its track
  const branchPts: { a: THREE.Vector3; b: THREE.Vector3; color: THREE.Color; on: boolean; at: number }[] = [];
  (Object.keys(TRACKS) as (keyof typeof TRACKS)[]).forEach(tk => {
    let prev: Node[] = [];
    byTrack[tk].forEach((list, i) => {
      if (!list?.length) return;
      list.forEach(n => {
        const src = prev.length ? prev.reduce((b, p) => p.pos.distanceTo(n.pos) < b.pos.distanceTo(n.pos) ? p : b).pos : new THREE.Vector3(0, i * LEVEL, 0);
        branchPts.push({ a: src, b: n.pos, color: col(TRACKS[tk].c), on: n.state !== 'future', at: i * .22 + .15 });
      });
      prev = list;
    });
  });
  const branches = branchPts.map(bp => {
    const mid = bp.a.clone().lerp(bp.b, .5).add(new THREE.Vector3(0, .5, 0));
    const curve = new THREE.QuadraticBezierCurve3(bp.a, mid, bp.b);
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(24)),
      new THREE.LineBasicMaterial({ color: bp.on ? bp.color : bp.color.clone().lerp(ink3, .6), transparent: true, opacity: bp.on ? .85 : .3 }));
    line.geometry.setDrawRange(0, 0); scene.add(line);
    return { line, at: bp.at, curve, on: bp.on };
  });
  // sap: points rising up the lit branches
  const SAP = 260, sapPos = new Float32Array(SAP * 3);
  const sap = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(sapPos, 3)),
    new THREE.PointsMaterial({ color: signal, size: .12, transparent: true, opacity: .9, depthWrite: false, blending: room.dark ? THREE.AdditiveBlending : THREE.NormalBlending }));
  sap.frustumCulled = false; scene.add(sap);
  const lit = branches.filter(b => b.on);
  const sapOf = Array.from({ length: SAP }, (_, i) => ({ b: lit[i % Math.max(1, lit.length)], o: Math.random(), sp: .25 + Math.random() * .4 }));
  // floor
  const grid = new THREE.GridHelper(60, 60, ink3, ink3); (grid.material as THREE.Material).transparent = true; (grid.material as THREE.LineBasicMaterial).opacity = .18; grid.position.y = -1; scene.add(grid);
  grow.forEach(g => g.obj.scale.setScalar(.001));

  // hover + click
  const tip = el.querySelector<HTMLElement>('.room-tip')!, card = el.querySelector<HTMLElement>('.room-card')!;
  const pk = picker(room, () => nodes.map(n => n.m));
  let hover: Node | null = null;
  const describe = (n: Node) => {
    const T = TRACKS[(n.c.track ?? 'core') as keyof typeof TRACKS];
    const status = n.state === 'done' ? 'done' : n.state === 'now' ? 'taking it this semester' : 'ahead, locked for now';
    card.innerHTML = `<p class="room-k">${n.c.code} · Year ${Math.floor(n.sem / 2) + 1}, semester ${n.sem % 2 + 1}</p><h3>${n.c.name}</h3>
      <p>${n.c.credits ?? 3} credits · ${T.label}</p><p class="st ${n.state}">${status}</p>`;
    card.hidden = false;
  };
  room.canvas.addEventListener('click', () => { if (hover) describe(hover); });

  room.onFrame = (t, dt) => {
    // the tree grows in, semester by semester
    grow.forEach(g => { const k = reducedMotion ? 1 : THREE.MathUtils.clamp((t - g.at) / .45, 0, 1); g.obj.scale.setScalar(Math.max(.001, (1 - Math.pow(1 - k, 3)) * g.s)); });
    branches.forEach(b => { const k = reducedMotion ? 1 : THREE.MathUtils.clamp((t - b.at) / .5, 0, 1); b.line.geometry.setDrawRange(0, Math.round(25 * k)); });
    rings.forEach(r => { if (r.now) r.m.scale.setScalar(1 + Math.sin(t * 4) * .12); });
    nodes.forEach(n => { n.m.rotation.y = t * .6 + n.sem; if (n.state === 'now') n.m.scale.setScalar(1 + Math.sin(t * 4 + n.pos.x) * .15); });
    sapOf.forEach((s, i) => { if (!s.b) return; s.b.curve.getPoint(reducedMotion ? s.o : (t * s.sp + s.o) % 1).toArray(sapPos, i * 3); });
    sap.geometry.attributes.position.needsUpdate = true;
    // hover
    const hit = pk.pick(); const n = (hit?.object.userData.node as Node | undefined) ?? null;
    if (n !== hover){
      if (hover) hover.m.scale.setScalar(1);
      hover = n; room.canvas.style.cursor = n ? 'pointer' : '';
      tip.classList.toggle('on', !!n); if (n) tip.textContent = `${n.c.code} · ${n.c.name}`;
    }
    if (hover){ hover.m.scale.setScalar(1.5); tip.style.transform = `translate(${((pk.mouse.x + 1) / 2 * innerWidth + 16).toFixed(0)}px, ${((1 - pk.mouse.y) / 2 * innerHeight + 12).toFixed(0)}px)`; }
    void dt;
  };
  return room;
}

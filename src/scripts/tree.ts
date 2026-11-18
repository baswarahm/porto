/* ==========================================================================
   TREE.TS — my whole four-year curriculum as a glowing 3D tech tree.
   The trunk is the degree, one ring per semester from year 1 (bottom) to
   year 4 (top). Every course is a node on a branch of its track (core CS,
   intelligent computing, project + industry), linked to the course before
   it on the same track. Done semesters glow, this semester pulses, the
   rest are locked wireframes.
   Interaction:
     · hover a node: its whole path down to the trunk lights up, the rest dims
     · click it: the camera flies to it, a halo locks on, a card opens with
       the path and buttons to step along the track
     · keyboard: arrows move between courses (left/right in a semester,
       up/down between semesters), Enter opens one, Esc steps back, then closes
     · the legend filters by track; click empty space to fly back out
   (The study plan has no prerequisite data, so branches follow the track
   and the semester order rather than invented prerequisites.)
   ========================================================================== */
import * as THREE from 'three';
import { openRoom, picker } from './overlay3d';
import { cssVar, reducedMotion } from './env';

interface PlanCourse { code: string; name: string; track?: 'core' | 'ic' | 'fyp'; credits?: number }
interface PlanSem { state: string; fill: number; courses: PlanCourse[] }
const TRACKS = { core: { label: 'core CS', c: '--b1', at: 0, spread: 1.25 }, ic: { label: 'intelligent computing', c: '--b2', at: 2.55, spread: .55 }, fyp: { label: 'project + industry', c: '--b4', at: 4.2, spread: .45 } } as const;
type TrackId = keyof typeof TRACKS;
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

export function openTree(){
  const plan: PlanSem[] = JSON.parse(document.getElementById('world')?.dataset.world ?? '{}').plan ?? [];
  if (!plan.length) return;
  const legend = `<ul class="room-legend">${(Object.keys(TRACKS) as TrackId[]).map(k => `<li style="--c:var(${TRACKS[k].c})"><button type="button" class="leg-btn" data-track="${k}" aria-pressed="false"><i></i>${TRACKS[k].label}</button></li>`).join('')}
    <li class="st"><i class="done"></i>done</li><li class="st"><i class="now"></i>this semester</li><li class="st"><i class="lock"></i>ahead</li></ul>`;
  const room = openRoom({ title: 'Skill tree', sub: 'curriculum.tree · B.CS Intelligent Computing · USM', label: 'My curriculum as a 3D skill tree', legend,
    hint: 'drag to orbit · scroll to zoom · click a course · arrow keys to walk the tree · esc to step back' });
  const { scene, camera, controls, el } = room;
  const HOME = { pos: new THREE.Vector3(0, 9, 28), target: new THREE.Vector3(0, 7, 0) };
  camera.position.copy(HOME.pos); controls.target.copy(HOME.target); controls.minDistance = 4; controls.maxDistance = 55;
  scene.add(new THREE.AmbientLight(0xffffff, .5));
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(6, 20, 12); scene.add(key);
  const col = (v: string) => new THREE.Color(cssVar(v));
  const ink3 = col('--ink-3'), signal = col('--signal'), lime = col('--lime');

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

  // semester labels beside the trunk
  const labelSprite = (text: string, color: string, dim: boolean) => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 64;
    const g = c.getContext('2d')!; g.font = '600 30px ui-monospace, Menlo, Consolas, monospace'; g.textBaseline = 'middle';
    g.fillStyle = color; g.globalAlpha = dim ? .55 : 1; g.fillText(text, 8, 34);
    const tx = new THREE.CanvasTexture(c); tx.anisotropy = 4;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, depthWrite: false, toneMapped: false }));
    s.scale.set(2, .5, 1); return s;
  };
  const semLabels = plan.map((sem, i) => {
    const s = labelSprite(`Y${Math.floor(i / 2) + 1} · S${i % 2 + 1}${sem.state === 'now' ? '  ●' : ''}`, cssVar(sem.state === 'future' ? '--ink-3' : sem.state === 'now' ? '--lime' : '--ink'), sem.state === 'future');
    s.position.set(-1.9, i * LEVEL + .05, 0); scene.add(s); grow.push({ obj: s, at: i * .22 + .05, s: 1 });
    s.userData.base = s.scale.clone();
    return s;
  });

  // course nodes
  type Node = { m: THREE.Mesh; mat: THREE.MeshStandardMaterial | THREE.MeshBasicMaterial; c: PlanCourse; track: TrackId; sem: number; idx: number; state: string; pos: THREE.Vector3; parent: Node | null; next: Node[]; base: number };
  const nodes: Node[] = [];
  const byTrack: Record<TrackId, Node[][]> = { core: [], ic: [], fyp: [] };
  plan.forEach((sem, i) => {
    (Object.keys(TRACKS) as TrackId[]).forEach(tk => {
      const list = sem.courses.filter(c => (c.track ?? 'core') === tk);
      const T = TRACKS[tk], r = 2.3 + i * .42;
      byTrack[tk][i] = list.map((c, j) => {
        const a = T.at + (list.length > 1 ? (j / (list.length - 1) - .5) * 2 * T.spread : 0);
        const pos = new THREE.Vector3(Math.cos(a) * r, i * LEVEL + .35, Math.sin(a) * r);
        const color = col(T.c);
        const mat = sem.state === 'future'
          ? new THREE.MeshBasicMaterial({ color: color.clone().lerp(ink3, .45), wireframe: true, transparent: true, opacity: .6 })
          : new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: sem.state === 'now' ? 1.4 : .7, metalness: .3, roughness: .3, transparent: true });
        const m = new THREE.Mesh(new THREE.OctahedronGeometry(.2 + (c.credits ?? 3) * .025, sem.state === 'future' ? 0 : 1), mat);
        m.position.copy(pos); scene.add(m);
        const n: Node = { m, mat, c, track: tk, sem: i, idx: 0, state: sem.state, pos, parent: null, next: [], base: sem.state === 'future' ? .6 : 1 };
        nodes.push(n); m.userData.node = n;
        grow.push({ obj: m, at: i * .22 + .1 + j * .05, s: 1 });
        return n;
      });
    });
  });
  // reading order inside each semester (round the trunk), used by the arrow keys
  const bySem: Node[][] = plan.map((_, i) => nodes.filter(n => n.sem === i).sort((a, b) => Math.atan2(a.pos.z, a.pos.x) - Math.atan2(b.pos.z, b.pos.x)));
  bySem.forEach(list => list.forEach((n, k) => { n.idx = k; }));

  // branches: each course links to the nearest course on the same track in the semester before it,
  // or to the trunk when it is the first of its track
  type Branch = { line: THREE.Line; mat: THREE.LineBasicMaterial; to: Node; at: number; curve: THREE.QuadraticBezierCurve3; on: boolean; color: THREE.Color; base: number };
  const branches: Branch[] = [];
  (Object.keys(TRACKS) as TrackId[]).forEach(tk => {
    let prev: Node[] = [];
    byTrack[tk].forEach((list, i) => {
      if (!list?.length) return;
      list.forEach(n => {
        const par = prev.length ? prev.reduce((b, p) => p.pos.distanceTo(n.pos) < b.pos.distanceTo(n.pos) ? p : b) : null;
        n.parent = par; par?.next.push(n);
        const a = par ? par.pos : new THREE.Vector3(0, i * LEVEL, 0);
        const mid = a.clone().lerp(n.pos, .5).add(new THREE.Vector3(0, .5, 0));
        const curve = new THREE.QuadraticBezierCurve3(a, mid, n.pos);
        const on = n.state !== 'future', color = col(TRACKS[tk].c);
        const mat = new THREE.LineBasicMaterial({ color: on ? color : color.clone().lerp(ink3, .6), transparent: true, opacity: on ? .85 : .3 });
        const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(24)), mat);
        line.geometry.setDrawRange(0, 0); scene.add(line);
        branches.push({ line, mat, to: n, at: i * .22 + .15, curve, on, color, base: on ? .85 : .3 });
      });
      prev = list;
    });
  });
  const chainOf = (n: Node | null) => { const s = new Set<Node>(); for (let p = n; p; p = p.parent) s.add(p); return s; };

  // sap: points rising up the lit branches; when a path is focused, they all run along that path
  const SAP = 260, sapPos = new Float32Array(SAP * 3);
  const sapMat = new THREE.PointsMaterial({ color: signal, size: .12, transparent: true, opacity: .9, depthWrite: false, blending: room.dark ? THREE.AdditiveBlending : THREE.NormalBlending });
  const sap = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(sapPos, 3)), sapMat);
  sap.frustumCulled = false; scene.add(sap);
  const lit = branches.filter(b => b.on);
  const sapOf = Array.from({ length: SAP }, (_, i) => ({ i, o: Math.random(), sp: .25 + Math.random() * .4 }));
  // floor
  const grid = new THREE.GridHelper(60, 60, ink3, ink3); (grid.material as THREE.Material).transparent = true; (grid.material as THREE.LineBasicMaterial).opacity = .18; grid.position.y = -1; scene.add(grid);
  grow.forEach(g => { g.obj.userData.s0 = g.obj.scale.clone(); g.obj.scale.setScalar(.001); });

  // the halo that locks on to the selected course
  const haloMat = new THREE.MeshBasicMaterial({ color: lime, transparent: true, opacity: 0, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
  const halo = new THREE.Mesh(new THREE.RingGeometry(.52, .58, 48), haloMat); halo.visible = false; scene.add(halo);
  const halo2 = new THREE.Mesh(new THREE.RingGeometry(.7, .72, 4, 1), haloMat); halo.add(halo2);

  // ---- state
  const tip = el.querySelector<HTMLElement>('.room-tip')!, card = el.querySelector<HTMLElement>('.room-card')!;
  const pk = picker(room, () => nodes.map(n => n.m));
  let hover: Node | null = null, sel: Node | null = null, cursor: Node | null = null, selAt = 0, trackOn: TrackId | null = null;
  let fly: { p0: THREE.Vector3; t0: THREE.Vector3; p1: THREE.Vector3; t1: THREE.Vector3; at: number; dur: number } | null = null;
  let clock = 0;
  const flyTo = (pos: THREE.Vector3, target: THREE.Vector3) => {
    controls.autoRotate = false;
    if (reducedMotion){ camera.position.copy(pos); controls.target.copy(target); fly = null; return; }
    fly = { p0: camera.position.clone(), t0: controls.target.clone(), p1: pos.clone(), t1: target.clone(), at: clock, dur: .9 };
  };
  const flyToNode = (n: Node) => {
    // keep the current viewing angle, swing in close, and look slightly down on it
    const dir = camera.position.clone().sub(controls.target).setY(0).normalize();
    if (dir.lengthSq() < .01) dir.set(0, 0, 1);
    const out = n.pos.clone().setY(0).normalize();
    dir.lerp(out, .6).normalize();
    flyTo(n.pos.clone().addScaledVector(dir, 6.5).add(new THREE.Vector3(0, 2.2, 0)), n.pos);
  };

  const statusOf = (n: Node) => n.state === 'done' ? 'done' : n.state === 'now' ? 'taking it this semester' : 'ahead, locked for now';
  const nodeBtn = (n: Node | null, label: string, dir: string) => n
    ? `<button type="button" class="key tree-step" data-go="${nodes.indexOf(n)}" aria-label="${dir}: ${esc(n.c.code)} ${esc(n.c.name)}"><span>${label}</span></button>` : '';
  const describe = (n: Node) => {
    const T = TRACKS[n.track];
    const path = [...chainOf(n)].reverse();
    const sibs = bySem[n.sem];
    card.innerHTML = `<p class="room-k">${esc(n.c.code)} · Year ${Math.floor(n.sem / 2) + 1}, semester ${n.sem % 2 + 1}</p><h3>${esc(n.c.name)}</h3>
      <p>${n.c.credits ?? 3} credits · <span class="tree-track" style="--c:var(${T.c})">${T.label}</span></p><p class="st ${n.state}">${statusOf(n)}</p>
      <p class="tree-path" aria-label="Path along the ${T.label} track">${path.map(p => p === n ? `<b>${esc(p.c.code)}</b>` : `<button type="button" class="chip-link" data-go="${nodes.indexOf(p)}">${esc(p.c.code)}</button>`).join('<i aria-hidden="true">→</i>')}</p>
      <div class="tree-steps">
        ${nodeBtn(n.parent, '↓ earlier on track', 'Earlier on this track')}
        ${nodeBtn(n.next[0] ?? null, '↑ later on track', 'Later on this track')}
        ${sibs.length > 1 ? nodeBtn(sibs[(n.idx + 1) % sibs.length], '→ same semester', 'Next course this semester') : ''}
      </div>`;
    card.hidden = false;
  };
  const select = (n: Node | null, fromKey = false) => {
    sel = n; cursor = n ?? cursor; selAt = clock;
    if (n){ describe(n); flyToNode(n); if (fromKey) card.querySelector<HTMLButtonElement>('.tree-step')?.blur(); }
    else { card.hidden = true; flyTo(HOME.pos, HOME.target); }
  };
  card.addEventListener('click', e => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-go]');
    if (!b) return;
    select(nodes[+b.dataset.go!]);
    card.querySelector<HTMLButtonElement>('.tree-step')?.focus({ preventScroll: true });
  });

  // a click (not the end of a drag) picks a course, or flies back out on empty space
  let down: { x: number; y: number } | null = null;
  room.canvas.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; });
  room.canvas.addEventListener('click', e => {
    if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
    if (hover) select(hover);
    else if (sel) select(null);
  });
  // legend: filter by track
  const legBtns = Array.from(el.querySelectorAll<HTMLButtonElement>('.leg-btn'));
  legBtns.forEach(b => b.addEventListener('click', () => {
    const tk = b.dataset.track as TrackId;
    trackOn = trackOn === tk ? null : tk;
    legBtns.forEach(x => x.setAttribute('aria-pressed', String(x.dataset.track === trackOn)));
  }));
  // keyboard: walk the tree
  room.onKey = e => {
    if ((e.target as HTMLElement).closest?.('button') && (e.key === 'Enter' || e.key === ' ')) return;   // let buttons work
    const cur = cursor ?? bySem[plan.findIndex(s => s.state === 'now')]?.[0] ?? nodes[0];
    let to: Node | null = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft'){
      const list = bySem[cur.sem], d = e.key === 'ArrowRight' ? 1 : -1;
      to = cursor ? list[(cur.idx + d + list.length) % list.length] : cur;
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown'){
      const d = e.key === 'ArrowUp' ? 1 : -1;
      for (let s = cur.sem + d; s >= 0 && s < plan.length && !to; s += d){
        const list = bySem[s]; if (!list.length) continue;
        // the course in that semester closest round the trunk
        const a0 = Math.atan2(cur.pos.z, cur.pos.x);
        to = list.reduce((b, n) => Math.abs(Math.atan2(n.pos.z, n.pos.x) - a0) < Math.abs(Math.atan2(b.pos.z, b.pos.x) - a0) ? n : b);
      }
      if (!cursor) to = cur;
    } else if (e.key === 'Enter' || e.key === ' '){
      if (cursor){ e.preventDefault(); select(cursor); }
      return;
    } else if (e.key === 'Home'){ e.preventDefault(); select(null); return; }
    else return;
    e.preventDefault();
    // walking the tree takes focus off whatever button had it (the close key, at first), so Enter opens the course
    if ((document.activeElement as HTMLElement | null)?.closest?.('button')){ el.tabIndex = -1; el.focus({ preventScroll: true }); }
    if (to){ cursor = to; selAt = clock; if (sel) select(to, true); else flyToNode(to); }
  };
  room.onEscape = () => { if (sel || cursor){ sel = null; cursor = null; card.hidden = true; flyTo(HOME.pos, HOME.target); return true; } return false; };

  const tmpV = new THREE.Vector3(), tmpC = new THREE.Color();
  room.onFrame = (t, dt) => {
    clock = t;
    // the tree grows in, semester by semester
    grow.forEach(g => {
      const k = reducedMotion ? 1 : THREE.MathUtils.clamp((t - g.at) / .45, 0, 1), e = Math.max(.001, (1 - Math.pow(1 - k, 3)) * g.s);
      const s0 = g.obj.userData.s0 as THREE.Vector3; g.obj.scale.set(s0.x * e, s0.y * e, s0.z * e);
      g.obj.userData.grown = k >= 1;
    });
    branches.forEach(b => { const k = reducedMotion ? 1 : THREE.MathUtils.clamp((t - b.at) / .5, 0, 1); b.line.geometry.setDrawRange(0, Math.round(25 * k)); });
    rings.forEach(r => { if (r.now) r.m.scale.setScalar(1 + Math.sin(t * 4) * .12); });

    // camera flight
    if (fly){
      const u = Math.min(1, (t - fly.at) / fly.dur), e = u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
      camera.position.lerpVectors(fly.p0, fly.p1, e); controls.target.lerpVectors(fly.t0, fly.t1, e);
      if (u >= 1) fly = null;
    }

    // hover
    const hit = pk.pick(); const n = (hit?.object.userData.node as Node | undefined) ?? null;
    if (n !== hover){
      hover = n; room.canvas.style.cursor = n ? 'pointer' : '';
      tip.classList.toggle('on', !!n); if (n) tip.textContent = `${n.c.code} · ${n.c.name}`;
    }
    if (hover) tip.style.transform = `translate(${((pk.mouse.x + 1) / 2 * innerWidth + 16).toFixed(0)}px, ${((1 - pk.mouse.y) / 2 * innerHeight + 12).toFixed(0)}px)`;

    // focus: the path of what you point at (or picked, or walked to) lights up, the rest dims; a track filter dims the other tracks
    const focusN = hover ?? sel ?? cursor;
    const chain = chainOf(focusN);
    const anyFocus = !!focusN || !!trackOn;
    const k = 1 - Math.exp(-dt * 10);
    nodes.forEach(nd => {
      const inChain = chain.has(nd), inTrack = !trackOn || nd.track === trackOn;
      const want = !anyFocus ? nd.base : inChain ? 1 : inTrack && !focusN ? nd.base : inTrack ? nd.base * .45 : .08;
      nd.mat.opacity += (want - nd.mat.opacity) * k;
      nd.m.rotation.y = t * .6 + nd.sem;
      const grown = !!nd.m.userData.grown, s0 = (nd.m.userData.s0 as THREE.Vector3).x;
      if (grown){
        const pulse = nd.state === 'now' ? 1 + Math.sin(t * 4 + nd.pos.x) * .15 : 1;
        const target = nd === hover ? 1.55 : nd === sel ? 1.4 : inChain && focusN ? 1.15 : 1;
        const cur = nd.m.scale.x / s0; nd.m.scale.setScalar(s0 * (cur + (target * pulse - cur) * k));
      }
      if ('emissiveIntensity' in nd.mat) nd.mat.emissiveIntensity = (nd.state === 'now' ? 1.4 : .7) * (inChain && focusN ? 1.8 : 1);
    });
    branches.forEach(b => {
      const inChain = chain.has(b.to) && !!focusN, inTrack = !trackOn || b.to.track === trackOn;
      const want = !anyFocus ? b.base : inChain ? 1 : inTrack && !focusN ? b.base : inTrack ? b.base * .35 : .05;
      b.mat.opacity += (want - b.mat.opacity) * k;
      b.mat.color.copy(inChain ? tmpC.copy(b.color).lerp(new THREE.Color(0xffffff), room.dark ? .35 : 0) : b.on ? b.color : tmpC.copy(b.color).lerp(ink3, .6));
    });
    semLabels.forEach((s, i) => {
      const m = s.material as THREE.SpriteMaterial;
      m.opacity += ((focusN ? (focusN.sem === i ? 1 : .3) : 1) - m.opacity) * k;
    });

    // sap: along the focused path if there is one, otherwise over every lit branch
    const pathB = focusN ? branches.filter(b => chain.has(b.to)) : [];
    const pool = pathB.length ? pathB : trackOn ? lit.filter(b => b.to.track === trackOn) : lit;
    sapOf.forEach(s => {
      const b = pool[s.i % Math.max(1, pool.length)];
      if (!b){ sapPos[s.i * 3 + 1] = -99; return; }
      b.curve.getPoint(reducedMotion ? s.o : (t * s.sp * (pathB.length ? 1.8 : 1) + s.o) % 1, tmpV).toArray(sapPos, s.i * 3);
    });
    sap.geometry.attributes.position.needsUpdate = true;
    sapMat.size = pathB.length ? .16 : .12;

    // halo: locks on to the selection (or the keyboard cursor), spinning in from wide
    const hn = sel ?? cursor;
    halo.visible = !!hn;
    if (hn){
      const u = Math.min(1, (t - selAt) / .45), e = 1 - Math.pow(1 - u, 3);
      halo.position.copy(hn.pos); halo.quaternion.copy(camera.quaternion);
      halo.rotateZ((1 - e) * Math.PI + t * .6);
      halo.scale.setScalar((reducedMotion ? 1 : 1 + (1 - e) * 2.5) * (1 + Math.sin(t * 5) * .04));
      haloMat.opacity = (sel ? .95 : .6) * (reducedMotion ? 1 : e);
      haloMat.color.copy(hn.state === 'future' ? ink3 : lime);
    }
  };
  return room;
}

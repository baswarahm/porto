/* ==========================================================================
   BANNER.TS — my name on a cloth banner in the hero, simulated for real.
   A Verlet cloth (points + distance constraints, a few relaxation passes a
   frame) hangs from a glowing rod. It moves in Penang's live wind (speed
   and direction from Open-Meteo, plus gusts), and it tears: click it and the
   threads around the spot snap; threads stretched too far snap on their own,
   so a strong gust can widen the rip. Once it's badly torn it stitches
   itself back together after a few seconds.
   ========================================================================== */
import * as THREE from 'three';

const NX = 34, NY = 13;

export function createBanner(opts: { width: number; height: number; name: string; sub: string; lime: string; dark: boolean }){
  const { width: W, height: H } = opts;
  const N = NX * NY, rest = W / (NX - 1), restY = H / (NY - 1);
  const pos = new Float32Array(N * 3), prev = new Float32Array(N * 3), pinned = new Uint8Array(N);
  type C = { a: number; b: number; r: number; on: boolean };
  let cons: C[] = [];
  const idx = (x: number, y: number) => y * NX + x;
  const reset = () => {
    for (let y = 0; y < NY; y++) for (let x = 0; x < NX; x++){
      const i = idx(x, y) * 3;
      pos[i] = (x / (NX - 1) - .5) * W; pos[i + 1] = -y * restY; pos[i + 2] = 0;
      prev[i] = pos[i]; prev[i + 1] = pos[i + 1]; prev[i + 2] = pos[i + 2];
    }
    // pinned to the rod every few points, like rings on a curtain
    pinned.fill(0); for (let x = 0; x < NX; x += 3) pinned[idx(x, 0)] = 1; pinned[idx(NX - 1, 0)] = 1;
    cons = [];
    for (let y = 0; y < NY; y++) for (let x = 0; x < NX; x++){
      if (x < NX - 1) cons.push({ a: idx(x, y), b: idx(x + 1, y), r: rest, on: true });
      if (y < NY - 1) cons.push({ a: idx(x, y), b: idx(x, y + 1), r: restY, on: true });
    }
    cellsDirty = true;
  };

  // ---- the mesh: one quad per cell, dropped when one of its threads snaps
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  const uv = new Float32Array(N * 2);
  for (let y = 0; y < NY; y++) for (let x = 0; x < NX; x++){ uv[idx(x, y) * 2] = x / (NX - 1); uv[idx(x, y) * 2 + 1] = 1 - y / (NY - 1); }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  let cellsDirty = true;
  const edgeOn = new Map<number, boolean>();
  const key = (a: number, b: number) => a < b ? a * N + b : b * N + a;
  const rebuildCells = () => {
    edgeOn.clear(); for (const c of cons) edgeOn.set(key(c.a, c.b), c.on);
    const ix: number[] = [];
    for (let y = 0; y < NY - 1; y++) for (let x = 0; x < NX - 1; x++){
      const a = idx(x, y), b = idx(x + 1, y), c = idx(x, y + 1), d = idx(x + 1, y + 1);
      if (edgeOn.get(key(a, b)) && edgeOn.get(key(a, c)) && edgeOn.get(key(b, d)) && edgeOn.get(key(c, d))) ix.push(a, c, b, b, c, d);
    }
    geo.setIndex(ix); cellsDirty = false;
  };

  // ---- the fabric: dark cloth, my name stitched in glowing thread
  const tex = (() => {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 392; const g = c.getContext('2d')!;
    g.fillStyle = opts.dark ? '#0b0d0f' : '#f2f1ea'; g.fillRect(0, 0, c.width, c.height);
    // a woven look
    g.globalAlpha = .06; g.fillStyle = opts.dark ? '#fff' : '#000';
    for (let y = 0; y < c.height; y += 3) g.fillRect(0, y, c.width, 1);
    for (let x = 0; x < c.width; x += 3) g.fillRect(x, 0, 1, c.height);
    g.globalAlpha = 1;
    g.strokeStyle = opts.lime; g.lineWidth = 4; g.setLineDash([14, 8]); g.strokeRect(18, 18, c.width - 36, c.height - 36); g.setLineDash([]);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = opts.dark ? '#f3f4f0' : '#0b0c0d'; g.font = '700 74px Inter, system-ui, sans-serif';
    let fs = 74; while (g.measureText(opts.name).width > c.width - 110 && fs > 30){ fs -= 2; g.font = `700 ${fs}px Inter, system-ui, sans-serif`; }
    g.fillText(opts.name, c.width / 2, c.height * .44);
    g.fillStyle = opts.lime; g.font = '500 30px ui-monospace, Menlo, Consolas, monospace'; g.fillText(opts.sub, c.width / 2, c.height * .72);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  })();
  const mat = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: new THREE.Color(opts.dark ? .5 : .08, opts.dark ? .5 : .08, opts.dark ? .5 : .08), side: THREE.DoubleSide, roughness: .85, metalness: 0 });
  const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false;
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, W + .5, 10).rotateZ(Math.PI / 2), new THREE.MeshBasicMaterial({ color: opts.lime, toneMapped: false }));
  rod.position.y = .02;
  const group = new THREE.Group(); group.add(mesh, rod);
  reset();

  // ---- physics
  const wind = new THREE.Vector3(.4, 0, -.6);
  let windK = 1, brokenAt = 0;
  const local = new THREE.Vector3();
  const step = (dt: number, t: number) => {
    const sub = 2, h = Math.min(dt, .033) / sub;
    for (let s = 0; s < sub; s++){
      for (let i = 0; i < N; i++){
        if (pinned[i]) continue;
        const k = i * 3, x = pos[k], y = pos[k + 1], z = pos[k + 2];
        // gusts ripple across the cloth
        const gust = .55 + .45 * Math.sin(t * 1.7 + x * .9 + y * .6) * Math.sin(t * .63 + x * .3);
        const fx = wind.x * windK * gust, fz = wind.z * windK * gust * (1 + Math.sin(t * 3.1 + x * 2.1 + y) * .35);
        const vx = (x - prev[k]) * .985, vy = (y - prev[k + 1]) * .985, vz = (z - prev[k + 2]) * .985;
        prev[k] = x; prev[k + 1] = y; prev[k + 2] = z;
        pos[k] = x + vx + fx * h * h * 3.2; pos[k + 1] = y + vy - 9.8 * h * h; pos[k + 2] = z + vz + fz * h * h * 3.2;
      }
      for (let it = 0; it < 4; it++){
        for (const c of cons){
          if (!c.on) continue;
          const a = c.a * 3, b = c.b * 3;
          const dx = pos[b] - pos[a], dy = pos[b + 1] - pos[a + 1], dz = pos[b + 2] - pos[a + 2];
          const d = Math.hypot(dx, dy, dz) || 1e-6;
          if (d > c.r * 2.6){ c.on = false; cellsDirty = true; continue; }   // a thread stretched too far snaps
          const diff = (d - c.r) / d * .5, pa = pinned[c.a], pb = pinned[c.b];
          const ka = pa ? 0 : pb ? 1 : .5, kb = pb ? 0 : pa ? 1 : .5;
          pos[a] += dx * diff * ka * 2; pos[a + 1] += dy * diff * ka * 2; pos[a + 2] += dz * diff * ka * 2;
          pos[b] -= dx * diff * kb * 2; pos[b + 1] -= dy * diff * kb * 2; pos[b + 2] -= dz * diff * kb * 2;
        }
      }
    }
    if (cellsDirty) rebuildCells();
    geo.attributes.position.needsUpdate = true; geo.computeVertexNormals();
    // badly torn: stitch it back together after a while
    const broken = cons.reduce((n, c) => n + (c.on ? 0 : 1), 0) / cons.length;
    if (broken > .08){ if (!brokenAt) brokenAt = t; else if (t - brokenAt > 7) { reset(); brokenAt = 0; } } else brokenAt = 0;
  };

  return {
    group, mesh,
    /** live wind: speed in km/h, direction it blows *from* (deg). North is -z in the world. */
    setWind(kmh: number, fromDeg: number){
      const a = (fromDeg + 180) * Math.PI / 180;
      wind.set(Math.sin(a), 0, -Math.cos(a)).normalize();
      windK = .5 + Math.min(1.6, kmh / 12);
    },
    update(dt: number, t: number, calm: boolean){ step(calm ? .004 : dt, calm ? 0 : t); },
    /** a click: snap the threads near where the ray hits the cloth; true if it hit */
    tear(ray: THREE.Raycaster){
      if (!geo.index || !geo.index.count) return false;
      const hit = ray.intersectObject(mesh, false)[0];
      if (!hit) return false;
      local.copy(hit.point); mesh.worldToLocal(local);
      const R = rest * 2.2;
      for (const c of cons){
        if (!c.on) continue;
        const a = c.a * 3, b = c.b * 3;
        const mx = (pos[a] + pos[b]) / 2, my = (pos[a + 1] + pos[b + 1]) / 2, mz = (pos[a + 2] + pos[b + 2]) / 2;
        if (Math.hypot(mx - local.x, my - local.y, mz - local.z) < R){ c.on = false; cellsDirty = true; }
      }
      // and a little push back where you hit it
      for (let i = 0; i < N; i++){
        const k = i * 3; if (pinned[i]) continue;
        const d = Math.hypot(pos[k] - local.x, pos[k + 1] - local.y);
        if (d < R * 1.6) prev[k + 2] = pos[k + 2] + .06 * (1 - d / (R * 1.6));
      }
      return true;
    },
    hits(ray: THREE.Raycaster){ return !!(geo.index && geo.index.count && ray.intersectObject(mesh, false).length); },
    reset,
  };
}

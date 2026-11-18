/* ==========================================================================
   DEFEND.TS — "defend the firewall", a small original game in the network.
   Malware packets come in waves from every direction, heading for the core
   (me). Click them to shoot them down. My six section hosts are turrets:
   each one zaps the nearest packet in range every couple of seconds.
   Three kinds: worms (1 hit), fast pings (1 hit, quick, small) and
   trojans (3 hits, slow, big). A packet that reaches the core costs
   integrity; at 0 it's over. Best score is kept in this browser.
   Esc quits. Start it from the fx panel or `defend` in the terminal.
   ========================================================================== */
import * as THREE from 'three';

type Kind = 'worm' | 'ping' | 'trojan';
type Foe = { m: THREE.Mesh; hit: THREE.Mesh; kind: Kind; hp: number; pos: THREE.Vector3; dir: THREE.Vector3; sp: number; wob: number; alive: boolean };
type Zap = { line: THREE.Line; t: number };
type Burst = { pts: THREE.Points; v: Float32Array; t: number };

const KINDS: Record<Kind, { hp: number; sp: number; size: number; dmg: number; pts: number }> = {
  worm: { hp: 1, sp: 2.4, size: .32, dmg: 10, pts: 10 },
  ping: { hp: 1, sp: 4.6, size: .2, dmg: 6, pts: 15 },
  trojan: { hp: 3, sp: 1.4, size: .55, dmg: 25, pts: 40 },
};

export function createDefense(scene: THREE.Scene, turrets: THREE.Vector3[], fx: { kick: (v: number) => void }){
  const group = new THREE.Group(); group.visible = false; scene.add(group);
  const foeMat = { worm: new THREE.MeshBasicMaterial({ color: 0xff3b30, toneMapped: false }), ping: new THREE.MeshBasicMaterial({ color: 0xff9f0a, toneMapped: false }), trojan: new THREE.MeshBasicMaterial({ color: 0xff2d55, wireframe: true, toneMapped: false }) };
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });
  const zapMat = new THREE.LineBasicMaterial({ color: 0xc6ff3d, transparent: true, toneMapped: false });
  const shieldMat = new THREE.MeshBasicMaterial({ color: 0xc6ff3d, transparent: true, opacity: .12, wireframe: true, toneMapped: false });
  const shield = new THREE.Mesh(new THREE.IcosahedronGeometry(1.7, 2), shieldMat); group.add(shield);
  let foes: Foe[] = [], zaps: Zap[] = [], bursts: Burst[] = [];
  let active = false, wave = 0, toSpawn = 0, spawnT = 0, integrity = 100, score = 0, best = 0, waveBreak = 0, over = false;
  const turretT = turrets.map((_, i) => i * .4);
  try { best = +(localStorage.getItem('bhm-defend-best') ?? 0) || 0; } catch { /* fine */ }

  // ---- HUD
  const hud = document.createElement('div');
  hud.className = 'def-hud'; hud.hidden = true; hud.setAttribute('role', 'dialog'); hud.setAttribute('aria-label', 'Defend the firewall');
  hud.innerHTML = `
    <div class="def-bar b-win">
      <b>defend.the.firewall</b>
      <span>wave <em data-wave>1</em></span><span>score <em data-score>0</em></span><span>best <em data-best>${best}</em></span>
      <span class="def-int">core <i><u data-int></u></i> <em data-intn>100%</em></span>
      <button type="button" class="key def-x"><span>esc · quit</span></button>
    </div>
    <p class="def-msg" aria-live="polite"></p>
    <div class="def-over b-win" hidden><p class="def-k">connection lost</p><h2>Firewall breached</h2><p class="def-sum"></p>
      <div><button type="button" class="chip def-again">play again</button><button type="button" class="chip def-quit">back to the site</button></div></div>
    <p class="def-help">click the red packets before they reach the core · your hosts are turrets</p>`;
  document.body.append(hud);
  const $ = (s: string) => hud.querySelector<HTMLElement>(s)!;
  const msg = $('.def-msg');
  const say = (s: string) => { msg.textContent = s; msg.classList.remove('go'); void msg.offsetWidth; msg.classList.add('go'); };
  const paintHud = () => {
    $('[data-wave]').textContent = String(wave); $('[data-score]').textContent = String(score); $('[data-best]').textContent = String(best);
    $('[data-int]').style.width = `${integrity}%`; $('[data-intn]').textContent = `${Math.max(0, Math.round(integrity))}%`;
    hud.classList.toggle('low', integrity < 35);
  };

  // ---- spawning
  const spawn = () => {
    const r = Math.random(), kind: Kind = wave >= 3 && r < .18 ? 'trojan' : wave >= 2 && r < .45 ? 'ping' : 'worm';
    const K = KINDS[kind];
    const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u);
    const pos = new THREE.Vector3(Math.cos(a) * s, u * .55, Math.sin(a) * s).multiplyScalar(21 + Math.random() * 4);
    const m = new THREE.Mesh(kind === 'trojan' ? new THREE.IcosahedronGeometry(K.size, 0) : new THREE.OctahedronGeometry(K.size, 0), foeMat[kind]);
    const hit = new THREE.Mesh(new THREE.SphereGeometry(Math.max(.75, K.size * 2.2), 8, 8), hitMat);
    m.position.copy(pos); hit.position.copy(pos); group.add(m, hit);
    const f: Foe = { m, hit, kind, hp: K.hp, pos, dir: new THREE.Vector3(), sp: K.sp * (1 + wave * .06), wob: Math.random() * 6, alive: true };
    hit.userData.foe = f; foes.push(f);
  };
  const nextWave = () => { wave++; toSpawn = 5 + wave * 3; spawnT = 0; say(`wave ${wave}`); paintHud(); };

  // ---- effects
  const zap = (from: THREE.Vector3, to: THREE.Vector3) => {
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([from.clone(), to.clone()]), zapMat.clone()); group.add(line); zaps.push({ line, t: 0 });
  };
  const burst = (at: THREE.Vector3, color: number, n = 26) => {
    const p = new Float32Array(n * 3), v = new Float32Array(n * 3);
    for (let i = 0; i < n; i++){ p.set([at.x, at.y, at.z], i * 3); const d = new THREE.Vector3().randomDirection().multiplyScalar(2 + Math.random() * 4); v.set([d.x, d.y, d.z], i * 3); }
    const pts = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(p, 3)), new THREE.PointsMaterial({ color, size: .14, transparent: true, depthWrite: false, toneMapped: false }));
    group.add(pts); bursts.push({ pts, v, t: 0 });
  };
  const kill = (f: Foe, by: 'you' | 'turret') => {
    f.alive = false; group.remove(f.m, f.hit); f.m.geometry.dispose(); f.hit.geometry.dispose();
    burst(f.pos, f.kind === 'ping' ? 0xff9f0a : 0xff3b30);
    score += KINDS[f.kind].pts * (by === 'you' ? 1 : .5); score = Math.round(score); paintHud();
  };
  const damage = (f: Foe, by: 'you' | 'turret', from: THREE.Vector3) => {
    zap(from, f.pos); f.hp--;
    if (f.hp <= 0) kill(f, by);
    else { f.m.scale.setScalar(1.4); burst(f.pos, 0xffffff, 8); }
  };

  // ---- the game loop
  const update = (dt: number, t: number) => {
    if (!active) return;
    shield.rotation.set(t * .3, t * .5, 0);
    shieldMat.opacity = .08 + (100 - integrity) / 100 * .2 + Math.max(0, Math.sin(t * 9)) * (integrity < 35 ? .15 : 0);
    if (!over){
      if (toSpawn > 0){ spawnT -= dt; if (spawnT <= 0){ spawn(); toSpawn--; spawnT = Math.max(.25, 1.3 - wave * .1) * (.6 + Math.random() * .8); } }
      else if (!foes.some(f => f.alive)){
        waveBreak += dt;
        if (waveBreak > 1.6){ waveBreak = 0; integrity = Math.min(100, integrity + 8); nextWave(); }
      }
      for (const f of foes){
        if (!f.alive) continue;
        // home in on the core, weaving a little
        f.dir.copy(f.pos).negate().normalize();
        const side = new THREE.Vector3(-f.dir.z, 0, f.dir.x).multiplyScalar(Math.sin(t * 2.2 + f.wob) * .6);
        f.pos.addScaledVector(f.dir.add(side).normalize(), f.sp * dt);
        f.m.position.copy(f.pos); f.hit.position.copy(f.pos);
        f.m.rotation.set(t * 3 + f.wob, t * 2, 0);
        f.m.scale.setScalar(f.m.scale.x + (1 - f.m.scale.x) * .2);
        if (f.pos.length() < 1.6){
          f.alive = false; group.remove(f.m, f.hit);
          integrity -= KINDS[f.kind].dmg; fx.kick(.5); burst(f.pos, 0xff3b30, 40); paintHud();
          if (integrity <= 0) end();
        }
      }
      // the hosts defend me: each zaps the nearest packet within range now and then
      turrets.forEach((tp, i) => {
        turretT[i] -= dt; if (turretT[i] > 0) return;
        let best2: Foe | null = null, bd = 6.5;
        for (const f of foes) if (f.alive){ const d = f.pos.distanceTo(tp); if (d < bd){ bd = d; best2 = f; } }
        if (best2){ damage(best2, 'turret', tp); turretT[i] = 2.4 - Math.min(1, wave * .08); } else turretT[i] = .3;
      });
      foes = foes.filter(f => f.alive);
    }
    for (const z of zaps){ z.t += dt; (z.line.material as THREE.LineBasicMaterial).opacity = 1 - z.t / .25; if (z.t > .25){ group.remove(z.line); z.line.geometry.dispose(); } }
    zaps = zaps.filter(z => z.t <= .25);
    for (const b of bursts){
      b.t += dt; const p = b.pts.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < b.v.length; i++) (p.array as Float32Array)[i] += b.v[i] * dt;
      p.needsUpdate = true; (b.pts.material as THREE.PointsMaterial).opacity = 1 - b.t / .7;
      if (b.t > .7){ group.remove(b.pts); b.pts.geometry.dispose(); }
    }
    bursts = bursts.filter(b => b.t <= .7);
  };

  const clear = () => { foes.forEach(f => group.remove(f.m, f.hit)); foes = []; zaps.forEach(z => group.remove(z.line)); zaps = []; bursts.forEach(b => group.remove(b.pts)); bursts = []; };
  const end = () => {
    over = true;
    if (score > best){ best = score; try { localStorage.setItem('bhm-defend-best', String(best)); } catch { /* fine */ } }
    $('.def-sum').textContent = `you held ${wave - 1} ${wave - 1 === 1 ? 'wave' : 'waves'} · score ${score}${score >= best && score > 0 ? ' · new best' : ` · best ${best}`}`;
    $('.def-over').hidden = false; paintHud();
    setTimeout(() => hud.querySelector<HTMLButtonElement>('.def-again')?.focus({ preventScroll: true }), 30);
  };
  const begin = () => { clear(); wave = 0; integrity = 100; score = 0; over = false; waveBreak = 0; $('.def-over').hidden = true; nextWave(); };
  let onExit = () => {};
  const onKey = (e: KeyboardEvent) => { if (active && e.key === 'Escape'){ e.preventDefault(); e.stopPropagation(); stop(); } };
  const start = (exit: () => void) => {
    if (active) return; onExit = exit; active = true; group.visible = true; hud.hidden = false;
    document.documentElement.classList.add('gaming'); addEventListener('keydown', onKey, true);
    begin();
  };
  const stop = () => {
    if (!active) return; active = false; group.visible = false; hud.hidden = true; clear();
    if (score > best){ best = score; try { localStorage.setItem('bhm-defend-best', String(best)); } catch { /* fine */ } }
    document.documentElement.classList.remove('gaming'); removeEventListener('keydown', onKey, true);
    onExit();
  };
  hud.querySelector('.def-x')!.addEventListener('click', stop);
  hud.querySelector('.def-quit')!.addEventListener('click', stop);
  hud.querySelector('.def-again')!.addEventListener('click', begin);

  /** a click in the world: shoot the packet under the cursor (from the core) */
  const shoot = (ray: THREE.Raycaster, from: THREE.Vector3) => {
    if (!active || over) return false;
    const hit = ray.intersectObjects(foes.filter(f => f.alive).map(f => f.hit), false)[0];
    if (hit){ damage(hit.object.userData.foe as Foe, 'you', from); return true; }
    // a miss still fires, into the distance
    zap(from, ray.ray.origin.clone().addScaledVector(ray.ray.direction, 30));
    return true;
  };
  return { start, stop, update, shoot, get active(){ return active; } };
}

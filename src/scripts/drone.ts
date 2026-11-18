/* ==========================================================================
   DRONE.TS — fly the network yourself.
   Desktop: W A S D (or arrows) to fly, mouse to look (click once to grab
   the mouse), space / C to climb and sink, shift to boost.
   Phones: a joystick bottom-left to fly, drag anywhere else to look, two
   buttons to climb and sink.
   The drone banks into turns, the FOV stretches with speed (world.ts's warp
   reacts to it on its own), it bounces off the hosts' shells and the sea,
   and flying slowly into a host docks there: you land on that section.
   Esc lands the drone and the camera glides back to the page.
   ========================================================================== */
import * as THREE from 'three';

export interface DroneHost { id: string; label: string; pos: () => THREE.Vector3 }

export function createDrone(hosts: DroneHost[], opts: { floor: number; onDock: (id: string) => void; onExit: () => void }){
  const pos = new THREE.Vector3(), vel = new THREE.Vector3(), fwd = new THREE.Vector3(), right = new THREE.Vector3(), tmp = new THREE.Vector3();
  const e = new THREE.Euler(0, 0, 0, 'YXZ');
  let active = false, yaw = 0, pitch = 0, roll = 0, yawVel = 0, boost = 0;
  const keys = new Set<string>();
  const touch = matchMedia('(pointer: coarse)').matches;
  const joy = { x: 0, y: 0, id: -1, ox: 0, oy: 0 }, look = { id: -1, x: 0, y: 0 }, lift = { up: false, down: false };

  // ---- HUD
  const hud = document.createElement('div');
  hud.className = 'drone-hud'; hud.hidden = true; hud.setAttribute('role', 'dialog'); hud.setAttribute('aria-label', 'Drone flight');
  hud.innerHTML = `
    <i class="dr-cross" aria-hidden="true"></i>
    <div class="dr-top b-win"><b>drone.cam</b><span>${touch ? 'left stick to fly · drag to look · ▲▼ climb / sink · fly slowly into a host to dock' : 'W A S D fly · mouse look (click to grab) · space / C climb · shift boost · fly slowly into a host to dock'}</span>
      <button type="button" class="key dr-x"><span>esc · land</span></button></div>
    <div class="dr-read" aria-live="off"><span>alt <b data-alt>0.0</b></span><span>spd <b data-spd>0</b></span><span>near <b data-near>-</b></span></div>
    <p class="dr-dock" aria-live="polite"></p>
    ${touch ? '<div class="dr-joy" aria-hidden="true"><i></i></div><div class="dr-lift"><button type="button" data-l="up" aria-label="Climb">▲</button><button type="button" data-l="down" aria-label="Sink">▼</button></div>' : ''}`;
  document.body.append(hud);
  const altEl = hud.querySelector('[data-alt]')!, spdEl = hud.querySelector('[data-spd]')!, nearEl = hud.querySelector('[data-near]')!, dockEl = hud.querySelector<HTMLElement>('.dr-dock')!;
  const knob = hud.querySelector<HTMLElement>('.dr-joy i');

  // ---- input
  const onKey = (ev: KeyboardEvent, down: boolean) => {
    if (!active) return;
    if (ev.key === 'Escape' && down){ ev.preventDefault(); ev.stopPropagation(); stop(); return; }
    const k = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
    if (['w', 'a', 's', 'd', 'c', ' ', 'q', 'e', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Shift'].includes(k)){
      ev.preventDefault(); ev.stopPropagation();
      if (down) keys.add(k); else keys.delete(k);
    }
  };
  const kd = (ev: KeyboardEvent) => onKey(ev, true), ku = (ev: KeyboardEvent) => onKey(ev, false);
  const onMove = (ev: MouseEvent) => {
    if (!active || document.pointerLockElement !== document.body) return;
    yaw -= ev.movementX * .0022; pitch = THREE.MathUtils.clamp(pitch - ev.movementY * .0022, -1.35, 1.35);
  };
  const onDown = (ev: PointerEvent) => {
    if (!active || (ev.target as Element).closest('button, .dr-top, .deck')) return;
    if (ev.pointerType === 'mouse'){ if (document.pointerLockElement !== document.body) document.body.requestPointerLock?.(); return; }
    // touch: the joystick on the left third, look everywhere else
    if (ev.clientX < innerWidth * .4 && ev.clientY > innerHeight * .45 && joy.id < 0){ joy.id = ev.pointerId; joy.ox = ev.clientX; joy.oy = ev.clientY; }
    else if (look.id < 0){ look.id = ev.pointerId; look.x = ev.clientX; look.y = ev.clientY; }
  };
  const onPMove = (ev: PointerEvent) => {
    if (!active) return;
    if (ev.pointerId === joy.id){
      const dx = ev.clientX - joy.ox, dy = ev.clientY - joy.oy, r = Math.min(1, Math.hypot(dx, dy) / 50), a = Math.atan2(dy, dx);
      joy.x = Math.cos(a) * r; joy.y = Math.sin(a) * r;
      if (knob) knob.style.transform = `translate(${joy.x * 34}px, ${joy.y * 34}px)`;
    } else if (ev.pointerId === look.id){
      yaw -= (ev.clientX - look.x) * .005; pitch = THREE.MathUtils.clamp(pitch - (ev.clientY - look.y) * .005, -1.35, 1.35);
      look.x = ev.clientX; look.y = ev.clientY;
    }
  };
  const onUp = (ev: PointerEvent) => {
    if (ev.pointerId === joy.id){ joy.id = -1; joy.x = joy.y = 0; if (knob) knob.style.transform = ''; }
    if (ev.pointerId === look.id) look.id = -1;
  };
  hud.querySelectorAll<HTMLButtonElement>('[data-l]').forEach(b => {
    const k = b.dataset.l as 'up' | 'down';
    b.addEventListener('pointerdown', () => { lift[k] = true; }); b.addEventListener('pointerup', () => { lift[k] = false; }); b.addEventListener('pointerleave', () => { lift[k] = false; });
  });
  hud.querySelector('.dr-x')!.addEventListener('click', () => stop());

  // ---- start / stop
  const start = (camera: THREE.Camera) => {
    if (active) return;
    active = true; hud.hidden = false; keys.clear(); vel.set(0, 0, 0); roll = 0; yawVel = 0;
    pos.copy(camera.position);
    camera.getWorldDirection(fwd);
    yaw = Math.atan2(-fwd.x, -fwd.z); pitch = Math.asin(THREE.MathUtils.clamp(fwd.y, -1, 1));
    document.documentElement.classList.add('droning');
    addEventListener('keydown', kd, true); addEventListener('keyup', ku, true);
    addEventListener('mousemove', onMove); addEventListener('pointerdown', onDown); addEventListener('pointermove', onPMove); addEventListener('pointerup', onUp); addEventListener('pointercancel', onUp);
    setTimeout(() => hud.querySelector<HTMLButtonElement>('.dr-x')?.focus({ preventScroll: true }), 30);
  };
  const stop = () => {
    if (!active) return;
    active = false; hud.hidden = true; keys.clear();
    if (document.pointerLockElement) document.exitPointerLock?.();
    document.documentElement.classList.remove('droning');
    removeEventListener('keydown', kd, true); removeEventListener('keyup', ku, true);
    removeEventListener('mousemove', onMove); removeEventListener('pointerdown', onDown); removeEventListener('pointermove', onPMove); removeEventListener('pointerup', onUp); removeEventListener('pointercancel', onUp);
    opts.onExit();
  };

  // ---- flight
  let dockFrom = '', dockT = 0;
  const update = (dt: number, camera: THREE.PerspectiveCamera) => {
    if (!active) return false;
    const k = (s: string) => keys.has(s) ? 1 : 0;
    const ix = (k('d') + k('ArrowRight') - k('a') - k('ArrowLeft')) + joy.x;
    const iz = (k('w') + k('ArrowUp') - k('s') - k('ArrowDown')) - joy.y;
    const iy = k(' ') + k('e') + (lift.up ? 1 : 0) - k('c') - k('q') - (lift.down ? 1 : 0);
    boost += ((k('Shift') ? 1 : 0) - boost) * Math.min(1, dt * 4);
    const thrust = 26 * (1 + boost * 2.2);
    e.set(pitch, yaw, 0); fwd.set(0, 0, -1).applyEuler(e); right.set(1, 0, 0).applyEuler(e);
    vel.addScaledVector(fwd, iz * thrust * dt).addScaledVector(right, ix * thrust * .8 * dt);
    vel.y += iy * thrust * .7 * dt;
    vel.multiplyScalar(Math.exp(-dt * 1.8));   // air drag
    pos.addScaledVector(vel, dt);
    // the sea and the edge of the world
    if (pos.y < opts.floor + .6){ pos.y = opts.floor + .6; if (vel.y < 0) vel.y *= -.4; }
    if (pos.y > 32){ pos.y = 32; vel.y = Math.min(0, vel.y); }
    const R = Math.hypot(pos.x, pos.z); if (R > 46){ pos.x *= 46 / R; pos.z *= 46 / R; }
    // hosts: slow → dock; fast → bounce off the shell
    let near = '', nd = Infinity;
    for (const h of hosts){
      const hp = h.pos(), d = pos.distanceTo(hp);
      if (d < nd){ nd = d; near = h.label; }
      if (d < 1.5){
        const sp = vel.length();
        if (sp < 9){
          if (dockFrom !== h.id){ dockFrom = h.id; dockT = 0; }
          dockT += dt; dockEl.textContent = `docking with ${h.label} ...`;
          if (dockT > .35){ const id = h.id; stop(); opts.onDock(id); return true; }
        } else {
          tmp.copy(pos).sub(hp).normalize(); pos.copy(hp).addScaledVector(tmp, 1.5);
          vel.reflect(tmp).multiplyScalar(.55);
        }
      } else if (dockFrom === h.id){ dockFrom = ''; dockEl.textContent = ''; }
    }
    // bank into turns, like a drone
    const turn = (yaw - (yawVel)) ; yawVel = yaw;
    roll += (THREE.MathUtils.clamp(-turn * 18 - ix * .25, -.6, .6) - roll) * Math.min(1, dt * 5);
    camera.position.copy(pos);
    e.set(pitch, yaw, roll); camera.quaternion.setFromEuler(e);
    altEl.textContent = (pos.y - opts.floor).toFixed(1);
    spdEl.textContent = String(Math.round(vel.length() * 3.6));
    nearEl.textContent = `${near} ${nd.toFixed(1)}m`;
    return true;
  };
  return { start, stop, update, get active(){ return active; } };
}

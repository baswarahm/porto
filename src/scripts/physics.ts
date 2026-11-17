/* ==========================================================================
   PHYSICS.TS — the firewall with real rigid-body physics (Rapier, WASM).
   Every hex cell is a fixed cylinder until you hit it; then it turns into a
   dynamic body: it flies off, tumbles, knocks into the cells still standing,
   bounces and piles up on the grid floor. Moving the cursor through the
   fallen cells shoves them along (a quick flick throws them).
   Loaded in the background after the world is up, so the first click is
   already physical. Root mode puts every cell back.
   ========================================================================== */
import * as THREE from 'three';

interface Cell { base: THREE.Vector3 }

export async function createPhysics(cells: Cell[], R: number, depth: number, floorY: number){
  const RAPIER = (await import('@dimforge/rapier3d-compat')).default;
  await RAPIER.init();
  const world = new RAPIER.World({ x: 0, y: -12, z: 0 });
  // the floor (the grid) and an invisible back wall so nothing falls away behind the firewall
  world.createCollider(RAPIER.ColliderDesc.cuboid(90, .5, 90).setTranslation(0, floorY - .5, 0).setFriction(.9).setRestitution(.2));
  // a hex cell lies with its axis along z: rotate the y-axis cylinder 90° about x.
  // The collider is a bit slimmer than the cell so standing neighbours don't overlap.
  const rot = { x: Math.SQRT1_2, y: 0, z: 0, w: Math.SQRT1_2 };
  const bodies = cells.map(c => {
    const b = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(c.base.x, c.base.y, c.base.z).setCcdEnabled(true));
    world.createCollider(RAPIER.ColliderDesc.cylinder(depth / 2, R * .82).setRotation(rot).setRestitution(.35).setFriction(.6).setDensity(1.4), b);
    return b;
  });
  const live = new Set<number>();
  let acc = 0;
  const v = new THREE.Vector3(), w = new THREE.Vector3();

  return {
    get liveCount(){ return live.size; },
    isLive: (n: number) => live.has(n),
    /** hit a cell: it comes loose (if it wasn't) and takes the impulse */
    knock(n: number, impulse: THREE.Vector3, spin: THREE.Vector3){
      const b = bodies[n];
      if (!live.has(n)){ b.setBodyType(RAPIER.RigidBodyType.Dynamic, true); live.add(n); }
      b.applyImpulse({ x: impulse.x, y: impulse.y, z: impulse.z }, true);
      b.applyTorqueImpulse({ x: spin.x, y: spin.y, z: spin.z }, true);
    },
    /** fixed 60 Hz steps, at most 3 per frame */
    step(dt: number){
      acc = Math.min(acc + dt, 3 / 60);
      while (acc >= 1 / 60){ world.step(); acc -= 1 / 60; }
    },
    pose(n: number, pos: THREE.Vector3, quat: THREE.Quaternion){
      const b = bodies[n], t = b.translation(), r = b.rotation();
      pos.set(t.x, t.y, t.z); quat.set(r.x, r.y, r.z, r.w);
    },
    /** the cursor ray shoves fallen cells near it, along the way the cursor moves */
    push(origin: THREE.Vector3, dir: THREE.Vector3, sweep: THREE.Vector3){
      const strength = Math.min(1.2, sweep.length() * .05);
      if (strength < .02) return;
      for (const n of live){
        const t = bodies[n].translation();
        v.set(t.x, t.y, t.z).sub(origin);
        const along = v.dot(dir);
        if (along < 0) continue;
        w.copy(dir).multiplyScalar(along).sub(v);   // from the cell to the ray
        const d = w.length();
        if (d > 1.3) continue;
        const f = (1 - d / 1.3) * strength;
        bodies[n].applyImpulse({ x: sweep.x * .02 * f - w.x * f * .4, y: Math.abs(sweep.y) * .02 * f + f * .6, z: sweep.z * .02 * f - w.z * f * .4 }, true);
      }
    },
    /** root mode: every cell flies home and stands still again */
    reset(){
      for (const n of live){
        const b = bodies[n], c = cells[n].base;
        b.setBodyType(RAPIER.RigidBodyType.Fixed, false);
        b.setTranslation({ x: c.x, y: c.y, z: c.z }, false); b.setRotation({ x: 0, y: 0, z: 0, w: 1 }, false);
        b.setLinvel({ x: 0, y: 0, z: 0 }, false); b.setAngvel({ x: 0, y: 0, z: 0 }, false);
      }
      live.clear();
    },
  };
}

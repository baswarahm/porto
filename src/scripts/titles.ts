/* ==========================================================================
   TITLES.TS — section titles as holograms inside the WebGL world.
   Each title is drawn once on a canvas and sampled into points, stacked in
   four depth layers so the letters have thickness. When the camera arrives
   at a section its title flies together from a cloud of sparks, flickers
   with scanlines and glitch tears, and floats above the host; when you
   leave, it bursts back apart. (The HTML headings stay for reading and for
   screen readers; these are the world's own signage.)
   ========================================================================== */
import * as THREE from 'three';

const VERT = `
uniform float uAssemble, uTime, uGlitch, uScale; attribute vec3 aTarget, aScatter; attribute float aLayer, aSeed;
varying float vAlpha, vLayer, vY;
float rand(float n){ return fract(sin(n) * 43758.5453); }
void main(){
  // letters assemble left to right, each spark on its own little delay
  float k = clamp(uAssemble * 1.6 - aSeed * .6 - (aTarget.x + 4.) * .03, 0., 1.);
  k = k * k * (3. - 2. * k);
  vec3 p = mix(aTarget + aScatter, aTarget, k);
  // glitch: thin horizontal bands slip sideways
  float band = floor(aTarget.y * 9. + floor(uTime * 14.));
  p.x += step(.94 - uGlitch * .25, rand(band)) * (rand(band + 3.1) - .5) * .5;
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  gl_PointSize = uScale * (aLayer == 0. ? 1.15 : .9) / -mv.z;
  gl_Position = projectionMatrix * mv;
  vAlpha = k * (1. - aLayer * .22); vLayer = aLayer; vY = aTarget.y;
}`;
const FRAG = `
uniform vec3 uColor, uDeep; uniform float uTime, uOpacity; varying float vAlpha, vLayer, vY;
void main(){
  vec2 c = gl_PointCoord - .5; if (dot(c, c) > .25) discard;
  float scan = .65 + .35 * step(.5, fract(vY * 14. - uTime * 1.5));
  float flick = .9 + .1 * sin(uTime * 37. + vY * 3.);
  gl_FragColor = vec4(mix(uColor, uDeep, vLayer / 3.), vAlpha * scan * flick * uOpacity);
}`;

export interface TitleSpec { stage: string; text: string; at: THREE.Vector3 }

export function createTitles(specs: TitleSpec[]){
  const group = new THREE.Group();
  const mats: THREE.ShaderMaterial[] = [];
  let seed = 9; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const items = specs.map(spec => {
    // draw the title and sample its pixels
    const c = document.createElement('canvas'), g = c.getContext('2d', { willReadFrequently: true })!;
    const FONT = '600 120px "IBM Plex Sans", system-ui, sans-serif';
    g.font = FONT; const tw = Math.ceil(g.measureText(spec.text).width) + 20;
    c.width = tw; c.height = 150; g.font = FONT; g.fillStyle = '#fff'; g.textBaseline = 'middle'; g.fillText(spec.text, 10, 78);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    const STEP = 4, W = Math.min(4.2, c.width / 140), sc = W / c.width;
    const pts: number[] = [];
    for (let y = 0; y < c.height; y += STEP) for (let x = 0; x < c.width; x += STEP) if (d[(y * c.width + x) * 4 + 3] > 128) pts.push((x - c.width / 2) * sc, (c.height / 2 - y) * sc);
    const n = pts.length / 2, L = 4, N = n * L;
    const target = new Float32Array(N * 3), scatter = new Float32Array(N * 3), layer = new Float32Array(N), sd = new Float32Array(N);
    for (let l = 0; l < L; l++) for (let i = 0; i < n; i++){
      const j = l * n + i;
      target[j * 3] = pts[i * 2]; target[j * 3 + 1] = pts[i * 2 + 1]; target[j * 3 + 2] = -l * .07;
      const r = 2 + rnd() * 5, a = rnd() * 6.283, b = Math.acos(rnd() * 2 - 1);
      scatter[j * 3] = Math.sin(b) * Math.cos(a) * r; scatter[j * 3 + 1] = Math.cos(b) * r; scatter[j * 3 + 2] = Math.sin(b) * Math.sin(a) * r;
      layer[j] = l; sd[j] = rnd();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(target.slice(), 3));
    geo.setAttribute('aTarget', new THREE.BufferAttribute(target, 3));
    geo.setAttribute('aScatter', new THREE.BufferAttribute(scatter, 3));
    geo.setAttribute('aLayer', new THREE.BufferAttribute(layer, 1));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(sd, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: { uAssemble: { value: 0 }, uTime: { value: 0 }, uGlitch: { value: 0 }, uScale: { value: 300 }, uColor: { value: new THREE.Color() }, uDeep: { value: new THREE.Color() }, uOpacity: { value: 1 } },
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    mats.push(mat);
    const pts3 = new THREE.Points(geo, mat); pts3.frustumCulled = false;
    const holder = new THREE.Group(); holder.position.copy(spec.at); holder.add(pts3); holder.visible = false; group.add(holder);
    return { stage: spec.stage, holder, mat, a: 0, glitchAt: -1e9 };
  });

  const upW = new THREE.Vector3(), fwW = new THREE.Vector3(), anchor = new THREE.Vector3();
  return {
    group,
    paint(color: THREE.Color, deep: THREE.Color, dark: boolean){
      mats.forEach(m => { m.uniforms.uColor.value.copy(color); m.uniforms.uDeep.value.copy(deep); m.blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending; m.uniforms.uOpacity.value = dark ? .9 : .8; m.needsUpdate = true; });
    },
    /** `active` = the section the camera has settled on ('' while travelling) */
    /** `look` = what the camera looks at: titles float in the top part of the frame, a little in front of the object */
    update(active: string, camera: THREE.Camera, look: THREE.Vector3, t: number, dt: number, scale: number, calm: boolean){
      upW.set(0, 1, 0).applyQuaternion(camera.quaternion); fwW.set(0, 0, -1).applyQuaternion(camera.quaternion);
      anchor.copy(look).addScaledVector(upW, 1.55).addScaledVector(fwW, -1.2);
      items.forEach(it => {
        const on = it.stage === active;
        if (on && it.a < .02) it.glitchAt = t;
        it.a = calm ? (on ? 1 : 0) : THREE.MathUtils.clamp(it.a + (on ? dt * .8 : -dt * 1.6), 0, 1);
        it.holder.visible = it.a > .001;
        if (!it.holder.visible) return;
        it.holder.quaternion.copy(camera.quaternion);   // always faces you
        it.holder.position.lerp(anchor, it.a > .98 ? .2 : 1);
        const u = it.mat.uniforms;
        u.uAssemble.value = it.a; u.uTime.value = t; u.uScale.value = scale;
        u.uGlitch.value = calm ? 0 : Math.max(0, 1 - (t - it.glitchAt) / 1.2) + (Math.sin(t * 1.7) > .985 ? .8 : 0);
      });
    },
  };
}

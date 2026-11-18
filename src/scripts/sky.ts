/* ==========================================================================
   SKY.TS — the real sky over Penang, right now.
     · the sun and the moon are where they really are (low-precision
       astronomy: ~1° for the sun, ~1–2° for the moon), the moon lit in its
       real phase
     · the sky colour follows the sun's altitude: night, blue hour, a warm
       dusk/dawn glow on the horizon toward the sun, then day
     · 1,600 stars turn with the sidereal time, fading in after dusk
     · the sun's screen position drives god rays in the CRT pass (fx.ts)
   Positions are recomputed every 20 s; the dome follows the camera.
   North is -z, east is +x, up is +y.
   ========================================================================== */
import * as THREE from 'three';

export const PENANG = { lat: 5.4141, lon: 100.3288 };
const rad = Math.PI / 180;

/** days since J2000.0 (2000-01-01 12:00 UTC) */
const days = (t: number) => (t - 946728000000) / 86400000;
const obliq = (d: number) => (23.439 - .00000036 * d) * rad;
const lst = (d: number, lon: number) => ((280.46061837 + 360.98564736629 * d + lon) % 360) * rad;

function toHorizon(ra: number, dec: number, d: number){
  const lat = PENANG.lat * rad, H = lst(d, PENANG.lon) - ra;
  const alt = Math.asin(Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(H));
  const az = Math.atan2(-Math.sin(H) * Math.cos(dec), Math.cos(lat) * Math.sin(dec) - Math.sin(lat) * Math.cos(dec) * Math.cos(H));   // from north, east positive
  return { alt, az };
}
export function sunPosition(t = Date.now()){
  const d = days(t), g = (357.529 + .98560028 * d) * rad, q = 280.459 + .98564736 * d;
  const L = (q + 1.915 * Math.sin(g) + .02 * Math.sin(2 * g)) * rad, e = obliq(d);
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L)), dec = Math.asin(Math.sin(e) * Math.sin(L));
  return { ra, dec, ...toHorizon(ra, dec, d) };
}
export function moonPosition(t = Date.now()){
  const d = days(t), e = obliq(d);
  const L = (218.316 + 13.176396 * d) * rad, M = (134.963 + 13.064993 * d) * rad, F = (93.272 + 13.22935 * d) * rad;
  const l = L + 6.289 * rad * Math.sin(M), b = 5.128 * rad * Math.sin(F);
  const ra = Math.atan2(Math.sin(l) * Math.cos(e) - Math.tan(b) * Math.sin(e), Math.cos(l));
  const dec = Math.asin(Math.sin(b) * Math.cos(e) + Math.cos(b) * Math.sin(e) * Math.sin(l));
  const s = sunPosition(t);
  const phi = Math.acos(Math.sin(s.dec) * Math.sin(dec) + Math.cos(s.dec) * Math.cos(dec) * Math.cos(s.ra - ra));
  const lit = (1 - Math.cos(phi)) / 2;   // illuminated fraction, 0 new .. 1 full
  const waxing = Math.sin(ra - s.ra) > 0;
  return { ra, dec, lit, waxing, ...toHorizon(ra, dec, d) };
}
export const dirOf = (alt: number, az: number, out = new THREE.Vector3()) =>
  out.set(Math.sin(az) * Math.cos(alt), Math.sin(alt), -Math.cos(az) * Math.cos(alt));

const VERT = `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FRAG = `
uniform vec3 uSun, uMoon, uBg, uDay, uDusk, uNight, uSunCol; uniform float uSunAlt, uMoonLit, uDark, uMix; varying vec3 vDir;
void main(){
  vec3 d = normalize(vDir); float up = clamp(d.y, -.2, 1.);
  float day = smoothstep(-.1, .25, uSunAlt), dusk = exp(-pow(uSunAlt / .16, 2.));
  vec3 zen = mix(uNight, uDay, day);
  vec3 hor = mix(zen * 1.4, uDusk, dusk * .9);
  float toSun = max(dot(normalize(vec3(d.x, 0., d.z)), normalize(vec3(uSun.x, 0., uSun.z) + 1e-4)), 0.);
  hor = mix(hor, uDusk * 1.3, dusk * pow(toSun, 3.) * .8);
  vec3 sky = mix(hor, zen, smoothstep(0., .55, up));
  // the sun: a hot disc and a wide glow
  float sd = dot(d, uSun);
  sky += uSunCol * (smoothstep(.9994, .9997, sd) * 6. + pow(max(sd, 0.), 400.) * 1.2 + pow(max(sd, 0.), 18.) * .18 * day) * step(-.05, uSunAlt);
  // the moon: a disc lit on its sun-facing side
  float md = dot(d, uMoon);
  if (md > .9996){
    vec3 side = normalize(uSun - uMoon * dot(uSun, uMoon));
    vec3 q = normalize(d - uMoon * md); float lit = smoothstep(-.2, .2, dot(q, side) * (1. - 2. * (1. - uMoonLit)) + (uMoonLit * 2. - 1.));
    sky += vec3(.9, .92, .85) * (.15 + lit * 1.6);
  }
  // fade into the page colour below the horizon and blend with the theme
  sky = mix(uBg, sky, smoothstep(-.12, .04, d.y) * uMix);
  gl_FragColor = vec4(sky, 1.);
}`;

export function createSky(){
  const group = new THREE.Group();
  const u = {
    uSun: { value: new THREE.Vector3(0, 1, 0) }, uMoon: { value: new THREE.Vector3(0, -1, 0) }, uSunAlt: { value: 0 }, uMoonLit: { value: .5 },
    uBg: { value: new THREE.Color() }, uDay: { value: new THREE.Color() }, uDusk: { value: new THREE.Color() }, uNight: { value: new THREE.Color() },
    uSunCol: { value: new THREE.Color('#fff2d6') }, uDark: { value: 1 }, uMix: { value: .55 },
  };
  const dome = new THREE.Mesh(new THREE.SphereGeometry(185, 48, 24), new THREE.ShaderMaterial({ uniforms: u, vertexShader: VERT, fragmentShader: FRAG, side: THREE.BackSide, depthWrite: false, fog: false }));
  dome.renderOrder = -10; dome.frustumCulled = false;
  group.add(dome);
  // stars, placed by RA/Dec once; their horizon positions are recomputed with the sky
  const NSTAR = 1600, starRaDec = new Float32Array(NSTAR * 2), starPos = new Float32Array(NSTAR * 3);
  let s = 77; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < NSTAR; i++){ starRaDec[i * 2] = rnd() * Math.PI * 2; starRaDec[i * 2 + 1] = Math.asin(rnd() * 2 - 1); }
  const starGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, transparent: true, depthWrite: false, fog: false, color: 0xffffff });
  const stars = new THREE.Points(starGeo, starMat); stars.renderOrder = -9; stars.frustumCulled = false; group.add(stars);

  const sunDir = new THREE.Vector3(), moonDir = new THREE.Vector3();
  let sun = sunPosition(), moon = moonPosition(), last = 0, dark = true;
  const recompute = (t: number) => {
    sun = sunPosition(t); moon = moonPosition(t);
    dirOf(sun.alt, sun.az, sunDir); dirOf(moon.alt, moon.az, moonDir);
    u.uSun.value.copy(sunDir); u.uMoon.value.copy(moonDir); u.uSunAlt.value = Math.sin(sun.alt); u.uMoonLit.value = moon.lit;
    const d = days(t);
    for (let i = 0; i < NSTAR; i++){
      const h = toHorizon(starRaDec[i * 2], starRaDec[i * 2 + 1], d);
      dirOf(h.alt, h.az, sunDir.clone()).multiplyScalar(178).toArray(starPos, i * 3);
    }
    dirOf(sun.alt, sun.az, sunDir);
    starGeo.attributes.position.needsUpdate = true;
  };
  recompute(Date.now());

  return {
    group,
    /** shared with the ocean, so the water reflects this exact sky */
    uniforms: u,
    get sun(){ return sun; }, get moon(){ return moon; }, sunDir,
    paint(isDark: boolean, bg: THREE.Color){
      dark = isDark; u.uDark.value = isDark ? 1 : 0; u.uBg.value.copy(bg);
      if (isDark){ u.uNight.value.set('#05070a'); u.uDay.value.set('#16283a'); u.uDusk.value.set('#7a3b2a'); u.uMix.value = .9; }
      else { u.uNight.value.set('#c9ccd6'); u.uDay.value.set('#cfe0ee'); u.uDusk.value.set('#f0c7a8'); u.uMix.value = .75; }
    },
    update(camera: THREE.Camera, t: number){
      group.position.copy(camera.position);
      if (Math.abs(t - last) > 20000){ last = t; recompute(t); }   // also jumps when the time machine moves
      // stars come out after dusk (and barely in day mode)
      starMat.opacity = (dark ? .85 : .25) * (1 - THREE.MathUtils.smoothstep(Math.sin(sun.alt), -.2, .02));
      stars.visible = starMat.opacity > .01;
    },
  };
}

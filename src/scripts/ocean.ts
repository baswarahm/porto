/* ==========================================================================
   OCEAN.TS — the Strait of Malacca under the network, and Penang's real
   cloud cover above it.
     · ocean: Gerstner waves moved on the GPU; every pixel reflects the same
       sky the dome draws (shared uniforms from sky.ts), so the sun glints
       where the real sun is, the water goes dusk-orange at dusk and dark at
       night, crests foam, and the network's glow shimmers on the water
     · clouds: a deck of fbm noise drifting with the live wind; how much of
       the sky it covers is the live cloud cover from Open-Meteo, lit from
       the real sun's side
   ========================================================================== */
import * as THREE from 'three';

const NOISE = `
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 5; i++){ s += a * vnoise(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p; a *= .5; } return s; }`;

const OCEAN_VERT = `
uniform float uTime, uAmp; varying vec3 vW; varying vec3 vN; varying float vCrest;
#include <fog_pars_vertex>
// direction (xy), steepness, wavelength
const vec4 W[5] = vec4[5](vec4(1., .3, .22, 18.), vec4(-.4, 1., .2, 11.), vec4(.7, -.6, .16, 6.5), vec4(-.9, -.3, .12, 3.7), vec4(.2, .95, .1, 2.3));
vec3 gerstner(vec4 w, vec3 p, inout vec3 t, inout vec3 b){
  float k = 6.28318 / w.w, c = sqrt(9.8 / k); vec2 d = normalize(w.xy);
  float f = k * (dot(d, p.xz) - c * uTime * .55), a = w.z / k * uAmp;
  t += vec3(-d.x * d.x * w.z * sin(f), d.x * w.z * cos(f), -d.x * d.y * w.z * sin(f)) * uAmp;
  b += vec3(-d.x * d.y * w.z * sin(f), d.y * w.z * cos(f), -d.y * d.y * w.z * sin(f)) * uAmp;
  return vec3(d.x * a * cos(f), a * sin(f), d.y * a * cos(f));
}
void main(){
  vec3 p = (modelMatrix * vec4(position, 1.)).xyz, t = vec3(1, 0, 0), b = vec3(0, 0, 1), off = vec3(0);
  for (int i = 0; i < 5; i++) off += gerstner(W[i], p, t, b);
  p += off; vW = p; vN = normalize(cross(b, t)); vCrest = off.y;
  vec4 mvPosition = viewMatrix * vec4(p, 1.);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const OCEAN_FRAG = `
uniform vec3 uSun, uMoon, uDay, uDusk, uNight, uSunCol, uDeep, uGlow; uniform float uSunAlt, uMoonLit, uTime, uDark, uGlowK;
varying vec3 vW; varying vec3 vN; varying float vCrest;
#include <fog_pars_fragment>
${NOISE}
vec3 skyCol(vec3 d){
  float day = smoothstep(-.1, .25, uSunAlt), dusk = exp(-pow(uSunAlt / .16, 2.));
  vec3 zen = mix(uNight, uDay, day), hor = mix(zen * 1.4, uDusk, dusk * .9);
  return mix(hor, zen, smoothstep(0., .55, max(d.y, 0.)));
}
void main(){
  // small ripples on top of the big waves
  vec2 q = vW.xz * .35; float e = .05;
  float r0 = fbm(q + uTime * .12), rx = fbm(q + vec2(e, 0) + uTime * .12), rz = fbm(q + vec2(0, e) + uTime * .12);
  vec3 n = normalize(vN + vec3(r0 - rx, 0., r0 - rz) * 2.2);
  vec3 v = normalize(cameraPosition - vW), r = reflect(-v, n);
  float fres = .02 + .98 * pow(1. - max(dot(n, v), 0.), 5.);
  vec3 refl = skyCol(r);
  // the real sun (and moon) glinting off the water
  float sunUp = smoothstep(-.06, .05, uSunAlt);
  refl += uSunCol * (pow(max(dot(r, uSun), 0.), 380.) * 9. + pow(max(dot(r, uSun), 0.), 40.) * .5) * sunUp;
  refl += vec3(.85, .88, .95) * pow(max(dot(r, uMoon), 0.), 900.) * 4. * uMoonLit * (1. - sunUp);
  vec3 body = uDeep * (.6 + .4 * max(dot(n, vec3(0, 1, 0)), 0.));
  vec3 col = mix(body, refl, fres);
  // foam on the crests
  float foam = smoothstep(.85, 1.25, vCrest * 1.1 + fbm(vW.xz * 1.6 + uTime * .3) * .45) * smoothstep(.45, .7, fbm(vW.xz * 3.1 - uTime * .2));
  col = mix(col, uDark > .5 ? vec3(.42, .46, .5) : vec3(1.), foam * .4);
  // the network's glow, shimmering on the water under it
  float gd = length(vW.xz);
  col += uGlow * uGlowK * exp(-gd * gd / 70.) * pow(r0, 3.) * fres * (uDark > .5 ? .9 : .25);
  gl_FragColor = vec4(col, 1.);
  #include <fog_fragment>
}`;

const CLOUD_FRAG = `
uniform float uTime, uCover, uDark, uSunAlt; uniform vec2 uWind; uniform vec3 uSun, uLit, uShade, uBg; uniform vec3 uCam;
varying vec3 vW;
${NOISE}
void main(){
  vec2 p = vW.xz * .011 + uWind * uTime;
  float d = fbm(p) * .65 + fbm(p * 2.3 - uWind * uTime * .6) * .35;
  float th = 1. - uCover;                     // more cover, lower threshold
  float a = smoothstep(th - .08, th + .22, d);
  if (a < .01) discard;
  // lit from the sun's side: a bright edge toward it, a darker belly
  float side = fbm(p + normalize(uSun.xz + 1e-4) * .06) - d;
  float day = smoothstep(-.1, .2, uSunAlt);
  vec3 col = mix(uShade, uLit, clamp(.55 + side * 3. + day * .2, 0., 1.));
  // fade out with distance into the page colour
  float dist = length(vW.xz - uCam.xz);
  float fade = 1. - smoothstep(90., 200., dist);
  gl_FragColor = vec4(mix(uBg, col, fade), a * fade * (uDark > .5 ? .8 : .9));
}`;

export function createOcean(skyU: Record<string, THREE.IUniform>, phone: boolean){
  const group = new THREE.Group();
  const seg = phone ? 110 : 220;
  const oceanU = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
    uTime: { value: 0 }, uAmp: { value: 1 }, uDeep: { value: new THREE.Color() }, uGlow: { value: new THREE.Color() }, uGlowK: { value: 1 }, uDark: { value: 1 },
  }]);
  // share the sky's own uniform objects, so the water always reflects what the dome shows
  for (const k of ['uSun', 'uMoon', 'uDay', 'uDusk', 'uNight', 'uSunCol', 'uSunAlt', 'uMoonLit']) oceanU[k] = skyU[k];
  const ocean = new THREE.Mesh(new THREE.PlaneGeometry(260, 260, seg, seg).rotateX(-Math.PI / 2),
    new THREE.ShaderMaterial({ uniforms: oceanU, vertexShader: OCEAN_VERT, fragmentShader: OCEAN_FRAG, fog: true }));
  ocean.position.y = -10.5; ocean.frustumCulled = false; ocean.renderOrder = -5;
  group.add(ocean);

  const cloudU = {
    uTime: { value: 0 }, uCover: { value: .4 }, uDark: { value: 1 }, uWind: { value: new THREE.Vector2(.004, .002) },
    uSun: skyU.uSun, uSunAlt: skyU.uSunAlt, uLit: { value: new THREE.Color() }, uShade: { value: new THREE.Color() }, uBg: { value: new THREE.Color() }, uCam: { value: new THREE.Vector3() },
  };
  const clouds = new THREE.Mesh(new THREE.PlaneGeometry(520, 520, 1, 1).rotateX(Math.PI / 2),
    new THREE.ShaderMaterial({ uniforms: cloudU, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: CLOUD_FRAG }));
  clouds.position.y = 46; clouds.frustumCulled = false; clouds.renderOrder = -6;
  group.add(clouds);

  return {
    group,
    paint(dark: boolean, bg: THREE.Color, glow: THREE.Color){
      oceanU.uDark.value = dark ? 1 : 0; cloudU.uDark.value = dark ? 1 : 0;
      (oceanU.uDeep.value as THREE.Color).set(dark ? '#03080c' : '#9db4c2');
      (oceanU.uGlow.value as THREE.Color).copy(glow);
      cloudU.uBg.value.copy(bg);
      cloudU.uLit.value.set(dark ? '#3a4048' : '#ffffff'); cloudU.uShade.value.set(dark ? '#101317' : '#b8c0c8');
    },
    /** cover 0..100 (%), wind in km/h toward a compass direction (deg it blows from) */
    setWeather(cover: number, wind: number, fromDeg: number){
      cloudU.uCover.value = .12 + Math.min(1, cover / 100) * .62;
      // it blows *from* fromDeg: move the noise the other way. North is -z here.
      const a = (fromDeg + 180) * Math.PI / 180, s = .0009 + wind * .00022;
      cloudU.uWind.value.set(-Math.sin(a) * s, Math.cos(a) * s);
      oceanU.uAmp.value = .65 + Math.min(1.2, wind / 25);
    },
    update(t: number, camera: THREE.Camera, calm: boolean){
      oceanU.uTime.value = calm ? 0 : t; cloudU.uTime.value = calm ? 0 : t;
      cloudU.uCam.value.copy(camera.position);
      // keep the water under the camera, so it never runs out
      ocean.position.x = Math.round(camera.position.x / 20) * 20; ocean.position.z = Math.round(camera.position.z / 20) * 20;
      clouds.position.x = camera.position.x; clouds.position.z = camera.position.z;
    },
  };
}

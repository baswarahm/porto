/* ==========================================================================
   FLUID.TS — the swarm, simulated on the GPU (GPGPU ping-pong textures).
   ~200,000 particles (65,000 on phones). Each frame, for every particle:
     · a spring pulls it toward its spot in the current section's shape
       (blended toward the next section's shape as you scroll)
     · curl noise stirs it like a current in a liquid; while you scroll
       between sections the spring loosens and the currents take over,
       so one shape melts and flows into the next
     · the cursor pushes a hole through it
   The points read their position straight from the simulation texture.
   ========================================================================== */
import * as THREE from 'three';
import { GPUComputationRenderer, type Variable } from 'three/examples/jsm/misc/GPUComputationRenderer.js';

// simplex noise + curl (after Ashima Arts / Stefan Gustavson, MIT)
const NOISE = `
vec4 permute(vec4 x){ return mod(((x * 34.0) + 1.0) * x, 289.0); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v){
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0); const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy)); vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz); vec3 l = 1.0 - g; vec3 i1 = min(g.xyz, l.zxy); vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx; vec3 x2 = x0 - i2 + 2.0 * C.xxx; vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
  i = mod(i, 289.0);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 1.0 / 7.0; vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z); vec4 x_ = floor(j * ns.z); vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy; vec4 y = y_ * ns.x + ns.yyyy; vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy); vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0; vec4 s1 = floor(b1) * 2.0 + 1.0; vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy; vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x); vec3 p1 = vec3(a0.zw, h.y); vec3 p2 = vec3(a1.xy, h.z); vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0); m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
vec3 snoise3(vec3 x){ return vec3(snoise(x), snoise(vec3(x.y - 19.1, x.z + 33.4, x.x + 47.2)), snoise(vec3(x.z + 74.2, x.x - 124.5, x.y + 99.4))); }
vec3 curl(vec3 p){
  const float e = .1; vec3 dx = vec3(e, 0., 0.), dy = vec3(0., e, 0.), dz = vec3(0., 0., e);
  vec3 px0 = snoise3(p - dx), px1 = snoise3(p + dx), py0 = snoise3(p - dy), py1 = snoise3(p + dy), pz0 = snoise3(p - dz), pz1 = snoise3(p + dz);
  float x = py1.z - py0.z - pz1.y + pz0.y, y = pz1.x - pz0.x - px1.z + px0.z, z = px1.y - px0.y - py1.x + py0.x;
  return normalize(vec3(x, y, z) / (2.0 * e) + 1e-5);
}`;

const VEL = `
uniform sampler2D tA, tB; uniform float uK, uDt, uTime, uKick, uMouseOn; uniform vec3 uMouse;
${NOISE}
void main(){
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec3 p = texture2D(texturePosition, uv).xyz, v = texture2D(textureVelocity, uv).xyz;
  float s = uK * uK * (3.0 - 2.0 * uK);
  vec3 target = mix(texture2D(tA, uv).xyz, texture2D(tB, uv).xyz, s);
  // loose while travelling between sections (and after a kick), tight when you're reading one
  float loose = clamp(sin(uK * 3.14159) * 1.15 + uKick, 0.0, 1.0);
  vec3 f = (target - p) * mix(7.0, 1.2, loose);
  f += curl(p * .32 + vec3(0., uTime * .12, 0.)) * mix(.55, 7.5, loose);
  vec3 dm = p - uMouse; float d2 = dot(dm, dm);
  f += uMouseOn * normalize(dm + 1e-4) * 26.0 * exp(-d2 * 1.1);
  v = v * exp(-uDt * 3.6) + f * uDt;
  gl_FragColor = vec4(v, 1.0);
}`;
const POS = `
uniform float uDt;
void main(){
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec3 p = texture2D(texturePosition, uv).xyz, v = texture2D(textureVelocity, uv).xyz;
  gl_FragColor = vec4(p + v * uDt, 1.0);
}`;

const PT_VERT = `
uniform sampler2D tPos, tVel; uniform float uSize, uScale, uFogNear, uFogFar;
attribute vec2 ref; varying float vFade, vHeat;
void main(){
  vec3 p = texture2D(tPos, ref).xyz;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float speed = length(texture2D(tVel, ref).xyz);
  vHeat = clamp(speed * .07 - .15, 0.0, .8);
  vFade = 1.0 - smoothstep(uFogNear, uFogFar, -mv.z);
  gl_PointSize = max(1.25, uSize * (1.0 + vHeat * .6) * uScale / -mv.z);
  gl_Position = projectionMatrix * mv;
}`;
const PT_FRAG = `
uniform vec3 uColor, uHot; uniform float uOpacity; varying float vFade, vHeat;
void main(){
  vec2 c = gl_PointCoord - .5; float r = dot(c, c);
  if (r > .25) discard;
  float a = (1.0 - r * 4.0); a *= a;
  gl_FragColor = vec4(mix(uColor, uHot, vHeat), a * uOpacity * vFade);
}`;

export function createFluid(renderer: THREE.WebGLRenderer, size: number, shapes: Record<string, Float32Array>, start: string){
  const N = size * size;
  const gpu = new GPUComputationRenderer(size, size, renderer);
  const toTex = (a: Float32Array) => {
    const t = gpu.createTexture(), d = t.image.data as unknown as Float32Array;
    for (let n = 0; n < N; n++){ d[n * 4] = a[n * 3]; d[n * 4 + 1] = a[n * 3 + 1]; d[n * 4 + 2] = a[n * 3 + 2]; d[n * 4 + 3] = 1; }
    t.needsUpdate = true; return t;
  };
  const tex: Record<string, THREE.DataTexture> = {};
  for (const [k, a] of Object.entries(shapes)) tex[k] = toTex(a);
  const pos0 = toTex(shapes[start]), vel0 = gpu.createTexture();
  const posVar: Variable = gpu.addVariable('texturePosition', POS, pos0);
  const velVar: Variable = gpu.addVariable('textureVelocity', VEL, vel0);
  gpu.setVariableDependencies(posVar, [posVar, velVar]);
  gpu.setVariableDependencies(velVar, [posVar, velVar]);
  const vu = velVar.material.uniforms, pu = posVar.material.uniforms;
  Object.assign(vu, { tA: { value: tex[start] }, tB: { value: tex[start] }, uK: { value: 0 }, uDt: { value: .016 }, uTime: { value: 0 }, uKick: { value: 0 }, uMouseOn: { value: 0 }, uMouse: { value: new THREE.Vector3(999, 999, 999) } });
  pu.uDt = { value: .016 };
  const err = gpu.init();
  if (err) throw new Error(err);

  const ref = new Float32Array(N * 2);
  for (let n = 0; n < N; n++){ ref[n * 2] = (n % size + .5) / size; ref[n * 2 + 1] = (Math.floor(n / size) + .5) / size; }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));   // unused, for three's bookkeeping
  geo.setAttribute('ref', new THREE.BufferAttribute(ref, 2));
  const mat = new THREE.ShaderMaterial({
    uniforms: { tPos: { value: null }, tVel: { value: null }, uSize: { value: .07 }, uScale: { value: 400 }, uFogNear: { value: 14 }, uFogFar: { value: 62 },
      uColor: { value: new THREE.Color() }, uHot: { value: new THREE.Color('#ffffff') }, uOpacity: { value: .85 } },
    vertexShader: PT_VERT, fragmentShader: PT_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geo, mat); points.frustumCulled = false;

  return {
    points, count: N,
    /** a = the section you're in, b = the next one, k = how far between them */
    update(a: string, b: string, k: number, dt: number, t: number, kick: number, mouse: THREE.Vector3 | null){
      vu.tA.value = tex[a] ?? tex.network; vu.tB.value = tex[b] ?? tex.network;
      vu.uK.value = k; vu.uDt.value = Math.min(dt, 1 / 30); pu.uDt.value = vu.uDt.value; vu.uTime.value = t; vu.uKick.value = Math.min(1, kick / 2.6);
      vu.uMouseOn.value = mouse ? 1 : 0; if (mouse) vu.uMouse.value.copy(mouse);
      gpu.compute();
      mat.uniforms.tPos.value = gpu.getCurrentRenderTarget(posVar).texture;
      mat.uniforms.tVel.value = gpu.getCurrentRenderTarget(velVar).texture;
    },
    setLook(color: THREE.Color, hot: THREE.Color, dark: boolean){
      mat.uniforms.uColor.value.copy(color); mat.uniforms.uHot.value.copy(hot);
      mat.blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending; mat.uniforms.uOpacity.value = dark ? .2 : .3; mat.needsUpdate = true;
    },
    setView(h: number, fogNear: number, fogFar: number){ mat.uniforms.uScale.value = h / 2; mat.uniforms.uFogNear.value = fogNear; mat.uniforms.uFogFar.value = fogFar; },
    setFraction(f: number){ geo.setDrawRange(0, Math.round(N * f)); },
  };
}

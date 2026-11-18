/* ==========================================================================
   FX.TS — post-processing for the WebGL world:
     render → bloom (neon glow on nodes, rings, the hologram edge; night only)
            → output (tone mapping + sRGB)
            → CRT: chromatic aberration toward the edges, faint scanlines,
              film grain, a vignette, and glitch tears on demand
   Quality "low" skips the whole chain and renders straight to the screen.
   ========================================================================== */
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';

const CRT = {
  uniforms: {
    tDiffuse: { value: null }, uTime: { value: 0 }, uAberr: { value: .0016 }, uGlitch: { value: 0 },
    uScan: { value: .05 }, uGrain: { value: .045 }, uVig: { value: .45 }, uRes: { value: new THREE.Vector2(1, 1) },
    tPortal: { value: null }, uPortalOn: { value: 0 }, uPortalC: { value: new THREE.Vector2(.5, .5) }, uPortalR: { value: 0 }, uAspect: { value: 1 },
    uRim: { value: new THREE.Color('#c6ff3d') }, uExposure: { value: 1 },
    uSun: { value: new THREE.Vector3(.5, .5, 0) }, uSunCol: { value: new THREE.Color('#ffe2b0') }, uGrade: { value: 0 },
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `
uniform sampler2D tDiffuse, tPortal; uniform float uTime, uAberr, uGlitch, uScan, uGrain, uVig, uPortalOn, uPortalR, uAspect, uExposure, uGrade;
uniform vec2 uRes, uPortalC; uniform vec3 uRim, uSun, uSunCol; varying vec2 vUv;
float rand(vec2 c){ return fract(sin(dot(c, vec2(12.9898, 78.233))) * 43758.5453); }
// the portal view is a raw (linear, HDR) render: tone map + sRGB it like the output pass does
vec3 aces(vec3 x){ x *= uExposure * .6; return clamp((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14), 0., 1.); }
vec3 toSRGB(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1. / 2.4)) - .055, step(.0031308, c)); }
void main(){
  vec2 uv = vUv;
  // glitch: some horizontal bands tear sideways for a frame or two
  float tick = floor(uTime * 20.0);
  float band = floor(uv.y * 28.0);
  float tear = step(1.0 - uGlitch * .4, rand(vec2(band, tick)));
  uv.x += (rand(vec2(band, tick + 7.0)) - .5) * .09 * uGlitch * tear;
  // chromatic aberration, stronger toward the edges and while glitching
  vec2 d = uv - .5; float r2 = dot(d, d);
  float ab = uAberr * (1.0 + r2 * 5.0) + uGlitch * .01;
  vec3 c = vec3(texture2D(tDiffuse, uv + d * ab).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - d * ab).b);
  c += tear * uGlitch * .08 * vec3(.4, 1.0, .2);
  // portal dive: the next section shows through a growing circle with a glowing rim; the edge bends light like a lens
  if (uPortalOn > .5){
    vec2 q = (vUv - uPortalC) * vec2(uAspect, 1.); float pd = length(q), e = pd - uPortalR;
    float inside = 1. - smoothstep(-.004, .004, e);
    float lens = smoothstep(uPortalR * .55, uPortalR, pd) * inside;
    vec2 puv = vUv - (vUv - uPortalC) * lens * .22;
    vec3 pc = toSRGB(aces(texture2D(tPortal, puv).rgb));
    pc += uRim * lens * lens * .25;
    c = mix(c, pc, inside);
    float rim = exp(-e * e * 2400.);
    c += uRim * (rim * 1.4 + exp(-max(e, 0.) * 12.) * .22 * (1. - inside) * step(.001, uPortalR));
  }
  // god rays: march toward the sun and gather the bright pixels on the way (screen-space light shafts)
  if (uSun.z > 0.){
    vec2 dl = (vUv - uSun.xy) / 32.; vec2 su = vUv; float acc = 0., dec = 1.;
    for (int i = 0; i < 32; i++){ su -= dl; vec3 sm = texture2D(tDiffuse, su).rgb; acc += max(0., dot(sm, vec3(.299, .587, .114)) - .8) * dec; dec *= .955; }
    c += uSunCol * acc * uSun.z * .35;
  }
  // photo mode colour grades: 1 noir, 2 film, 3 neon
  float lum = dot(c, vec3(.299, .587, .114));
  if (uGrade > .5 && uGrade < 1.5) c = vec3(smoothstep(.02, .95, lum));
  else if (uGrade > 1.5 && uGrade < 2.5) c = mix(vec3(lum), c, .7) * vec3(1.08, 1., .86) + vec3(.03, .02, 0.);
  else if (uGrade > 2.5) c = pow(c, vec3(.85)) * vec3(.9, 1.05, 1.15) + vec3(.05, 0., .08) * (1. - lum);
  // scanlines (about every 3 device pixels), grain, vignette
  c *= 1.0 - uScan * (.5 + .5 * sin(vUv.y * uRes.y * 2.094));
  c += (rand(vUv * uRes + fract(uTime * 7.31)) - .5) * uGrain;
  c *= 1.0 - uVig * smoothstep(.12, .5, r2);
  gl_FragColor = vec4(c, 1.0);
}`,
};

export function createFx(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera){
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType }));
  composer.addPass(new RenderPass(scene, camera));
  // photo mode: real depth of field (off the rest of the time)
  const bokeh = new BokehPass(scene, camera, { focus: 20, aperture: .0004, maxblur: .008 }); bokeh.enabled = false;
  composer.addPass(bokeh);
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), .45, .35, .86);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const crt = new ShaderPass(CRT);
  composer.addPass(crt);
  let on = true, glitch = 0, dark = true, ratio = 1;
  const portalRT = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
  crt.uniforms.tPortal.value = portalRT.texture;
  let portalCam: THREE.Camera | null = null;

  return {
    setSize(w: number, h: number, r: number){ ratio = r;
      composer.setPixelRatio(r); composer.setSize(w, h);
      portalRT.setSize(Math.round(w * r * .6), Math.round(h * r * .6));
      crt.uniforms.uRes.value.set(w * r, h * r);
    },
    setEnabled(v: boolean){ on = v; },
    setTheme(isDark: boolean){
      dark = isDark;
      // day: a softer bloom with a high threshold, so the paper background never glows
      bloom.threshold = isDark ? .86 : .97; bloom.radius = isDark ? .35 : .5;
      crt.uniforms.uScan.value = isDark ? .05 : .025;
      crt.uniforms.uGrain.value = isDark ? .045 : .03;
      crt.uniforms.uVig.value = isDark ? .45 : .14;
    },
    /** open a portal to what `cam` sees, centred at (cx, cy) in 0..1 screen space, radius in screen heights; null closes it */
    setPortal(cam: THREE.Camera | null, cx = .5, cy = .5, r = 0, aspect = 1, rim?: THREE.Color){
      portalCam = on ? cam : null;
      crt.uniforms.uPortalOn.value = portalCam ? 1 : 0;
      crt.uniforms.uPortalC.value.set(cx, cy); crt.uniforms.uPortalR.value = r; crt.uniforms.uAspect.value = aspect;
      if (rim) crt.uniforms.uRim.value.copy(rim);
      crt.uniforms.uExposure.value = renderer.toneMappingExposure;
    },
    /** where the sun is on screen (0..1) and how strong its rays are (0 = none) */
    setSun(x: number, y: number, strength: number){ crt.uniforms.uSun.value.set(x, y, strength); },
    /** photo mode: depth of field (focus distance, blur 0..1) and a colour grade (0 none, 1 noir, 2 film, 3 neon) */
    setPhoto(o: { on: boolean; focus?: number; blur?: number; grade?: number }){
      bokeh.enabled = o.on && (o.blur ?? 0) > .01;
      const u = bokeh.uniforms as Record<string, THREE.IUniform>;
      if (o.focus !== undefined) u.focus.value = o.focus;
      if (o.blur !== undefined){ u.aperture.value = .00002 + o.blur * .0012; u.maxblur.value = .002 + o.blur * .014; }
      crt.uniforms.uGrade.value = o.on ? (o.grade ?? 0) : 0;
    },
    get enabled(){ return on; },
    /** a glitch spike, 0..1; it fades by itself */
    kick(v: number){ glitch = Math.max(glitch, v); },
    render(t: number, dt: number, extraGlitch = 0){
      if (!on){ renderer.render(scene, camera); return; }
      glitch = Math.max(0, glitch - dt * 1.6);
      crt.uniforms.uTime.value = t;
      crt.uniforms.uGlitch.value = Math.min(1, glitch + extraGlitch);
      bloom.strength = (dark ? .45 : .32) + glitch * .5;
      if (portalCam){ renderer.setRenderTarget(portalRT); renderer.render(scene, portalCam); renderer.setRenderTarget(null); }
      composer.render(dt);
    },
  };
}

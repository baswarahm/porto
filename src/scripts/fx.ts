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

const CRT = {
  uniforms: {
    tDiffuse: { value: null }, uTime: { value: 0 }, uAberr: { value: .0016 }, uGlitch: { value: 0 },
    uScan: { value: .05 }, uGrain: { value: .045 }, uVig: { value: .45 }, uRes: { value: new THREE.Vector2(1, 1) },
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `
uniform sampler2D tDiffuse; uniform float uTime, uAberr, uGlitch, uScan, uGrain, uVig; uniform vec2 uRes; varying vec2 vUv;
float rand(vec2 c){ return fract(sin(dot(c, vec2(12.9898, 78.233))) * 43758.5453); }
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
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), .45, .35, .86);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const crt = new ShaderPass(CRT);
  composer.addPass(crt);
  let on = true, glitch = 0, dark = true;

  return {
    setSize(w: number, h: number, ratio: number){
      composer.setPixelRatio(ratio); composer.setSize(w, h);
      crt.uniforms.uRes.value.set(w * ratio, h * ratio);
    },
    setEnabled(v: boolean){ on = v; },
    setTheme(isDark: boolean){
      dark = isDark;
      bloom.enabled = isDark;
      crt.uniforms.uScan.value = isDark ? .05 : .025;
      crt.uniforms.uGrain.value = isDark ? .045 : .03;
      crt.uniforms.uVig.value = isDark ? .45 : .14;
    },
    /** a glitch spike, 0..1; it fades by itself */
    kick(v: number){ glitch = Math.max(glitch, v); },
    render(t: number, dt: number, extraGlitch = 0){
      if (!on){ renderer.render(scene, camera); return; }
      glitch = Math.max(0, glitch - dt * 1.6);
      crt.uniforms.uTime.value = t;
      crt.uniforms.uGlitch.value = Math.min(1, glitch + extraGlitch);
      bloom.strength = dark ? .45 + glitch * .5 : 0;
      composer.render(dt);
    },
  };
}

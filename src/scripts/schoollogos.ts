/* ==========================================================================
   SCHOOLLOGOS.TS — hologram school crests on the 3D journey rail.
   Each education commit (SMP, SMA, USM) projects its school's real logo as
   a hologram beside it: the white paper behind the logo is cut away, the
   rest is tinted toward the theme colour, with scanlines, a sweep of light,
   flicker and the odd glitch tear, and a cone of light from the node.
   A crest materializes, bottom to top, once HEAD on the journey reaches
   its commit, and fades again if you scroll back above it.
   ========================================================================== */
import * as THREE from 'three';

export interface LogoSpec { src: string; caption: string; sub: string; at: THREE.Vector3; node: THREE.Vector3; frac: number; tip: string }

const VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;
const FRAG = `
uniform sampler2D map; uniform float uTime, uReveal, uSeed, uDark; uniform vec3 uTint; varying vec2 vUv;
float rnd(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main(){
  vec2 uv = vUv;
  // a glitch tear now and then: a band slides sideways for a frame
  float band = floor(uv.y * 26.), tick = floor(uTime * 14. + uSeed * 7.);
  uv.x += step(.985, rnd(vec2(band, tick))) * (rnd(vec2(tick, band)) - .5) * .08;
  vec4 c = texture2D(map, uv);
  if (c.a < .03) discard;
  // materialize from the bottom up, with a bright line at the edge
  float edge = uReveal * 1.12 - .06;
  if (vUv.y > edge) discard;
  float rim = smoothstep(.06, 0., edge - vUv.y) * step(uReveal, .999);
  float lum = dot(c.rgb, vec3(.299, .587, .114));
  // the logo's own colours, pulled toward the theme colour; the dark glass stays dark
  vec3 col = mix(c.rgb, uTint * (.4 + lum), (uDark > .5 ? .5 : .3) * smoothstep(.08, .3, lum));
  float scan = .78 + .22 * sin(vUv.y * 260. - uTime * 7.);
  float sweep = smoothstep(.06, 0., abs(fract(uTime * .22 + uSeed) * 1.4 - .2 - vUv.y)) * .6;
  float flick = .88 + .12 * step(.93, rnd(vec2(floor(uTime * 18.), uSeed)));
  // glow: the logo itself is pushed past white so the bloom catches it; the dark glass stays dark
  col = col * scan * flick * (1. + smoothstep(.1, .5, lum) * (uDark > .5 ? 1.3 : .2)) + uTint * (sweep + rim * 1.6);
  gl_FragColor = vec4(col, c.a * flick);
}`;

/** draw a logo onto a canvas with its caption under it; near-white paper becomes transparent */
const bake = (img0: HTMLImageElement, caption: string, sub: string) => {
  // trim the white margin round the logo first, so the card hugs the crest
  const iw = img0.naturalWidth || img0.width || 512, ih = img0.naturalHeight || img0.height || 512;
  const src = document.createElement('canvas'); src.width = iw; src.height = ih;
  const sg = src.getContext('2d', { willReadFrequently: true })!; sg.fillStyle = '#fff'; sg.fillRect(0, 0, iw, ih); sg.drawImage(img0, 0, 0, iw, ih);
  const px = sg.getImageData(0, 0, iw, ih).data;
  let x0 = iw, y0 = ih, x1 = 0, y1 = 0;
  for (let y = 0; y < ih; y++) for (let x = 0; x < iw; x++){
    const i = (y * iw + x) * 4;
    if (Math.min(px[i], px[i + 1], px[i + 2]) < 225){ if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 <= x0 || y1 <= y0){ x0 = 0; y0 = 0; x1 = iw - 1; y1 = ih - 1; }
  const pad = Math.round(Math.max(x1 - x0, y1 - y0) * .07);
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(iw - 1, x1 + pad); y1 = Math.min(ih - 1, y1 + pad);
  const img = document.createElement('canvas'); img.width = x1 - x0 + 1; img.height = y1 - y0 + 1;
  img.getContext('2d')!.drawImage(src, x0, y0, img.width, img.height, 0, 0, img.width, img.height);
  const W = 512, ar = img.height / img.width || 1, LH = Math.round(W * ar), CAP = 120;
  const c = document.createElement('canvas'); c.width = W; c.height = LH + CAP;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, LH);   // transparent logos sit on paper too
  g.drawImage(img, 0, 0, W, LH);
  const d = g.getImageData(0, 0, W, LH);
  for (let i = 0; i < d.data.length; i += 4){
    const r = d.data[i], gg = d.data[i + 1], b = d.data[i + 2], mn = Math.min(r, gg, b);
    // white paper becomes dark projector glass, so the crest reads over anything behind it
    if (mn > 200){ const k = Math.min(1, (mn - 200) / 48); d.data[i] = r + (6 - r) * k; d.data[i + 1] = gg + (10 - gg) * k; d.data[i + 2] = b + (12 - b) * k; d.data[i + 3] = 255 - k * 22; }
  }
  g.putImageData(d, 0, 0);
  // the caption plate and a thin frame round the whole card
  g.fillStyle = 'rgba(6,10,12,.94)'; g.fillRect(0, LH, W, CAP);
  g.strokeStyle = '#ffffff'; g.globalAlpha = .55; g.lineWidth = 4; g.strokeRect(2, 2, W - 4, LH + CAP - 4); g.globalAlpha = 1;
  g.textAlign = 'center'; g.fillStyle = '#ffffff';
  g.font = '700 54px ui-monospace, Menlo, Consolas, monospace'; g.fillText(caption, W / 2, LH + 62);
  g.globalAlpha = .75; g.font = '500 30px ui-monospace, Menlo, Consolas, monospace'; g.fillText(sub, W / 2, LH + 104);
  return { canvas: c, aspect: c.height / c.width };
};

export function createSchoolLogos(parent: THREE.Object3D, specs: LogoSpec[]){
  const items: { m: THREE.Mesh; u: Record<string, THREE.IUniform>; cone: THREE.Mesh; spec: LogoSpec; shown: number }[] = [];
  const coneMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  const SIZE = 1.2;
  specs.forEach((spec, n) => {
    const u = { map: { value: null as THREE.Texture | null }, uTime: { value: 0 }, uReveal: { value: 0 }, uSeed: { value: n * .37 + .1 }, uDark: { value: 1 }, uTint: { value: new THREE.Color('#c6ff3d') } };
    const mat = new THREE.ShaderMaterial({ uniforms: u, vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(SIZE, SIZE), mat);
    m.position.copy(spec.at); m.visible = false; m.userData.tip = spec.tip; parent.add(m);
    // the projector: a soft cone of light from the commit up to the crest
    const dir = spec.at.clone().sub(spec.node), len = dir.length();
    const cone = new THREE.Mesh(new THREE.ConeGeometry(.5, len, 24, 1, true).rotateX(Math.PI).translate(0, len / 2, 0), coneMat.clone());
    cone.position.copy(spec.node); cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()); cone.visible = false; parent.add(cone);
    const img = new Image(); img.decoding = 'async';
    img.onload = () => {
      const { canvas, aspect } = bake(img, spec.caption, spec.sub);
      const tx = new THREE.CanvasTexture(canvas); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4;
      u.map.value = tx; m.scale.set(1, aspect, 1); m.visible = true;
    };
    img.src = spec.src;
    items.push({ m, u, cone, spec, shown: 0 });
  });

  const q = new THREE.Quaternion();
  return {
    meshes: () => items.filter(i => i.m.visible && i.shown > .5).map(i => i.m),
    paint(dark: boolean, tint: THREE.Color){
      items.forEach(i => {
        i.u.uDark.value = dark ? 1 : 0; (i.u.uTint.value as THREE.Color).copy(tint);

        const cm = i.cone.material as THREE.MeshBasicMaterial; cm.color.copy(tint); cm.blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending; cm.needsUpdate = true;
      });
    },
    /** head: where HEAD is on the journey (0..1); the crests face the camera */
    update(t: number, dt: number, head: number, camera: THREE.Camera, calm: boolean){
      parent.getWorldQuaternion(q).invert().multiply(camera.quaternion);
      items.forEach(i => {
        const want = head >= i.spec.frac - .02 ? 1 : 0;
        i.shown = calm ? want : THREE.MathUtils.clamp(i.shown + (want ? dt * 1.1 : -dt * 2), 0, 1);
        i.u.uReveal.value = i.shown; i.u.uTime.value = t;
        i.m.quaternion.copy(q);
        i.m.position.y = i.spec.at.y + (calm ? 0 : Math.sin(t * 1.3 + i.spec.frac * 9) * .05);
        const cm = i.cone.material as THREE.MeshBasicMaterial;
        cm.opacity = i.shown * (.07 + (calm ? 0 : Math.sin(t * 7 + i.spec.frac * 5) * .015));
        i.cone.visible = i.shown > .01 && i.m.visible;
      });
    },
  };
}

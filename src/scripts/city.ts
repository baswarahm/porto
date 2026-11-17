/* ==========================================================================
   CITY.TS — my public GitHub repos as a 3D city at night, live from the
   GitHub API. One tower per repo:
     · height  = commits (log scale)       · footprint = repo size
     · windows lit = how recently it was pushed (fresh repos glow, old ones go dark)
     · roof beacon in the language's colour, the name floating above
   Cars of light drive the streets. The camera swoops in from above; orbit,
   hover a tower, click it for details and a link to the repo.
   Data is cached for an hour (the API allows 60 requests an hour per visitor).
   ========================================================================== */
import * as THREE from 'three';
import { openRoom, picker } from './overlay3d';
import { cssVar, reducedMotion, store } from './env';

const USER = 'baswarahm';
interface Repo { name: string; language: string | null; size: number; pushed_at: string; html_url: string; description: string | null; stargazers_count: number; commits: number }
const LANG: Record<string, string> = { TypeScript: '#3178c6', JavaScript: '#f1e05a', HTML: '#e34c26', CSS: '#663399', Python: '#3572a5', Java: '#b07219' };

async function loadRepos(): Promise<Repo[]>{
  try { const c = JSON.parse(store.get('bhm-city') ?? 'null'); if (c && Date.now() - c.at < 3600_000) return c.repos; } catch { /* refetch */ }
  const r = await fetch(`https://api.github.com/users/${USER}/repos?per_page=100&sort=pushed`, { headers: { Accept: 'application/vnd.github+json' } });
  if (!r.ok) throw new Error(`GitHub said ${r.status}`);
  const list = (await r.json() as (Repo & { fork: boolean })[]).filter(x => !x.fork);
  const repos = await Promise.all(list.map(async x => {
    // the commit count, from the last page number of a one-per-page listing
    let commits = 1;
    try {
      const c = await fetch(`https://api.github.com/repos/${USER}/${x.name}/commits?per_page=1`);
      const last = c.headers.get('Link')?.match(/[?&]page=(\d+)>; rel="last"/);
      commits = last ? +last[1] : (await c.json() as unknown[]).length;
    } catch { /* keep 1 */ }
    return { name: x.name, language: x.language, size: x.size, pushed_at: x.pushed_at, html_url: x.html_url, description: x.description, stargazers_count: x.stargazers_count, commits };
  }));
  store.set('bhm-city', JSON.stringify({ at: Date.now(), repos }));
  return repos;
}

const BVERT = `varying vec3 vW; varying vec3 vN; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`;
const BFRAG = `
uniform vec3 uBody, uWin, uEdge; uniform float uLit, uTime, uSeed, uTop; varying vec3 vW; varying vec3 vN;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7)) + uSeed) * 43758.5453); }
void main(){
  vec3 col = uBody;
  if (abs(vN.y) < .5){
    vec2 q = vec2((abs(vN.x) > .5 ? vW.z : vW.x) * 2.4, vW.y * 2.1);
    vec2 cell = floor(q), f = fract(q);
    float win = step(.2, f.x) * step(f.x, .8) * step(.25, f.y) * step(f.y, .75) * step(.4, vW.y) * step(vW.y, uTop - .3);
    float on = step(h(cell), uLit) * (.75 + .25 * step(.97, h(cell + floor(uTime * .5))));
    col = mix(col, uWin * (.35 + on * 1.6), win * (.15 + on * .85));
  } else if (vN.y > .5) col = uBody * 1.6;
  // a lit edge at the top of the tower
  col += uEdge * smoothstep(uTop - .15, uTop, vW.y) * .8;
  gl_FragColor = vec4(col, 1.);
}`;

export function openCity(){
  const legend = `<ul class="room-legend">${Object.entries(LANG).slice(0, 4).map(([l, c]) => `<li style="--c:${c}"><i></i>${l}</li>`).join('')}<li class="st">height = commits · lit windows = pushed recently</li></ul>`;
  const room = openRoom({ title: 'Code city', sub: `github.com/${USER} · live`, label: 'My GitHub repositories as a 3D city', legend });
  const { scene, camera, controls, el } = room;
  const card = el.querySelector<HTMLElement>('.room-card')!, tip = el.querySelector<HTMLElement>('.room-tip')!;
  card.hidden = false; card.innerHTML = '<p class="room-k">connecting to api.github.com ...</p>';
  camera.position.set(0, 70, 50); controls.target.set(0, 4, 0); controls.maxPolarAngle = Math.PI * .48; controls.minDistance = 10; controls.maxDistance = 90;
  scene.add(new THREE.AmbientLight(0xffffff, .35));
  const moon = new THREE.DirectionalLight(room.dark ? 0x9fb4ff : 0xffffff, room.dark ? .8 : 1.6); moon.position.set(-20, 40, 10); scene.add(moon);
  const ink3 = new THREE.Color(cssVar('--ink-3')), signal = new THREE.Color(cssVar('--signal'));
  // ground and streets
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: room.dark ? 0x07090b : 0xe4e5df, roughness: .95 }));
  ground.rotation.x = -Math.PI / 2; scene.add(ground);
  const grid = new THREE.GridHelper(120, 40, ink3, ink3); (grid.material as THREE.LineBasicMaterial).transparent = true; (grid.material as THREE.LineBasicMaterial).opacity = .22; grid.position.y = .01; scene.add(grid);

  type Tower = { m: THREE.Mesh; r: Repo; h: number; mat: THREE.ShaderMaterial; beacon: THREE.Mesh };
  const towers: Tower[] = [];
  let cars: { p: THREE.Points; paths: { a: THREE.Vector3; b: THREE.Vector3; o: number; sp: number }[]; pos: Float32Array } | null = null;
  const label = (text: string, sub: string) => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 128; const g = c.getContext('2d')!;
    g.font = '600 52px "IBM Plex Sans", sans-serif'; g.fillStyle = room.dark ? '#eef2ea' : '#0b0c0d'; g.textAlign = 'center'; g.fillText(text, 256, 60);
    g.font = '500 30px "IBM Plex Mono", monospace'; g.fillStyle = cssVar('--signal'); g.fillText(sub, 256, 108);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
    sp.scale.set(6, 1.5, 1); return sp;
  };
  const build = (repos: Repo[]) => {
    repos.sort((a, b) => b.commits - a.commits);
    const cols = Math.ceil(Math.sqrt(repos.length)), GAP = 9;
    const streets: THREE.Vector3[][] = [];
    repos.forEach((r, i) => {
      const cx = (i % cols - (cols - 1) / 2) * GAP, cz = (Math.floor(i / cols) - (Math.ceil(repos.length / cols) - 1) / 2) * GAP;
      const hgt = 2.5 + Math.log2(r.commits + 1) * 2.3, wid = 2.4 + Math.min(3, Math.log10(r.size + 10));
      const days = (Date.now() - Date.parse(r.pushed_at)) / 86400000;
      const mat = new THREE.ShaderMaterial({ vertexShader: BVERT, fragmentShader: BFRAG, uniforms: {
        uBody: { value: new THREE.Color(room.dark ? '#0d1116' : '#cfd2c9') }, uWin: { value: new THREE.Color(room.dark ? '#ffd27a' : '#2d3b47') },
        uEdge: { value: new THREE.Color(LANG[r.language ?? ''] ?? cssVar('--signal')) }, uLit: { value: THREE.MathUtils.clamp(1 - days / 45, .06, .92) },
        uTime: { value: 0 }, uSeed: { value: i * 7.3 }, uTop: { value: hgt } } });
      const geo = new THREE.BoxGeometry(wid, hgt, wid); geo.translate(0, hgt / 2, 0);
      const m = new THREE.Mesh(geo, mat); m.position.set(cx, 0, cz); m.scale.y = .001; scene.add(m);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: LANG[r.language ?? ''] ?? signal, transparent: true, opacity: .55 }));
      m.add(edges);
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(.28, 12, 12), new THREE.MeshBasicMaterial({ color: LANG[r.language ?? ''] ?? signal, toneMapped: false }));
      beacon.position.y = hgt + .5; m.add(beacon);
      const lb = label(r.name, `${r.commits} commits`); lb.position.y = hgt + 2.2; m.add(lb);
      const t: Tower = { m, r, h: hgt, mat, beacon }; m.userData.tower = t; towers.push(t);
      streets.push([new THREE.Vector3(cx - GAP / 2, .15, cz - GAP / 2), new THREE.Vector3(cx + GAP / 2, .15, cz - GAP / 2)], [new THREE.Vector3(cx - GAP / 2, .15, cz - GAP / 2), new THREE.Vector3(cx - GAP / 2, .15, cz + GAP / 2)]);
    });
    // light cars on the streets
    const N = 160, pos = new Float32Array(N * 3);
    const p = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pos, 3)),
      new THREE.PointsMaterial({ color: room.dark ? 0xff7a59 : 0xd23c1e, size: .32, transparent: true, depthWrite: false, blending: room.dark ? THREE.AdditiveBlending : THREE.NormalBlending }));
    p.frustumCulled = false; scene.add(p);
    cars = { p, pos, paths: Array.from({ length: N }, (_, i) => { const s = streets[i % streets.length]; return { a: s[0], b: s[1], o: Math.random(), sp: (.05 + Math.random() * .12) * (i % 2 ? 1 : -1) }; }) };
    card.innerHTML = `<p class="room-k">${repos.length} public repos · ${repos.reduce((a, r) => a + r.commits, 0)} commits</p><p>Click a tower for details.</p>`;
  };
  loadRepos().then(build).catch(err => {
    card.innerHTML = `<p class="room-k">couldn't reach GitHub</p><p>${String(err.message ?? err)}. It may be rate limiting; try again in a bit.</p>`;
  });

  const pk = picker(room, () => towers.map(t => t.m));
  let hover: Tower | null = null;
  room.canvas.addEventListener('click', () => {
    if (!hover) return;
    const r = hover.r, days = Math.round((Date.now() - Date.parse(r.pushed_at)) / 86400000);
    card.hidden = false;
    card.innerHTML = `<p class="room-k">${r.language ?? 'code'} · ${r.commits} commits${r.stargazers_count ? ` · ★ ${r.stargazers_count}` : ''}</p><h3>${r.name}</h3>
      ${r.description ? `<p>${r.description.replace(/[<>&]/g, '')}</p>` : ''}<p>last push ${days <= 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`}</p>
      <a class="key" href="${r.html_url}" target="_blank" rel="noopener"><span>open on GitHub ↗</span></a>`;
  });
  const start = camera.position.clone(), end = new THREE.Vector3(30, 21, 38);
  room.onFrame = t => {
    // swoop in from above
    const k = reducedMotion ? 1 : THREE.MathUtils.smoothstep(t, 0, 2.6);
    if (k < 1) camera.position.lerpVectors(start, end, k);
    towers.forEach((tw, i) => {
      const g = reducedMotion ? 1 : THREE.MathUtils.clamp((t - .4 - i * .15) / .9, 0, 1);
      tw.m.scale.y = Math.max(.001, 1 - Math.pow(1 - g, 3));
      tw.mat.uniforms.uTime.value = t;
      tw.beacon.scale.setScalar(1 + Math.sin(t * 3 + i) * .25);
    });
    if (cars){
      cars.paths.forEach((c, i) => { const f = (((t * c.sp + c.o) % 1) + 1) % 1; new THREE.Vector3().lerpVectors(c.a, c.b, f).toArray(cars!.pos, i * 3); });
      cars.p.geometry.attributes.position.needsUpdate = true;
    }
    const hit = pk.pick(); const tw = (hit?.object.userData.tower as Tower | undefined) ?? null;
    if (tw !== hover){
      hover = tw; room.canvas.style.cursor = tw ? 'pointer' : '';
      tip.classList.toggle('on', !!tw); if (tw) tip.textContent = `${tw.r.name} · ${tw.r.commits} commits`;
    }
    if (hover) tip.style.transform = `translate(${((pk.mouse.x + 1) / 2 * innerWidth + 16).toFixed(0)}px, ${((1 - pk.mouse.y) / 2 * innerHeight + 12).toFixed(0)}px)`;
  };
  return room;
}

/* ==========================================================================
   MUSIC.TS — the now-playing bar on the home page, docked to the bottom like
   a real player: Rex Orange County, "Hannah Montana". Nothing plays until
   you press play.
   It's a physical slab in 3D (a front edge with depth, it leans toward the
   cursor), the cover sits up off the slab with the record sliding out from
   behind it while it plays, and the visualizer is 3D bars driven by the real
   audio (Web Audio analyser). The same analysis is shared with the 3D world
   (`music` below), so the network moves with the song.
   Two songs, both in full, both mine to choose: Hannah Montana, then What If
   I Call (Merry Christmas, i miss you). Next / prev / shuffle / repeat walk
   that queue; the list button shows it.
   ========================================================================== */
import { reducedMotion, emit } from './env';

type Track = { title: string; artist: string; src: string; cover: string; len: number };
const PLAYLIST: Track[] = [
  { title: 'Hannah Montana', artist: 'Rex Orange County', src: '/music/hannah-montana.mp3', cover: '/music/hannah-montana-cover.jpg', len: 213 },
  // the single's artwork, from Apple's catalogue (the audio file came without one)
  { title: 'What If I Call (Merry Christmas, i miss you)', artist: 'Alex Crichton', src: '/music/what-if-i-call.m4a', len: 247,
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/db/68/80/db6880fb-9032-b17a-d082-6f00620c50c4/3b72e539-6ee5-430b-bea2-4e1c9cddd475.jpg/600x600bb.jpg' },
];
const HOME = PLAYLIST[0];
const esc = (t: string) => t.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
export const MUSIC_EVENT = 'music';

/** live analysis of what's playing, read by the 3D world every frame */
export const music = { playing: false, level: 0, bass: 0, mid: 0, high: 0, beat: 0, bands: new Float32Array(48) };

const I = {
  shuffle: '<path d="M3 6h3.5c2 0 3.2 1 4.3 2.6l2.4 3.6c1 1.6 2.3 2.8 4.3 2.8H21M17.5 12.5 21 15l-3.5 2.5M3 15h3.5c1.4 0 2.4-.6 3.2-1.5M13.3 8.5c.8-.9 1.8-1.5 3.2-1.5H21M17.5 4.5 21 7l-3.5 2.5"/>',
  prev: '<path d="M6 5v14M18 5 9 12l9 7z" fill="currentColor"/>',
  next: '<path d="M18 5v14M6 5l9 7-9 7z" fill="currentColor"/>',
  play: '<path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none"/>',
  pause: '<path d="M7.5 5h3v14h-3zM13.5 5h3v14h-3z" fill="currentColor" stroke="none"/>',
  repeat: '<path d="M4 11V9a3 3 0 0 1 3-3h12M16 3l3 3-3 3M20 13v2a3 3 0 0 1-3 3H5M8 21l-3-3 3-3"/>',
  plus: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
  check: '<circle cx="12" cy="12" r="9" fill="currentColor"/><path d="m8 12.5 2.7 2.7L16.5 9.5" stroke="#000"/>',
  vol: '<path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/>',
  list: '<path d="M4 6h16M4 11h16M4 16h9"/><path d="M17 14.5v5l3.5-2.5z" fill="currentColor"/>',
  mute: '<path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="m16 10 4 4M20 10l-4 4"/>',
};
const svg = (p: string) => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const mmss = (s: number) => !isFinite(s) ? '0:00' : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function initMusic(){
  if (!document.getElementById('world')) return;   // the home page only
  // liked songs, by "title|artist" (the old single flag was for Hannah Montana)
  const likes = new Set<string>();
  try {
    (JSON.parse(localStorage.getItem('bhm-liked-songs') ?? '[]') as string[]).forEach(k => likes.add(k));
    if (localStorage.getItem('bhm-liked') === '1') likes.add(`${HOME.title}|${HOME.artist}`);
  } catch { /* fine */ }
  const keyOf = (t: Track) => `${t.title}|${t.artist}`;
  let liked = likes.has(keyOf(HOME));
  const TRACK = HOME;
  const el = document.createElement('section');
  el.className = 'deck'; el.setAttribute('aria-label', 'Music player');
  el.innerHTML = `
  <div class="deck-slab">
    <div class="deck-left">
      <div class="deck-art" aria-hidden="true"><span class="deck-vinyl"><img src="${TRACK.cover}" alt=""></span><img class="deck-cover" src="${TRACK.cover}" alt=""></div>
      <div class="deck-meta"><p class="deck-t">${TRACK.title}</p><p class="deck-a">${TRACK.artist}</p></div>
      <button type="button" class="deck-ic deck-like" aria-pressed="${liked}" aria-label="Save to your liked songs">${svg(liked ? I.check : I.plus)}</button>
      <button type="button" class="deck-ic deck-q" aria-expanded="false" aria-controls="deckPanel" aria-label="Queue" title="Queue">${svg(I.list)}</button>
    </div>
    <div class="deck-mid">
      <div class="deck-ctrl">
        <button type="button" class="deck-ic deck-shuf" aria-pressed="false" aria-label="Shuffle" title="Shuffle">${svg(I.shuffle)}</button>
        <button type="button" class="deck-ic deck-prev" aria-label="Back to the start">${svg(I.prev)}</button>
        <button type="button" class="deck-play" aria-label="Play ${TRACK.title} by ${TRACK.artist}">${svg(I.play)}</button>
        <button type="button" class="deck-ic deck-next" aria-label="Next">${svg(I.next)}</button>
        <button type="button" class="deck-ic deck-rep" aria-pressed="false" aria-label="Repeat" title="Repeat">${svg(I.repeat)}</button>
      </div>
      <div class="deck-prog"><span class="deck-now">0:00</span><input class="deck-seek" type="range" min="0" max="1000" value="0" step="1" aria-label="Seek"><span class="deck-len">3:33</span></div>
    </div>
    <div class="deck-right">
      <canvas class="deck-viz" aria-hidden="true"></canvas>
      <button type="button" class="deck-ic deck-mute" aria-label="Mute">${svg(I.vol)}</button>
      <input class="deck-vol" type="range" min="0" max="100" value="70" aria-label="Volume">
    </div>
  </div>
  <div class="deck-panel" id="deckPanel" role="dialog" aria-label="Queue" hidden>
    <p class="dp-h">queue · ${PLAYLIST.length} songs</p>
    <ol class="dp-list dp-queue"></ol>
  </div>
  <audio preload="metadata" crossorigin="anonymous" src="${TRACK.src}"></audio>`;
  document.body.append(el);
  document.documentElement.classList.add('deck-on');

  const $ = <T extends Element>(s: string) => el.querySelector<T>(s)!;
  const audio = $<HTMLAudioElement>('audio'), play = $<HTMLButtonElement>('.deck-play'), seek = $<HTMLInputElement>('.deck-seek');
  const vol = $<HTMLInputElement>('.deck-vol'), mute = $<HTMLButtonElement>('.deck-mute'), rep = $<HTMLButtonElement>('.deck-rep'), shuf = $<HTMLButtonElement>('.deck-shuf');
  const like = $<HTMLButtonElement>('.deck-like'), now = $('.deck-now'), len = $('.deck-len'), slab = $<HTMLElement>('.deck-slab');
  audio.volume = .7;

  // ---- transport
  const paintPlay = () => {
    const on = !audio.paused;
    music.playing = on; el.classList.toggle('playing', on);
    play.innerHTML = svg(on ? I.pause : I.play);
    play.setAttribute('aria-label', `${on ? 'Pause' : 'Play'} ${cur.title} by ${cur.artist}`);
    emit(MUSIC_EVENT, on);
  };
  let ctx: AudioContext | null = null, an: AnalyserNode | null = null, bins: Uint8Array<ArrayBuffer> | null = null;
  const wireAudio = () => {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try {
      ctx = new AudioContext();
      const src = ctx.createMediaElementSource(audio);
      an = ctx.createAnalyser(); an.fftSize = 512; an.smoothingTimeConstant = .78;
      src.connect(an); an.connect(ctx.destination);
      bins = new Uint8Array(an.frequencyBinCount);
    } catch { ctx = null; an = null; }
  };
  // ---- the queue: the two songs, in order
  const queue = PLAYLIST;
  let at = 0, cur: Track = HOME, shuffle = false;
  const meta = $<HTMLElement>('.deck-meta'), covers = el.querySelectorAll<HTMLImageElement>('.deck-art img');
  const paintMeta = () => {
    meta.innerHTML = `<p class="deck-t">${esc(cur.title)}</p><p class="deck-a">${esc(cur.artist)}</p>`;
    covers.forEach(i => { i.src = cur.cover; });
    liked = likes.has(keyOf(cur)); like.setAttribute('aria-pressed', String(liked)); like.innerHTML = svg(liked ? I.check : I.plus);
    like.setAttribute('aria-label', liked ? 'Remove from your liked songs' : 'Save to your liked songs');
    if ('mediaSession' in navigator) navigator.mediaSession.metadata = new MediaMetadata({ title: cur.title, artist: cur.artist, artwork: [{ src: cur.cover, sizes: '600x600', type: 'image/jpeg' }] });
    paintQueue();
  };
  const load = (i: number, autoplay: boolean) => {
    at = (i + queue.length) % queue.length; cur = queue[at];
    audio.src = cur.src; audio.load(); paintMeta(); paintTime();
    if (autoplay){ wireAudio(); audio.play().catch(() => {}); }
  };
  const step = (dir: 1 | -1) => {
    if (dir < 0 && audio.currentTime > 3){ audio.currentTime = 0; return; }   // like every player: back = restart first
    if (queue.length < 2){ audio.currentTime = 0; return; }
    const i = shuffle && dir > 0 ? (at + 1 + Math.floor(Math.random() * (queue.length - 1))) % queue.length : at + dir;
    load(i, !audio.paused || dir > 0);
  };
  play.addEventListener('click', () => { wireAudio(); if (audio.paused) audio.play().catch(() => {}); else audio.pause(); });
  audio.addEventListener('play', paintPlay); audio.addEventListener('pause', paintPlay);
  audio.addEventListener('ended', () => {
    if (audio.loop) return;
    // the next song plays; after the last one, the queue goes back to the start and stops
    if (shuffle || at < queue.length - 1) step(1); else { load(0, false); paintPlay(); }
  });
  $<HTMLButtonElement>('.deck-prev').addEventListener('click', () => step(-1));
  $<HTMLButtonElement>('.deck-next').addEventListener('click', () => step(1));
  rep.addEventListener('click', () => { audio.loop = !audio.loop; rep.setAttribute('aria-pressed', String(audio.loop)); });
  shuf.addEventListener('click', () => { shuffle = !shuffle; shuf.setAttribute('aria-pressed', String(shuffle)); shuf.title = shuffle ? 'Shuffle on' : 'Shuffle'; });
  like.addEventListener('click', () => {
    liked = !liked; if (liked) likes.add(keyOf(cur)); else likes.delete(keyOf(cur));
    like.setAttribute('aria-pressed', String(liked)); like.innerHTML = svg(liked ? I.check : I.plus);
    like.setAttribute('aria-label', liked ? 'Remove from your liked songs' : 'Save to your liked songs');
    try { localStorage.setItem('bhm-liked-songs', JSON.stringify([...likes])); localStorage.removeItem('bhm-liked'); } catch { /* fine */ }
  });

  // ---- the queue panel
  const qBtn = $<HTMLButtonElement>('.deck-q'), panel = $<HTMLElement>('.deck-panel'), qList = $<HTMLElement>('.dp-queue');
  const row = (t: Track, i: number) => `<li><button type="button" class="dp-row${i === at ? ' on' : ''}" data-q="${i}" aria-current="${i === at}">
    <img src="${esc(t.cover)}" alt="" loading="lazy"><span class="dp-tt"><b>${esc(t.title)}</b><i>${esc(t.artist)}</i></span>
    <em>${i === at ? (audio.paused ? 'paused' : 'playing') : mmss(t.len)}</em></button></li>`;
  function paintQueue(){ qList.innerHTML = queue.map(row).join(''); }
  const open = (on: boolean) => {
    panel.hidden = !on; qBtn.setAttribute('aria-expanded', String(on)); el.classList.toggle('panel-on', on);
    if (on){ paintQueue(); setTimeout(() => qList.querySelector<HTMLButtonElement>('.dp-row')?.focus(), 30); }
  };
  qBtn.addEventListener('click', () => open(panel.hidden));
  addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden){ open(false); qBtn.focus(); } });
  addEventListener('pointerdown', e => { if (!panel.hidden && !el.contains(e.target as Node)) open(false); });
  panel.addEventListener('click', e => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button.dp-row'); if (!b) return;
    const i = +b.dataset.q!; if (i === at){ play.click(); paintQueue(); } else load(i, true);
  });
  audio.addEventListener('play', paintQueue); audio.addEventListener('pause', paintQueue);

  // ---- time + seeking
  let dragging = false;
  const paintTime = () => {
    const d = audio.duration || 0, c = audio.currentTime;
    if (!dragging) seek.value = String(d ? Math.round(c / d * 1000) : 0);
    now.textContent = mmss(dragging ? +seek.value / 1000 * d : c); len.textContent = mmss(d || cur.len);
    el.style.setProperty('--p', String(+seek.value / 1000));
  };
  audio.addEventListener('timeupdate', paintTime); audio.addEventListener('loadedmetadata', paintTime);
  seek.addEventListener('input', () => { dragging = true; paintTime(); });
  seek.addEventListener('change', () => { audio.currentTime = +seek.value / 1000 * (audio.duration || 0); dragging = false; paintTime(); });
  // ---- volume
  let lastVol = .7;
  const paintVol = () => {
    el.style.setProperty('--v', String(audio.muted ? 0 : audio.volume));
    mute.innerHTML = svg(audio.muted || audio.volume === 0 ? I.mute : I.vol);
    mute.setAttribute('aria-label', audio.muted ? 'Unmute' : 'Mute');
  };
  vol.addEventListener('input', () => { audio.volume = +vol.value / 100; audio.muted = false; if (audio.volume > 0) lastVol = audio.volume; paintVol(); });
  mute.addEventListener('click', () => { audio.muted = !audio.muted; if (!audio.muted && audio.volume === 0){ audio.volume = lastVol; vol.value = String(lastVol * 100); } paintVol(); });
  paintVol(); paintTime();
  // the OS media controls (lock screen, keyboard media keys) show the song and its cover
  if ('mediaSession' in navigator){
    navigator.mediaSession.metadata = new MediaMetadata({ title: HOME.title, artist: HOME.artist, artwork: [{ src: HOME.cover, sizes: '640x640', type: 'image/jpeg' }] });
    navigator.mediaSession.setActionHandler('play', () => { wireAudio(); audio.play(); });
    navigator.mediaSession.setActionHandler('pause', () => audio.pause());
    navigator.mediaSession.setActionHandler('previoustrack', () => step(-1));
    navigator.mediaSession.setActionHandler('nexttrack', () => step(1));
  }

  // ---- 3D: the slab leans toward the cursor while you're near it
  if (!reducedMotion){
    el.addEventListener('pointermove', e => {
      const r = slab.getBoundingClientRect();
      el.style.setProperty('--ry', `${((e.clientX - r.left) / r.width - .5) * 4}deg`);
      el.style.setProperty('--rx', `${(.5 - (e.clientY - r.top) / r.height) * 6 + 8}deg`);
    });
    el.addEventListener('pointerleave', () => { el.style.removeProperty('--ry'); el.style.removeProperty('--rx'); });
  }

  // ---- analysis + the 3D bar visualizer
  const viz = $<HTMLCanvasElement>('.deck-viz'), g = viz.getContext('2d')!;
  const N = music.bands.length, show = new Float32Array(N);
  let avgBass = 0, lastBeat = 0;
  const frame = (tm: number) => {
    requestAnimationFrame(frame);
    if (document.hidden) return;
    // analyse
    if (an && bins && !audio.paused){
      an.getByteFrequencyData(bins);
      // log-spaced bands from ~40 Hz up
      for (let i = 0; i < N; i++){
        const a = Math.floor(Math.pow(i / N, 1.9) * bins.length * .7) + 1, b = Math.max(a + 1, Math.floor(Math.pow((i + 1) / N, 1.9) * bins.length * .7) + 1);
        let s = 0; for (let k = a; k < b; k++) s += bins[k]; music.bands[i] = s / (b - a) / 255;
      }
      const avg = (a: number, b: number) => { let s = 0; for (let i = a; i < b; i++) s += music.bands[i]; return s / (b - a); };
      music.bass = avg(0, 6); music.mid = avg(6, 26); music.high = avg(26, N); music.level = avg(0, N);
      // a beat: bass jumping well over its recent average
      avgBass += (music.bass - avgBass) * .05;
      if (music.bass > avgBass * 1.25 && music.bass > .45 && tm - lastBeat > 280){ lastBeat = tm; music.beat = 1; }
    } else { music.bands.fill(0); music.bass = music.mid = music.high = music.level = 0; }
    music.beat *= .9;
    // draw: isometric prisms, so the bars stand up off the slab
    const dpr = Math.min(2, devicePixelRatio), W = viz.clientWidth, H = viz.clientHeight;
    if (!W) return;
    if (viz.width !== W * dpr){ viz.width = W * dpr; viz.height = H * dpr; }
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    const cs = getComputedStyle(el), lime = cs.getPropertyValue('--lime').trim() || '#c6ff3d';
    const n = 16, bw = (W - 14) / n, dx = 5, dy = 4;
    for (let i = 0; i < n; i++){
      const v = music.bands[Math.floor(i * N / n)] ?? 0;
      const idle = reducedMotion ? .06 : .05 + Math.sin(tm / 700 + i * .7) * .03;
      show[i] += ((music.playing ? v : idle) - show[i]) * .35;
      const h = 3 + show[i] * (H - dy - 6), x = i * bw, y = H - 2;
      g.globalAlpha = .35 + show[i] * .65;
      g.fillStyle = lime; g.fillRect(x, y - h, bw - dx - 1, h);                    // front
      g.globalAlpha *= .55; g.beginPath();                                            // side
      g.moveTo(x + bw - dx - 1, y); g.lineTo(x + bw - 1, y - dy); g.lineTo(x + bw - 1, y - h - dy); g.lineTo(x + bw - dx - 1, y - h); g.fill();
      g.globalAlpha = Math.min(1, g.globalAlpha * 2.4); g.fillStyle = '#ffffff'; g.beginPath();   // top
      g.moveTo(x, y - h); g.lineTo(x + dx, y - h - dy); g.lineTo(x + bw - 1, y - h - dy); g.lineTo(x + bw - dx - 1, y - h); g.fill();
    }
    g.globalAlpha = 1;
    el.style.setProperty('--beat', music.beat.toFixed(3));
  };
  requestAnimationFrame(frame);
}

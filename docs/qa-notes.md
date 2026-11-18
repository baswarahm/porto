# QA notes: one-page 3D build

Checked in the browser on 1440×900 desktop, 375×812 phone, NIGHT and DAY. Build: 0 errors, 0 warnings. Console: no errors. No sideways scroll on phone.

## Concept and palette
- One page, nine sections, in this order: dossier (profile) → breach → progress → now → goals → projects → journey → contact → root.
- One WebGL world sits fixed behind the whole page. The camera flies to each section's own 3D object as you reach it.
- Palette: acid lime on graphite (night) and on paper (day). Red is used only for "denied / locked". The old lilac/green/red mix is gone.

## Everything that moves in 3D

| Where | What | Status |
|---|---|---|
| Background | 3,200 drifting particles (1,400 on phones) + a grid floor fading into fog | ok |
| Dossier (profile) | **Me as a black silhouette** (like the old opening) on a projector pad, with a glowing lime outline, scanlines, a moving light band and glitches (stronger when the cursor is near); turns with the mouse | ok |
| Dossier | **My stack in 3D:** 19 skill logos orbit the silhouette on a tilted ring, passing behind and in front of me; hovering one enlarges it and shows its name | ok |
| Dossier | Hex firewall behind me; cells push toward the cursor and light lime | ok |
| Dossier | Window drops in, rotating in 3D. The photo is shown **whole, never cropped** (its own 3:4 shape) as a large portrait with viewfinder corners and a scanning line; it leans toward the cursor and turns from grey to colour on hover | ok |
| Breach | Scrolling shatters the firewall (cells spin past the camera); the hologram dissolves with a glowing edge | ok |
| Network | A glowing lime crystal at the core (no photo) in a wire shell and two rings, 6 hosts, 140 nodes, 240 packets; host labels follow in 3D | ok |
| Progress | 8 semester pillars around the host (lime = done or current fill, wire = future) | ok |
| Now | One satellite per course on its own tilted orbit, in the course's lane colour | ok |
| Goals | Three target rings spinning on different axes, one dot per goal | ok |
| Projects | Red wire cube in a cube, counter-rotating and flickering, "403" | ok |
| Journey | Wire globe with a lime arc from **Solo to Penang** and a packet flying it | ok |
| Contact | Beacon sending out rings that always face the camera | ok |
| Root | Camera pulls back and orbits the whole network; picker to every section | ok |
| Camera | Holds on the section you're reading, flies to the next as it scrolls up; leans with the mouse; scene shifts to the side opposite the text | ok |
| Progress panel | Course map tiles flip down column by column like a departures board; hovering a tile lifts it toward you. Semesters flip over one by one; the stats rise out of the panel | ok |
| Now panel | Course cards are dealt in from depth, and **flip over** (click or Enter) to show what I learned, what I'm doing and where I'm stuck | ok |
| Goals panel | Each goal drops onto its stack in turn; an open goal lights lime | ok |
| Journey panel | Entries swing in from their side (experience from the left, education from the right); the dots pulse | ok |
| Projects panel | Trying the locked card shakes it and stamps ACCESS DENIED | ok |
| Contact panel | LinkedIn and Instagram are 3D keys that tip toward you on hover | ok |
| Progress form | A segmented **ring gauge** (one arc per semester, current arc filling in lime) floats in 3D beside a **3D staircase** of semesters you climb; the current step glows, hovering or picking a step lifts it. The course map is a tilted board that straightens when you reach for it; it shows **only this semester** by default, with a small "+ other semesters (7)" key to open the full plan (picking another semester or searching opens it too) | ok |
| Now form | Course cards fanned like a hand of cards; they straighten on hover and still flip | ok |
| Goals form | Each goal is a stacked card with its own **progress ring** that fills on arrival | ok |
| Journey form | An open file: the two columns angle toward a glowing lime spine and lie flat on hover | ok |
| Projects form | A 3D **vault door** with a spinning dial, bolts and a blinking red light; trying it jiggles the dial and the card stamps ACCESS DENIED | ok |
| Contact form | My email on a **turning 3D cylinder** of letters above the contact card | ok |
| All headings | Letters flip up out of the page one by one (3D rotateX), and ripple in a 3D wave on hover | ok |
| All blocks | Tip up in 3D as they scroll in (scroll-driven, runs on the compositor) | ok |
| Cards (courses, goals, timeline, semesters, picker, dossier, scan) | Lean toward the cursor in 3D with a lime spotlight under it | ok |
| Keys (buttons) | Press down like keycaps; a lime fill sweeps across on hover | ok |
| Nav | Pill nav marks the section you're in while you scroll | ok |
| Cursor | **Target-lock reticle** replaces the pointer (mouse/trackpad only): lime brackets with live screen coordinates; over anything clickable the brackets snap out to frame it and read LOCK; a click flashes it. The normal caret returns in text fields | ok |
| Radar | **Top-down radar** bottom-left: sweeping beam, every host as a blip turned to the camera's heading, the current one pinging lime, projects red. Sits under the panels so it never covers content; desktop only | ok |
| Firewall | **Break it by hand:** clicking (or tapping) the wall shatters the struck cell and its neighbours in a ripple; a live counter shows cells breached, and after 160 it says the firewall is failing | ok |

## Round 3: cleanup, accessibility, share card
- Removed from the bundle: the opening slides, the old entrance effects, the parked projects/showcase styles and script, the old name-splitting feature, and every style rule no element uses (found by measuring the built page). About 29 KB less CSS; main script 36 KB → 29 KB.
- Headings in 3D letters now carry a hidden plain-text copy for screen readers.
- Muted text colours raised to pass 4.5:1 contrast in day and night.
- One clear lime focus ring on every link, button and card for keyboard users.
- Reduced motion: the 3D world's decorative spin and drift stand still; scrolling still moves the camera.
- Share card: `public/images/og.png` (1200×630, silhouette + name, lime on graphite), with large-image preview tags for WhatsApp, LinkedIn and X.

## Fixed during the check
- The camera lagged a whole section behind on slow machines: easing is now time-based.
- The projects cube was half behind its panel: the scene shift was raised from 20% to 25%.
- Host labels covered the root picker: they now show only on the network view.
- The email broke mid-word on Contact: the panel is wider and the type smaller.
- On phones the panels hid the 3D world: each section now opens on its object, and the panel scrolls up over it. The camera steps back on tall screens so objects fit.

## Navigation
- The nav, menu, vim `:progress` and the `j/k` keys all go to sections on the one page.
- The old URLs (`/progress`, `/now`, `/goals`, `/projects`, `/journey`, `/contact`) redirect to their anchors.

## Known limits
- three.js is 136 KB gzipped, loaded after the page's text.
- The scroll-driven 3D rise needs a browser with scroll timelines (Chrome, Edge, newer Safari). In others the blocks simply appear; nothing breaks.
- Reduced-motion visitors get still versions: no glitch, no tilt, no rise, and the letters show at once.

## Round 4: real content
- Courses come from the official course planners (semester I, 2026/2027): CCA101, CKC111, CCA102 are at **week 8, the mid-semester break** (16–22 Nov 2026). Each card lists the topics covered in weeks 1–7, what's happening now, and what comes after the break.
- The commit log is rebuilt from the same planners: each topic and test in order, per course (e.g. CCA102 test 1 on 12 Nov, CCA101 timed assessment on 11 Nov).
- Goals are the real ones: be happy and chill; get through semester 1 calmly (tests and assignments ticked as they've happened); semester 2 next; starting the degree done.
- Nothing was made up: no "stuck on" lines until there's a real one to write.

## Round 5: the crazy ones
| Feature | What it does | Status |
|---|---|---|
| Particle swarm | 12,000 particles (4,500 on phones) form a glowing aura of my silhouette, then explode and re-form into each section's object as you scroll: a galaxy over the network, semester pillars, course orbits, goal rings, the locked cube, a shell round the globe, beacon rings, a star sphere at root | ok |
| Warp speed | Fast camera moves (nav clicks, terminal jumps, quick scrolling) bring rushing lime rings, stretched speed lines, a wider field of view and a flash on arrival | ok |
| Terminal takeover | `~` or the `>_` key opens a 3D CRT terminal (folds up, scanlines, glow). Commands: help, whoami, ls, cat (progress.log, courses.db, goals.txt, journey.git, contact.vcf), open/cd (flies there), date, theme, matrix, breach, sudo su, exit, clear. ↑/↓ history, Tab completes | ok |
| Root mode | Konami code (↑↑↓↓←→←→ B A) or `sudo su`: everything turns red alert, alarm light sweeps, the firewall rebuilds, the silhouette glitches hard, 3 hidden nodes appear with messages. Esc or `exit` stands down | ok |

## Round 6: innovations
| Feature | What it does | Status |
|---|---|---|
| Degree rings | Under the network: one ring per semester, every course on the real study plan is a node. Finished semesters glow solid, the current ring fills as an arc with the semester, future rings are ghosts. Hover a node for the course name. It fills by itself as the date moves on | ok |
| Live Penang weather | Real weather from Open-Meteo (free, no key, cached 15 min): the HUD shows it ("PNG 22:39 · 25° drizzle"), rain falls through the 3D world when it's wet in Penang, thunderstorms flash, and the key light follows Penang's time of day (dawn, day, dusk, night). Falls back to time only if offline | ok |

Note: the weather is fetched by each visitor's browser from api.open-meteo.com (Penang's coordinates only; nothing about the visitor is sent beyond the normal request).

- The algorithm lab was tried and then removed at Baswara's request (degree rings and live weather stay).

## Round 7: journey as a git graph + mentor's list (not pushed, waiting for review)
| Item | What it does | Status |
|---|---|---|
| Journey git graph | Experience & education as `git log --graph --reverse`: main = SMP → SMA → USM; council, acp and research branches fork off and merge into the degree (HEAD -> main). A HEAD marker rides main as you scroll and lights each commit; hovering a commit lights its whole branch; tap for details. The 3D world shows the same graph as a rail with branches in 3D, HEAD riding it and the camera following | ok |
| Bloom + CRT | `fx.ts`: UnrealBloom (night only), then chromatic aberration, faint scanlines, grain and a vignette. Glitch tears on firewall hits, breach, root mode, x-ray | ok |
| Camera | Slow handheld drift while idle; drag empty space (mouse) to look around, it springs back; on arrival the host and its 3D object pulse, a scan line sweeps the panel and the note types itself out (first time) | ok |
| Living network | nmap scan sphere lights hosts as it passes; clicking my name (or `breach`) blows the network apart and the swarm bursts, then both re-form; this semester's ring fills up whenever the degree is in view | ok |
| Interactivity | Hover a host: it glows and an nmap-style card shows (IP, port, open/filtered); click it to fly there. Terminal: `nmap` (terminal goes see-through to watch the scan), `breach`, `tour`. `x` x-ray now also turns the 3D world to wireframe | ok |
| Quality / motion | `fx` key in the HUD (in the menu on phones): quality high/low (low = no bloom/CRT, pixel ratio 1, 40% particles; defaults to low on ≤4-core machines) and motion full/reduced (overrides the OS setting), saved per browser | ok |
| Onboarding | 4 skippable cards on the first visit (scroll, look, keys, map); Esc / skip / arrows; `tour` replays | ok |
| Mini-map | Rail of all 9 sections on the right (a pill of dots at the bottom on phones), current one lit, click to jump | ok |
| Boot | Short terminal boot while three.js loads, once per visit, any key skips, gone as soon as the world is ready (max 3s) | ok |
| Panels | Glass blur behind every panel, lime glow when focus is inside | ok |
| Phone HUD | The weather part of the clock hides under 480px so the menu button fits | ok |

Not done on purpose: glTF models (mentor said "later"); the existing nav + menu already cover the "traditional menu" point.

## Round 8: teacher's checklist (committed locally, not pushed)
| Priority | Item | What it does now | Status |
|---|---|---|---|
| High | Arrival + idle | Arriving at a section: its object pulses bigger, a ring shockwave rushes out from the host, the host flashes, the panel gets a scan sweep. Idle: every section object and every host floats, host shapes turn slowly | ok |
| High | Data flow | Glowing data streams on arcs from me to every host (half flowing out, half coming back) and around the ring of hosts; the stream to the section you're on (or hover) runs fast and bright | ok |
| High | Animated rings | The degree rings draw themselves in one semester after another when the degree is in view; this semester's arc fills last with a bead riding its end. The semester pillars grow up from the floor on arrival | ok |
| High | Auto low on phones | Phones / touch screens / ≤4-core machines start on low; the fx panel says so and can switch | ok |
| High | Light mode | Soft bloom in day (high threshold so the paper never glows), hosts and streams in dark ink and green, fog pushed back | ok |
| Medium | Quality feedback | Switching quality: a scan sweep crosses the screen plus a toast saying what turned on/off; the fx panel shows a live fps meter | ok |
| Medium | Raycast hovers | Hosts (nmap card), semester pillars (year, semester, state), journey commits in 3D (hash, title, date), relay nodes, course nodes | ok |
| Medium | Projects placeholder | Vault + "coming soon" card + three locked, shimmering slots ("encrypted · 403"); no invented project names | ok |
| Medium | Readability | Panels more opaque; fx panel option panels: glass / solid | ok |
| Medium | Reduced motion | Camera cuts between sections instead of flying; swarm, dust, packets and data streams hidden; no shatter, glitch or shockwave | ok |
| Later | Host models | Each host now has its own shape (pillar, knot, ring, cube, tetrahedron, antenna) instead of identical balls; real glTF models can replace them later | ok |
| Later | Commands | `ping <host>` sends a data burst + shockwave to that host with ping replies; `breach` adds a red sweep with a stamp | ok |
| Already there | x-ray wireframe, mini-map, boot, nmap | from round 7 | ok |

## Round 9: the big ones (committed locally, not pushed)
| Feature | What it does | Status |
|---|---|---|
| GPU particle fluid | `fluid.ts`: the swarm now lives on the GPU (GPGPU ping-pong textures): 200,704 particles on desktop, 65,536 on phones (35% drawn on low quality). Springs pull them to each section's shape, curl-noise currents take over while you scroll between sections so one shape melts into the next, the cursor pushes a hole through them. At the top they form a halo around the silhouette, never inside it | ok |
| Black silhouette kept | Beam and particles now draw before the hologram, and its outline stays under the bloom threshold, so the body is black again with a glowing halo | ok |
| Raymarched core | The network's core is a raymarched liquid-metal blob: four metaballs melting together, fake studio reflections, lime fresnel rim; morphs harder when hovered or when you reach a new section. Hover it: "baswara · me" (true refraction of the scene behind is not done) | ok |
| Portal dives | High quality: between two sections the next one opens as a portal where its host sits on screen (rendered from its own camera), with a glowing rim and a lens bend, growing until you're through. Low quality keeps the glide; reduced motion cuts | ok |
| Physics firewall | Rapier (WASM, loaded in the background on desktop + high quality, ~1.6 MB gzipped): punched cells burst out toward you, tumble, collide and pile up on a glowing debris floor under the hologram; moving the cursor through the pile shoves it; root mode rebuilds the wall | ok |
| Real Penang sky | `sky.ts`: sun and moon at their real positions over Penang (low-precision astronomy, checked: 23:50 → sun −68°, first-quarter moon 52% lit setting in the west), sky colour by sun altitude with a warm dusk glow toward the sun, 1,600 stars turning with sidereal time, screen-space god rays when the sun is on screen. Terminal: `sky` | ok |
| Hologram titles | `titles.ts`: each section title rebuilt from points in 4 depth layers; flies together when you arrive, scanlines, glitch tears, bursts apart when you leave. HTML headings stay for reading and screen readers | ok |
| 3D skill tree | `tree.ts`: the full 8-semester curriculum as a tree; trunk with semester rings, every course a node on its track's branch (core / intelligent computing / project + industry), done glow, this semester pulses, the rest are locked wireframes; grows in, sap rises along lit branches; hover + click for code, name, credits, track, status. Open from the course map key or `tree`. The plan has no prerequisite data, so branches follow track + semester order | ok |
| GitHub code city | `city.ts`: live from the GitHub API (cached 1 h): one tower per public repo, height = commits, footprint = size, lit windows = pushed recently, roof beacon in the language colour, cars of light; camera swoops in; click a tower for details + a link. Open from the projects card or `city`. Verified: 6 repos, 106 commits | ok |
| Multiplayer ghosts | `ghosts.ts`: other visitors as glowing packets travelling the network with trails, orbiting the section they're reading, HUD "N online". Only a random per-tab id + section is shared. Works now between tabs of one browser; across visitors it needs a free Supabase project's URL + anon key in `src/data/realtime.ts` | needs keys |

Performance in the preview (this machine): 60 fps on the network, ~40 fps during a portal dive and on the firewall, 144 fps on the phone preset (low quality).

## Round 10: the network comes alive (committed locally, not pushed)
| Feature | What it does | Status |
|---|---|---|
| Host idle | Every host idles in its own way: the progress pillar breathes like it's charging, the courses knot tumbles, the goals ring spins like a coin on its edge, the journey tetrahedron ticks round one face at a time, the contact antenna sways, the padlock turns warily. Each host has a small satellite circling it and a slow glow pulse | ok |
| Host arrival | When the camera settles on a host: it pops on a bouncy spring, spins one extra turn, its wire shell bursts out and settles, white lock-on brackets close in from wide and rotate square (they stay on the host you're at, faintly on hover), a column of light shoots through it, and sparks fly off | ok |
| Data flow | Stream packets are soft glowing points with tails instead of squares; requests go out in the signal colour, replies come back in a cooler tint, packets bunch into bursts like real traffic; the stream to your host runs hot. On every arrival a train of packets arcs from the host you left to the one you reached | ok |
| Progress rings (page) | Degree gauge: the percentage counts up as the rings fill, a glint of light runs along every filled semester, a radar sweep circles the outside, semester ticks light up, a bead pulses at the end of this semester's fill; pointing at a semester lights its segment | ok |
| Progress rings (3D) | The degree rings under the network: a sonar wave rolls from the first semester to the last and swells each course it passes, this semester's bead drags a comet tail, and pointing at a semester on the page lights its ring in 3D | ok |
| Locked projects host | The host itself is now a padlock. Around it: a red hex force field with a scan line, a rotating text band ("locked · coming soon · access denied · 443/tcp filtered"), and a tilted debris belt of particles instead of the solid cube. Arriving, clicking the host, or hovering the vault card triggers a denial: the shackle lifts and slams shut, the padlock shakes, a ripple runs across the field from your side, the cages jolt | ok |
| Skill tree interaction | Hover a course: its whole path down to the trunk lights up and sap runs along it while the rest dims. Click: the camera flies to it, a halo locks on, the card shows the path (clickable) and buttons for earlier / later on the track and the next course that semester. Arrow keys walk the tree, Enter opens, Esc steps back then closes. The legend filters by track; semester labels (Y1 · S1 ...) sit beside the trunk; click empty space to fly back out | ok |

Fixed while testing: Enter after the arrow keys used to hit the focused close key and shut the tree; the long hint overlapped the legend.
Performance in the preview: ~71 fps on the goals host at desktop width. Reduced motion: no arrival spring, brackets, column, sparks or handoff; the gauge glint, sweep and count-up are off.

## Round 11: music, sea, time, drone, photo, melt, banner, game (committed locally, not pushed)
| Feature | What it does | Status |
|---|---|---|
| Now-playing bar | `music.ts`: "Hannah Montana" by Rex Orange County from `public/music/` (the mp3 and cover supplied by me). A black slab docked to the bottom like a real player: cover lifted off the slab with the record sliding out and spinning while it plays, title + artist, like (+), shuffle, back, play/pause (a physical button that presses down), next, repeat, seek bar, mute + volume, and 3D bars driven by the real audio (Web Audio analyser). The slab leans toward the cursor. Plays only when pressed. OS media keys / lock screen show the song and cover. Phones: a compact bar | ok |
| Music in the 3D world | The same analysis drives the world: an equalizer ring stands up around the hologram's pad and the core, the pad thumps on each beat, the core swells with the bass, every host bumps on the beat | ok |
| Ocean | `ocean.ts`: Gerstner waves on the GPU under the network; the water reflects the same sky the dome draws (shared uniforms), real sun and moon glints, small ripples, crest foam, the network's glow shimmering under it; wave height follows the live wind | ok |
| Clouds | A cloud deck of drifting fbm noise high above the network; cover = Penang's live cloud cover, drift = live wind speed and direction (Open-Meteo, now also fetching wind) | ok |
| Time machine | `timemachine.ts`: a rail from 2020 to graduation with my journey and degree dates marked. Any day re-computes degree progress (gauge, stairs, bar), the 3D degree rings and semester pillars, HEAD on the journey rail, and the real sun / moon / stars for that date; shows the monsoon season; "play the years" runs a year every 2.5 s; the world takes a film tint while away from today. fx panel → modes, or `time` | ok |
| Drone | `drone.ts`: WASD + mouse look (pointer lock), space / C, shift boost; phones: joystick + look drag + climb / sink buttons. Banks into turns, warp kicks in with speed, bounces off hosts and the sea, flying slowly into a host docks you on that section. `fly` | ok |
| Photo mode | `photo.ts`: freezes time, orbit / zoom / pan, click to focus, real depth of field (BokehPass), grades noir / film / neon, thirds grid, H hides the panel, S saves a 2x PNG poster with a small caption (verified: 1420x1260, real content). `photo` | ok |
| Panels melt | `melt.ts`: scrolling away, a panel breaks into particles sampled from its own text lines (in their colours) and outline and streams into its host; arriving, particles stream out of the host and assemble the next panel, which then fades in | ok |
| Cloth banner | `banner.ts`: a Verlet cloth with my name flies over the network like a flag planted after the breach, in Penang's live wind with gusts; click to tear it, over-stretched threads snap on their own, it stitches itself back after a while. (In the hero there was only a ~190 px gap beside the black silhouette, so it lives over the network where it reads) | ok |
| Defend the firewall | `defend.ts`: an original mini-game: malware packets (worms, fast pings, 3-hit trojans) attack the core in waves; click to shoot; the six hosts are turrets; integrity bar, waves heal a little, best score kept in this browser. `defend` | ok |

Also: terminal `time`, `fly`, `photo`, `defend`, `play`; fx panel has a "modes" row.
Performance in the preview: ~52 fps on the network view with the ocean, clouds, banner and everything else running.
Note: the song file is a commercial recording; publishing it on the public site is a copyright question for me to decide before pushing.

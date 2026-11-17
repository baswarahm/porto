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

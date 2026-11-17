# 3D redesign: research, scenarios, decision

## What the research showed

- **Room tours and solar systems are everywhere.** Most "3D portfolios" are a Three.js room built in Blender, a planet system, or a drive-around island. They look alike, they are heavy (models, textures, a 3D engine), and on phones they usually become a loading screen.
- **Story beats spectacle.** The portfolios people remember tie the 3D to the owner's own story (a personal object, a journey) instead of a generic scene.
- **2026 trends:** real spatial depth instead of flat parallax, kinetic typography that reacts to scroll and hover, and scroll-driven storytelling. Every source adds the same warning: it has to stay fast.
- **The fast way to do 3D on the web** is CSS transforms (`perspective`, `preserve-3d`) plus scroll-driven motion. It runs on the GPU compositor, needs no library and works on phones. Three.js is only worth it for real models.

Sources: [Awwwards portfolio listings](https://www.awwwards.com/websites/website_category_portfolio/?page=5), [Codrops: 3D scroll-driven text with CSS](https://tympanus.net/codrops/2025/11/04/creating-3d-scroll-driven-text-animations-with-css-and-gsap/), [Addy Osmani: Cover Flow with modern CSS](https://addyosmani.com/blog/coverflow/), [Chrome: scrollytelling guide](https://developer.chrome.com/docs/modern-web-guidance/guides/ui-behaviors/scrollytelling), [Codrops: cinematic cyberpunk portfolio](https://tympanus.net/codrops/2026/04/14/they-call-me-giulio-the-making-of-a-cinematic-cyberpunk-portfolio/), [Three.js forum: immersive scroll portfolio](https://discourse.threejs.org/t/interactive-3d-portfolio-an-immersive-scroll-experience/44520), [Line25: web design trends 2026](https://line25.com/articles/web-design-trends-2026/).

## Three scenarios

**A. "My room".** A 3D model of a student desk/room; you click objects (laptop = projects, books = courses).
Familiar, needs Blender models and Three.js (300 KB+), slow on phones, and the most copied idea out there.

**B. "One long flight".** The whole site is one tunnel; scrolling flies the camera through every section in order.
Feels cinematic, but dense content (commit log, 48-course map, goal steps) is unreadable while flying, and you already said the "My story" flight wasn't it.

**C. "Things I carry".** Every section is one physical object you can pick up and turn, sitting on its page:
- Home: you, standing in the scene with your skills orbiting you (already built).
- Progress: the degree as a **tower** of 8 glass floors, one per semester, lit up as you finish them.
- Now: this semester's courses as a **hand of cards** fanned out in 3D.
- Goals: a **goal cube** you can spin: doing / next / done on its faces.
- Journey: your timeline wound around a **helix** that turns as you scroll.
- Contact: a **business card** you flip over to get the links.
- Projects: a sealed **crate** marked "coming soon".

The full readable content stays underneath each object, and the pages are joined by the 3D page turn and the floating menu.

| | A. Room | B. Flight | C. Things I carry |
|---|---|---|---|
| Feels unique | low (very common) | medium | **high** |
| Tells your story | medium | high | **high** (each object is a real fact about you) |
| Speed | low (3D engine + models) | medium | **high** (CSS 3D, no library) |
| Phone | poor | ok | **good** (drag/tilt objects, plain content below) |
| Content stays readable | ok | poor | **good** |
| Risk to finish well | high | medium | **low** |

**Decision: C.** It is the most "you" (a CS student keeping notes of his degree, courses and goals), it is not the room or planet idea everyone else uses, and it stays fast on phones.

## Shared rules

- Dark purple and black, USM purple glow, outlined numbers, mono labels.
- No top navbar: one floating menu button opens a full-screen 3D menu. The status line is hidden on phones.
- Every object can be dragged to turn (mouse or finger), leans toward the cursor, and rests with a slow sway.
- Pages change with a 3D page turn (built into the browser, no script).
- Only `transform` and `opacity` animate. Things off screen stop. Reduced motion gets still versions.

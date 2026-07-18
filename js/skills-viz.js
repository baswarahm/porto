/* ==========================================================================
   SKILLS-VIZ.JS — radar chart + tech constellation views for the Skills
   section. Reads the SAME data already in the DOM (.skill-item[data-pct])
   so the bars, radar, and constellation views can never drift out of sync
   with each other — one source of truth, three presentations.
   ========================================================================== */
import { reducedMotion } from './main.js';

const CAT_COLOR = {
  Languages: 'var(--violet)',
  Tools: 'var(--teal)',
  Design: 'var(--gold)',
};
const CAT_RGB = {
  Languages: 'var(--violet-rgb)',
  Tools: 'var(--teal-rgb)',
  Design: 'var(--gold-rgb)',
};

function readSkillData(){
  const cards = Array.from(document.querySelectorAll('#skillsBarsView .skill-card'));
  const out = [];
  cards.forEach(card => {
    const cat = card.dataset.cat || 'Other';
    card.querySelectorAll('.skill-item').forEach(item => {
      out.push({
        cat,
        name: item.querySelector('.skill-name')?.textContent.trim() || '?',
        pct: +item.dataset.pct || 0,
        status: item.querySelector('.skill-status')?.textContent.trim() || '',
      });
    });
  });
  return out;
}

/* ---- RADAR CHART ---------------------------------------------------------
   One SVG polygon per category, plotted on shared axes (all skills as
   axes, sorted by category so each category's points sit contiguously). */
function buildRadar(container, detailEl, data){
  const size = 340, cx = size/2, cy = size/2, maxR = size/2 - 46;
  const n = data.length;
  if(!n) return;
  const angle = (i) => (Math.PI * 2 * i / n) - Math.PI/2;
  const pt = (i, r) => [cx + r * Math.cos(angle(i)), cy + r * Math.sin(angle(i))];

  const rings = [0.25, 0.5, 0.75, 1].map(f => {
    const points = data.map((_, i) => pt(i, maxR * f).join(',')).join(' ');
    return `<polygon points="${points}" class="radar-ring" />`;
  }).join('');

  const axes = data.map((_, i) => {
    const [x,y] = pt(i, maxR);
    return `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" class="radar-axis" />`;
  }).join('');

  const labels = data.map((d, i) => {
    const [x,y] = pt(i, maxR + 22);
    return `<text x="${x}" y="${y}" class="radar-label" text-anchor="middle" dominant-baseline="middle">${d.name}</text>`;
  }).join('');

  const dataPoints = data.map((d, i) => pt(i, maxR * (d.pct/100)));
  const dataPolygon = dataPoints.map(p => p.join(',')).join(' ');

  const dots = data.map((d, i) => {
    const [x,y] = dataPoints[i];
    return `<circle cx="${x}" cy="${y}" r="5" class="radar-dot" data-i="${i}" style="--dot-color:${CAT_COLOR[d.cat]||'var(--accent)'}" />`;
  }).join('');

  container.innerHTML = `
    <svg viewBox="0 0 ${size} ${size}" class="radar-svg" role="img" aria-label="Skill radar chart">
      ${rings}${axes}
      <polygon points="${dataPolygon}" class="radar-fill" />
      ${dots}
      ${labels}
    </svg>`;

  const svg = container.querySelector('svg');
  svg.querySelectorAll('.radar-dot').forEach(dot => {
    const d = data[+dot.dataset.i];
    const show = () => {
      detailEl.innerHTML = `
        <p class="skills-radar-detail-name">${d.name}</p>
        <p class="skills-radar-detail-meta mono">${d.cat} · <span class="skill-status ${d.status.toLowerCase()}">${d.status}</span></p>
        <div class="skill-bar-track"><div class="skill-bar-fill" style="width:${d.pct}%"></div></div>
        <span class="skill-pct mono">${d.pct}%</span>`;
    };
    dot.addEventListener('mouseenter', show);
    dot.addEventListener('focus', show);
    dot.addEventListener('click', show);
    dot.setAttribute('tabindex', '0');
  });

  if(!reducedMotion) svg.classList.add('is-animated');
}

/* ---- CONSTELLATION ---------------------------------------------------------
   Category "hub" nodes with skill nodes orbiting them, connected by lines.
   Node size + glow intensity scale with proficiency %. */
function buildConstellation(container, data){
  const size = 460;
  const cats = [...new Set(data.map(d => d.cat))];
  const hubR = 130;
  const cx = size/2, cy = size/2;

  let svgInner = '';
  cats.forEach((cat, ci) => {
    const hubAngle = (Math.PI * 2 * ci / cats.length) - Math.PI/2;
    const hx = cx + hubR * Math.cos(hubAngle) * 0.55;
    const hy = cy + hubR * Math.sin(hubAngle) * 0.55;
    const skills = data.filter(d => d.cat === cat);
    const orbitR = 78;

    svgInner += `<circle cx="${hx}" cy="${hy}" r="7" class="const-hub" style="--hub-color:${CAT_COLOR[cat]}" />`;
    svgInner += `<text x="${hx}" y="${hy - 16}" class="const-hub-label" text-anchor="middle">${cat}</text>`;

    skills.forEach((d, si) => {
      const a = (Math.PI * 2 * si / skills.length) - Math.PI/2;
      const nx = hx + orbitR * Math.cos(a);
      const ny = hy + orbitR * Math.sin(a);
      const r = 5 + (d.pct/100) * 9;
      svgInner += `<line x1="${hx}" y1="${hy}" x2="${nx}" y2="${ny}" class="const-line" style="--line-color:${CAT_RGB[cat]}" />`;
      svgInner += `<g class="const-node" tabindex="0" data-name="${d.name}" data-pct="${d.pct}" data-status="${d.status}" data-cat="${cat}">
          <circle cx="${nx}" cy="${ny}" r="${r+6}" class="const-node-glow" style="--node-color:${CAT_RGB[cat]}" />
          <circle cx="${nx}" cy="${ny}" r="${r}" class="const-node-core" style="--node-color:${CAT_COLOR[cat]}" />
          <text x="${nx}" y="${ny + r + 14}" class="const-node-label" text-anchor="middle">${d.name}</text>
        </g>`;
    });
  });

  container.innerHTML = `
    <svg viewBox="0 0 ${size} ${size}" class="const-svg" role="img" aria-label="Technology constellation">${svgInner}</svg>
    <div class="const-tooltip" id="constTooltip" hidden></div>`;

  const tooltip = container.querySelector('#constTooltip');
  container.querySelectorAll('.const-node').forEach(node => {
    const show = (e) => {
      const { name, pct, status, cat } = node.dataset;
      tooltip.innerHTML = `<b>${name}</b><br><span class="mono">${cat} · ${status} · ${pct}%</span>`;
      tooltip.hidden = false;
      node.classList.add('is-active');
    };
    const hide = () => { tooltip.hidden = true; node.classList.remove('is-active'); };
    node.addEventListener('mouseenter', show);
    node.addEventListener('focus', show);
    node.addEventListener('mouseleave', hide);
    node.addEventListener('blur', hide);
  });
}

/* ---- filtering + view switching ------------------------------------------ */
function applyFilter(cat){
  document.querySelectorAll('#skillsBarsView .skill-card').forEach(card => {
    card.style.display = (cat === 'all' || card.dataset.cat === cat) ? '' : 'none';
  });
  document.querySelectorAll('.const-node').forEach(node => {
    const match = cat === 'all' || node.dataset.cat === cat;
    node.style.opacity = match ? '1' : '.15';
  });
}

export function initSkillsViz(){
  const barsView = document.getElementById('skillsBarsView');
  const radarView = document.getElementById('skillsRadarView');
  const constView = document.getElementById('skillsConstellationView');
  const radarChart = document.getElementById('skillsRadarChart');
  const radarDetail = document.getElementById('skillsRadarDetail');
  const constChart = document.getElementById('skillsConstellation');
  const viewBtns = document.querySelectorAll('.skills-view-btn');
  const filterChips = document.querySelectorAll('.skills-filter-chip');
  if(!barsView || !radarView || !constView) return;

  const data = readSkillData();
  let built = { radar:false, const:false };

  function showView(view){
    barsView.hidden = view !== 'bars';
    radarView.hidden = view !== 'radar';
    constView.hidden = view !== 'constellation';
    viewBtns.forEach(b => {
      const active = b.dataset.view === view;
      b.classList.toggle('is-active', active);
      b.setAttribute('aria-selected', String(active));
    });
    if(view === 'radar' && !built.radar){ buildRadar(radarChart, radarDetail, data); built.radar = true; }
    if(view === 'constellation' && !built.const){ buildConstellation(constChart, data); built.const = true; }
  }

  viewBtns.forEach(btn => btn.addEventListener('click', () => showView(btn.dataset.view)));

  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => c.classList.remove('is-active'));
      chip.classList.add('is-active');
      applyFilter(chip.dataset.cat);
    });
  });

  showView('bars');
}

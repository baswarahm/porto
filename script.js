/* ═══════════════════════════════════════
   BASWARA HAFIZH MUTTAQIN — PORTFOLIO JS
   ═══════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', function () {

  /* ══ SCROLL PROGRESS ══ */
  var prog = document.getElementById('scroll-progress');
  function updateProgress() {
    if (!prog) return;
    var s = document.documentElement;
    prog.style.width = (s.scrollTop / (s.scrollHeight - s.clientHeight) * 100) + '%';
  }
  window.addEventListener('scroll', updateProgress, { passive: true });

  /* ══ CUSTOM CURSOR ══ */
  var dot  = document.getElementById('cur-dot');
  var ring = document.getElementById('cur-ring');

  if (dot && ring && window.matchMedia('(pointer:fine)').matches) {
    var mx = 0, my = 0, rx = 0, ry = 0;

    document.addEventListener('mousemove', function (e) {
      mx = e.clientX; my = e.clientY;
      dot.style.left = mx + 'px';
      dot.style.top  = my + 'px';
    });

    (function animRing() {
      rx += (mx - rx) * 0.13;
      ry += (my - ry) * 0.13;
      ring.style.left = rx + 'px';
      ring.style.top  = ry + 'px';
      requestAnimationFrame(animRing);
    })();

    var HOV_SELECTOR = 'a,button,.gal-item,.skill-card,.tag,.social-btn,.gal-btn,.btn,.nav-logo,.email-link';
    document.addEventListener('mouseover', function (e) {
      if (e.target.closest(HOV_SELECTOR)) document.body.classList.add('hov');
    });
    document.addEventListener('mouseout', function (e) {
      if (e.target.closest(HOV_SELECTOR)) document.body.classList.remove('hov');
    });
  }

  /* ══ PARTICLES ══ */
  var pw = document.getElementById('particles');
  if (pw) {
    var colors = [
      'var(--accent)', 'var(--accent)', 'var(--accent)',
      'var(--pink)',   'var(--pink)',
      'var(--purple)',
      'var(--green)',
      '#ffffff'
    ];
    for (var i = 0; i < 120; i++) {
      (function (i) {
        var p  = document.createElement('div');
        p.className = 'particle';
        var sz = Math.random() * 4.5 + 1;
        var c  = colors[Math.floor(Math.random() * colors.length)];
        var isSquare = Math.random() > 0.55;
        p.style.cssText = [
          'width:'              + sz + 'px',
          'height:'             + sz + 'px',
          'left:'               + (Math.random() * 100) + '%',
          'bottom:'             + (-Math.random() * 5)  + '%',
          'animation-duration:' + (Math.random() * 10 + 4) + 's',
          'animation-delay:'    + (Math.random() * 7)   + 's',
          'background:'         + c,
          'border-radius:'      + (isSquare ? '2px' : '50%'),
          'filter:blur('        + (Math.random() > 0.7 ? '1px' : '0') + ')'
        ].join(';');
        pw.appendChild(p);
      })(i);
    }
  }

  /* ══ TYPED TEXT ══ */
  var typedEl = document.getElementById('typed');
  if (typedEl) {
    var words = ['ngopi', 'ngoding', 'berolahraga', 'belajar', 'dan hal hal berguna lainnya'];
    var wi = 0, ci = 0, deleting = false;
    function tick() {
      var w = words[wi];
      typedEl.textContent = deleting ? w.slice(0, ci--) : w.slice(0, ci++);
      if (!deleting && ci > w.length)    { deleting = true; setTimeout(tick, 1400); return; }
      if (deleting  && ci < 0)           { deleting = false; wi = (wi + 1) % words.length; ci = 0; }
      setTimeout(tick, deleting ? 52 : 100);
    }
    tick();
  }

  /* ══ SCROLL REVEAL ══ */
  var revEls = document.querySelectorAll('.reveal');
  if (revEls.length && 'IntersectionObserver' in window) {
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.07 });
    revEls.forEach(function (el) { obs.observe(el); });
  } else {
    revEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* ══ GALLERY FILTER (legacy, untuk .gal-btn jika masih dipakai) ══ */
  var galBtns  = document.querySelectorAll('.gal-btn');
  var galItems = document.querySelectorAll('.gal-item');

  galBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      galBtns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      var f = btn.dataset.f;
      galItems.forEach(function (item) {
        var show = f === 'all' || item.dataset.cat === f;
        item.style.opacity       = show ? '1'    : '0.15';
        item.style.pointerEvents = show ? 'auto' : 'none';
        item.style.transform     = show ? ''     : 'scale(0.96)';
      });
    });
  });

  /* ══ LIGHTBOX ══ */
  var lb     = document.getElementById('lb');
  var lbImg  = document.getElementById('lb-img');
  var lbTit  = document.getElementById('lb-tit');
  var lbMeta = document.getElementById('lb-meta');
  var lbX    = document.getElementById('lb-x');
  var lbPrev = document.getElementById('lb-prev');
  var lbNext = document.getElementById('lb-next');

  if (lb && lbImg) {
    var vis = [], lbIdx = 0;

    function openLb(items, idx) {
      vis = items; lbIdx = idx; showLb(lbIdx);
      lb.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
    function closeLb() {
      lb.classList.remove('open');
      document.body.style.overflow = '';
    }
    function showLb(i) {
      var item = vis[i]; if (!item) return;
      var img  = item.querySelector('img');
      if (img) { lbImg.src = img.src; lbImg.style.display = 'block'; }
      else      { lbImg.style.display = 'none'; }
      if (lbTit)  lbTit.textContent  = item.dataset.title || '';
      if (lbMeta) lbMeta.textContent = item.dataset.meta  || '';
    }

    galItems.forEach(function (item, idx, arr) {
      item.addEventListener('click', function () {
        var visible = Array.from(arr).filter(function (el) { return el.style.opacity !== '0.15'; });
        var vi = visible.indexOf(item);
        openLb(visible.length ? visible : Array.from(arr), vi >= 0 ? vi : idx);
      });
    });

    if (lbX) lbX.addEventListener('click', closeLb);
    lb.addEventListener('click', function (e) { if (e.target === lb) closeLb(); });

    if (lbPrev) lbPrev.addEventListener('click', function (e) {
      e.stopPropagation();
      lbIdx = (lbIdx - 1 + vis.length) % vis.length; showLb(lbIdx);
    });
    if (lbNext) lbNext.addEventListener('click', function (e) {
      e.stopPropagation();
      lbIdx = (lbIdx + 1) % vis.length; showLb(lbIdx);
    });
    document.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape')     closeLb();
      if (e.key === 'ArrowLeft')  { lbIdx = (lbIdx - 1 + vis.length) % vis.length; showLb(lbIdx); }
      if (e.key === 'ArrowRight') { lbIdx = (lbIdx + 1) % vis.length; showLb(lbIdx); }
    });
  }

  /* ══ MOBILE NAV ══ */
  var burger = document.getElementById('burger');
  var drawer = document.getElementById('nav-drawer');
  if (burger && drawer) {
    burger.addEventListener('click', function () {
      burger.classList.toggle('open');
      drawer.classList.toggle('open');
    });
    drawer.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        burger.classList.remove('open');
        drawer.classList.remove('open');
      });
    });
  }

  /* ══ ACTIVE NAV ON SCROLL — FIX: Contact tidak aktif saat di Gallery ══
     
     Pendekatan baru: gunakan getBoundingClientRect() real-time agar lebih akurat
     dibanding offsetTop yang bisa berubah karena layout dinamis.
     
     Logika: section dianggap "aktif" jika bagian atasnya sudah melewati 40%
     tinggi viewport dari atas. Section paling bawah yang memenuhi syarat = aktif.
     
     Ini mencegah #contact aktif terlalu awal saat user masih di #gallery.
  ══ */
  var sections = document.querySelectorAll('section[id]');
  var navLinks = document.querySelectorAll('.nav-links a');

  function updateActiveNav() {
    /* Threshold: 40% dari tinggi viewport */
    var threshold = window.innerHeight * 0.40;
    var currentId = '';

    sections.forEach(function (section) {
      var rect = section.getBoundingClientRect();
      /* Section ini aktif jika top-nya sudah di atas threshold */
      if (rect.top <= threshold) {
        currentId = section.id;
      }
    });

    navLinks.forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('href') === '#' + currentId);
    });
  }

  window.addEventListener('scroll', updateActiveNav, { passive: true });
  /* Jalankan sekali saat load untuk state awal */
  updateActiveNav();

  /* ══ GALLERY TAB SWITCHER ══ */
  var tabs   = document.querySelectorAll('.gal-tab');
  var panels = document.querySelectorAll('.gal-panel');

  function switchTab(tabEl) {
    var target = tabEl.dataset.tab;

    tabs.forEach(function (t) { t.classList.remove('active'); });
    tabEl.classList.add('active');

    panels.forEach(function (p) {
      p.classList.remove('visible');
      if (!p.classList.contains('active')) return;
      setTimeout(function () {
        p.classList.remove('active');
        var next = document.querySelector('.gal-panel[data-panel="' + target + '"]');
        if (next) {
          next.classList.add('active');
          buildLbList(next);
          requestAnimationFrame(function () {
            requestAnimationFrame(function () {
              next.classList.add('visible');
            });
          });
        }
      }, 200);
    });
  }

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () { switchTab(tab); });
  });

  /* Fade in panel pertama saat load */
  var firstPanel = document.querySelector('.gal-panel.active');
  if (firstPanel) {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        firstPanel.classList.add('visible');
      });
    });
  }

  /* ══ LIGHTBOX untuk Tab Gallery ══ */
  var lbTab     = document.getElementById('lb');
  var lbImgTab  = document.getElementById('lb-img');
  var lbTitTab  = document.getElementById('lb-tit');
  var lbMetaTab = document.getElementById('lb-meta');
  var lbXTab    = document.getElementById('lb-x');
  var lbPrevTab = document.getElementById('lb-prev');
  var lbNextTab = document.getElementById('lb-next');

  if (!lbTab || !lbImgTab) return;

  var activeItems = [], lbTabIdx = 0;

  function buildLbList(panel) {
    activeItems = Array.from((panel || document.querySelector('.gal-panel.active') || document).querySelectorAll('.gal-item'));
    activeItems.forEach(function (item, idx) {
      item.onclick = function () { openLbTab(idx); };
    });
  }

  function openLbTab(idx) {
    lbTabIdx = idx;
    showLbTab();
    lbTab.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeLbTab() {
    lbTab.classList.remove('open');
    document.body.style.overflow = '';
  }
  function showLbTab() {
    var item = activeItems[lbTabIdx]; if (!item) return;
    var img = item.querySelector('img');
    if (img) { lbImgTab.src = img.src; lbImgTab.style.display = 'block'; }
    if (lbTitTab)  lbTitTab.textContent  = item.dataset.title || '';
    if (lbMetaTab) lbMetaTab.textContent = item.dataset.meta  || '';
  }

  buildLbList(firstPanel);

  if (lbXTab) lbXTab.addEventListener('click', closeLbTab);
  lbTab.addEventListener('click', function (e) { if (e.target === lbTab) closeLbTab(); });
  if (lbPrevTab) lbPrevTab.addEventListener('click', function (e) {
    e.stopPropagation();
    lbTabIdx = (lbTabIdx - 1 + activeItems.length) % activeItems.length;
    showLbTab();
  });
  if (lbNextTab) lbNextTab.addEventListener('click', function (e) {
    e.stopPropagation();
    lbTabIdx = (lbTabIdx + 1) % activeItems.length;
    showLbTab();
  });
  document.addEventListener('keydown', function (e) {
    if (!lbTab.classList.contains('open')) return;
    if (e.key === 'Escape')     closeLbTab();
    if (e.key === 'ArrowLeft')  { lbTabIdx = (lbTabIdx - 1 + activeItems.length) % activeItems.length; showLbTab(); }
    if (e.key === 'ArrowRight') { lbTabIdx = (lbTabIdx + 1) % activeItems.length; showLbTab(); }
  });

});
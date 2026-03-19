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

  /* ══ CUSTOM CURSOR ══
     Uses event delegation on document so it works on ALL elements
     including dynamically created particles ══ */
  var dot  = document.getElementById('cur-dot');
  var ring = document.getElementById('cur-ring');

  if (dot && ring && window.matchMedia('(pointer:fine)').matches) {
    var mx = 0, my = 0, rx = 0, ry = 0;

    document.addEventListener('mousemove', function (e) {
      mx = e.clientX; my = e.clientY;
      dot.style.left = mx + 'px';
      dot.style.top  = my + 'px';
    });

    /* smooth ring follow */
    (function animRing() {
      rx += (mx - rx) * 0.13;
      ry += (my - ry) * 0.13;
      ring.style.left = rx + 'px';
      ring.style.top  = ry + 'px';
      requestAnimationFrame(animRing);
    })();

    /* use event delegation — covers every element, even future ones */
    var HOV_SELECTOR = 'a,button,.gal-item,.skill-card,.tag,.social-btn,.gal-btn,.btn,.nav-logo,.email-link';
    document.addEventListener('mouseover', function (e) {
      if (e.target.closest(HOV_SELECTOR)) {
        document.body.classList.add('hov');
      }
    });
    document.addEventListener('mouseout', function (e) {
      if (e.target.closest(HOV_SELECTOR)) {
        document.body.classList.remove('hov');
      }
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
          obs.unobserve(e.target); /* stop watching once visible */
        }
      });
    }, { threshold: 0.07 });
    revEls.forEach(function (el) { obs.observe(el); });
  } else {
    /* fallback for old browsers */
    revEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* ══ GALLERY FILTER ══ */
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

  /* ══ ACTIVE NAV ON SCROLL ══ */
  var sections = document.querySelectorAll('section[id]');
  var navLinks = document.querySelectorAll('.nav-links a');
  window.addEventListener('scroll', function () {
    var cur = '';
    sections.forEach(function (s) {
      if (window.scrollY >= s.offsetTop - 220) cur = s.id;
    });
    navLinks.forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('href') === '#' + cur);
    });
  }, { passive: true });

});

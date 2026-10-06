// Scroll story + small enhancements. No dependencies.
// All content lives in the HTML; this file only drives transforms and opacity.
(() => {
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  // ?motion=on previews the animated story on a device that has reduced motion enabled.
  const forced = new URLSearchParams(location.search).get('motion') === 'on';
  const story = document.querySelector('.story');
  const stage = story.querySelector('.stage');

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, u) => a + (b - a) * u;
  const ease = (u) => u * u * (3 - 2 * u);

  /* ---------- Storyboard ----------
     One pose per stage (0 hero, 1 identity, 2 architecture, 3 build, 4 connect, 5 evidence).
     Slabs are listed bottom-to-top: [x, y, z, scale] in the 1000x720 design box. */
  const stack = (gap) => [0, 1, 2, 3].map((i) => [0, 0, (i - 1.5) * gap, 1]);
  // Hero: lower layers step out from under the top card so each one's label shows.
  const fan = (gap, step) => [0, 1, 2, 3].map((i) => [0, (3 - i) * step - step * 1.5, (i - 1.5) * gap, 1]);
  const quad = (x, y, s) => [[x, y, 10, s], [-x, y, 10, s], [x, -y, 10, s], [-x, -y, 10, s]];
  const POSES = [
    { rx: 58, rz: -42, sc: 1.5, slabs: fan(48, 44), face: [1, 0, 0, 0], bg: [1, 0, 0, 0, 0], link: 0, floor: 1 },
    { rx: 60, rz: -32, sc: 1.0, slabs: stack(30), face: [1, 0, 0, 0], bg: [1, 0, 0, 0, 0], link: 0, floor: 0.6 },
    { rx: 62, rz: -40, sc: 0.95, slabs: stack(150), face: [0, 1, 0, 0], bg: [0, 1, 0, 0, 0], link: 0 },
    { rx: 12, rz: -5, sc: 0.95, slabs: [[225, 185, 0, 0.95], [-215, 150, 90, 0.95], [235, -120, 30, 0.95], [-235, -165, 120, 0.95]], face: [0, 0, 1, 0], bg: [0, 0, 1, 0, 0], link: 0 },
    { rx: 0, rz: 0, sc: 1.0, slabs: quad(300, 205, 0.7), face: [0, 0, 1, 0], bg: [0, 0, 0, 1, 0], link: 1 },
    { rx: 0, rz: 0, sc: 1.0, slabs: quad(222, 148, 1), face: [0, 0, 0, 1], bg: [0, 0, 0, 0, 1], link: 0 },
  ];
  const LAST = POSES.length - 1;

  const el = {
    fit: story.querySelector('.scene-fit'),
    tilt: story.querySelector('.tilt'),
    slabs: [...story.querySelectorAll('.slab')].sort((a, b) => a.dataset.i - b.dataset.i),
    bgs: [...story.querySelectorAll('.bg')],
    links: story.querySelector('.links'),
    linkPaths: [...story.querySelectorAll('.link-set path')],
    flowPaths: [...story.querySelectorAll('.flow-set path')],
    hub: story.querySelector('.hub'),
    chips: [...story.querySelectorAll('.chip')],
    floor: story.querySelector('.floor'),
    orbs: [...story.querySelectorAll('.orb')],
    ticker: story.querySelector('.ticker'),
    hero: story.querySelector('.hero'),
    h1a: story.querySelector('.h1-a'),
    h1b: story.querySelector('.h1-b'),
    lede: [...story.querySelectorAll('.eyebrow, .hero-lede, .hero-cta, .scroll-hint')],
    steps: [...story.querySelectorAll('.step-in')],
    rail: [...story.querySelectorAll('.rail li')],
  };
  el.faces = el.slabs.map((s) => [...s.querySelectorAll('.face')]);

  let W = 0, H = 0, top = 0, fitScale = 1, wide = true;
  let ticking = false, active = false, enabled = false;

  function measure() {
    W = stage.clientWidth;
    H = stage.clientHeight;
    top = story.getBoundingClientRect().top + scrollY;
    wide = W >= 860;
    fitScale = wide ? Math.min((W * 0.5) / 1000, (H * 0.8) / 720) : Math.min((W * 0.96) / 1000, (H * 0.44) / 720);
  }

  // Where the scene sits in the stage: beside the copy on desktop, above it on mobile.
  function offset(stageIndex) {
    if (wide) return stageIndex === 0 ? [W * 0.22, 0] : [W * 0.23, H * 0.02];
    return stageIndex === 0 ? [0, -H * 0.36] : [0, -H * 0.23];
  }

  function render() {
    ticking = false;
    if (!H) measure();
    if (!H) return; // stage not laid out yet
    const t = clamp((scrollY - top) / H, 0, LAST);
    const i = Math.min(Math.floor(t), LAST - 1);
    // Hold each pose around its chapter, travel in the middle of the gap.
    const u = ease(clamp((t - i - 0.2) / 0.6));
    const A = POSES[i], B = POSES[i + 1];

    const [ax, ay] = offset(i), [bx, by] = offset(i + 1);
    const sc = (wide ? lerp(A.sc, B.sc, u) : lerp(Math.min(A.sc, 1), B.sc, u)) * fitScale;
    el.fit.style.transform = `translate3d(${lerp(ax, bx, u)}px,${lerp(ay, by, u)}px,0) scale(${sc})`;
    el.tilt.style.transform = `rotateY(${ptr.x * 7}deg) rotateX(${lerp(A.rx, B.rx, u) - ptr.y * 5}deg) rotateZ(${lerp(A.rz, B.rz, u)}deg)`;
    el.floor.style.opacity = lerp(A.floor || 0, B.floor || 0, u);
    el.floor.style.transform = `translateZ(-170px) scale(${1 + t * 0.25})`;

    el.slabs.forEach((slab, k) => {
      const a = A.slabs[k], b = B.slabs[k];
      slab.style.transform = `translate3d(${lerp(a[0], b[0], u)}px,${lerp(a[1], b[1], u)}px,${lerp(a[2], b[2], u)}px) scale(${lerp(a[3], b[3], u)})`;
      // Outgoing face clears before the incoming one appears, so labels never overlap.
      el.faces[k].forEach((f, n) => {
        f.style.opacity = A.face[n] === B.face[n] ? A.face[n] : A.face[n] ? 1 - clamp(u * 2) : clamp(u * 2 - 1);
      });
    });
    el.bgs.forEach((bg, n) => { bg.style.opacity = lerp(A.bg[n], B.bg[n], u); });

    const link = lerp(A.link, B.link, u);
    el.links.style.opacity = link;
    el.hub.style.opacity = link;
    el.hub.style.transform = `translateZ(20px) scale(${0.4 + 0.6 * link})`;
    el.chips.forEach((c) => { c.style.opacity = clamp(link * 2 - 1); });
    if (link > 0) {
      el.linkPaths.forEach((p) => { p.style.strokeDashoffset = 1 - link; });
      el.flowPaths.forEach((p) => { p.style.strokeDashoffset = -t * 1.6; p.style.opacity = clamp(link * 2 - 1); });
    }

    // Hero copy leaves as the first chapter arrives.
    const h = clamp(t / 0.45);
    el.hero.style.opacity = 1 - h;
    el.hero.classList.toggle('is-gone', h >= 1);
    el.h1a.style.transform = `translate3d(${-h * 22}%,${-h * 60}%,0) scale(${1 + h * 0.35})`;
    el.h1b.style.transform = `translate3d(${h * 30}%,${-h * 20}%,0) scale(${1 + h * 0.35})`;
    el.lede.forEach((n) => { n.style.transform = `translate3d(0,${h * 60}px,0)`; });
    el.ticker.style.opacity = 1 - h;
    // The orbiting stack labels get pulled into the monolith as the story starts.
    const pull = ease(clamp(t / 0.8));
    el.orbs.forEach((o) => {
      const k = 1 - pull;
      o.style.transform = `translate3d(${o.dataset.x * k + ptr.x * 14}px,${o.dataset.y * k + ptr.y * 14}px,0) scale(${0.3 + 0.7 * k})`;
      o.style.opacity = clamp(k * 1.6);
    });

    el.steps.forEach((s, k) => {
      const d = Math.abs(t - (k + 1));
      s.style.opacity = k + 1 === LAST && t >= LAST ? 1 : clamp(1.45 - d * 2.4);
    });
    const now = Math.round(t);
    el.rail.forEach((r, k) => r.classList.toggle('on', k + 1 === now));
  }

  // Pointer parallax: eased towards the cursor, and the loop stops once it has settled.
  const ptr = { x: 0, y: 0, tx: 0, ty: 0, raf: 0 };
  function ptrLoop() {
    ptr.x += (ptr.tx - ptr.x) * 0.08;
    ptr.y += (ptr.ty - ptr.y) * 0.08;
    render();
    ptr.raf = Math.abs(ptr.tx - ptr.x) + Math.abs(ptr.ty - ptr.y) > 0.002 ? requestAnimationFrame(ptrLoop) : 0;
  }
  function onPointer(e) {
    if (!active || !wide || e.pointerType !== 'mouse') return;
    ptr.tx = (e.clientX / W) * 2 - 1;
    ptr.ty = (e.clientY / H) * 2 - 1;
    if (!ptr.raf) ptr.raf = requestAnimationFrame(ptrLoop);
  }

  function onScroll() {
    if (!active || ticking) return;
    ticking = true;
    requestAnimationFrame(render);
  }

  // Only do per-frame work while the story is on screen.
  const io = new IntersectionObserver(([e]) => {
    active = e.isIntersecting;
    if (active) onScroll();
  });

  function clearInline() {
    const nodes = [el.fit, el.tilt, el.hero, el.h1a, el.h1b, el.hub, el.links, ...el.slabs, ...el.faces.flat(), ...el.bgs, ...el.lede, ...el.steps, ...el.chips, ...el.orbs, el.floor, el.ticker];
    nodes.forEach((n) => n.removeAttribute('style'));
    el.hero.classList.remove('is-gone');
  }

  function setMode() {
    const want = forced || !reduced.matches;
    if (want === enabled) return;
    enabled = want;
    root.classList.toggle('motion', enabled);
    if (enabled) {
      measure();
      addEventListener('scroll', onScroll, { passive: true });
      story.addEventListener('pointermove', onPointer, { passive: true });
      io.observe(story);
      render();
    } else {
      removeEventListener('scroll', onScroll);
      story.removeEventListener('pointermove', onPointer);
      io.disconnect();
      active = false;
      clearInline();
    }
  }

  let resizeRaf = 0;
  addEventListener('resize', () => {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => { if (enabled) { measure(); render(); } });
  });
  reduced.addEventListener('change', setMode);
  setMode();

  /* ---------- Header: condense after the hero, and mark the section in view ---------- */
  const nav = document.querySelector('.nav');
  new IntersectionObserver(([e]) => nav.classList.toggle('is-stuck', !e.isIntersecting))
    .observe(document.querySelector('.nav-sentinel'));

  // Header text colour follows whichever section sits behind it (a thin band at the header's height).
  const lightSections = [...document.querySelectorAll('.work, .skills')];
  let toneIO;
  function watchTone() {
    if (toneIO) toneIO.disconnect();
    toneIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => { e.target._under = e.isIntersecting; });
      nav.classList.toggle('on-light', lightSections.some((s) => s._under));
    }, { rootMargin: `-40px 0px -${Math.max(0, innerHeight - 42)}px 0px` });
    lightSections.forEach((s) => toneIO.observe(s));
  }
  watchTone();
  addEventListener('resize', watchTone);

  const navLinks = [...nav.querySelectorAll('nav a')];
  const targets = { story: '#ch-1', work: '#work', engagement: '#engagement', skills: '#skills', contact: '#contact' };
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      navLinks.forEach((a) => {
        if (a.getAttribute('href') === targets[e.target.id]) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  Object.keys(targets).forEach((id) => spy.observe(document.getElementById(id)));

  /* ---------- Count-up for the evidence numbers (final values are already in the HTML) ---------- */
  const counters = document.querySelectorAll('[data-count]');
  const countIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      countIO.unobserve(e.target);
      if (reduced.matches && !forced) return;
      const { count, suffix = '', decimals = 0 } = e.target.dataset;
      const end = Number(count), t0 = performance.now();
      const step = (now) => {
        const p = clamp((now - t0) / 1100);
        e.target.textContent = (end * (1 - Math.pow(1 - p, 3))).toFixed(decimals) + suffix;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }, { threshold: 0.6 });
  counters.forEach((c) => countIO.observe(c));
})();

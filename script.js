// ===== Loader intro =====
const fireLoaded = () => {
  document.body.classList.add('is-loaded');
  // release the scroll lock once the wipe is underway
  document.documentElement.classList.remove('is-loading');
  window.removeEventListener('wheel', blockScroll);
  window.removeEventListener('touchmove', blockScroll);
};
// while the loader covers the page, swallow scroll input so the page
// underneath doesn't quietly scroll down behind the intro
const blockScroll = (e) => e.preventDefault();
// set by the inline <head> snippet when we arrived by clicking a menu word:
// the loader bars are then a scrim laid over this page's own hero, not a cream slab
const isCurtain = document.documentElement.classList.contains('is-curtain');
if (document.getElementById('loader')) {
  // lock the page at the top until the intro finishes
  document.documentElement.classList.add('is-loading');
  window.scrollTo(0, 0);
  window.addEventListener('wheel', blockScroll, { passive: false });
  window.addEventListener('touchmove', blockScroll, { passive: false });
  // hold the loader briefly so the logo reads, then wipe + reveal hero
  const MIN = document.body.classList.contains('home') ? 1100 : 800;
  let done = false;
  const trigger = () => {
    if (done) return;
    done = true;
    if (!isCurtain) { setTimeout(fireLoaded, MIN); return; }
    // curtain: peel as soon as the hero has actually painted. a wall-clock guess
    // would strip the scrim off an undecoded photo and wipe a brown slab instead.
    // capped, so a slow decode can't leave anyone stranded behind the curtain.
    const hero = document.querySelector('.hero-bg');
    const painted = (hero && hero.decode) ? hero.decode().catch(() => {}) : Promise.resolve();
    let fired = false;
    const peel = () => { if (!fired) { fired = true; fireLoaded(); } };
    painted.then(() => setTimeout(peel, 100));
    setTimeout(peel, 700);
  };
  // lift on DOM-ready, NOT window 'load' — otherwise heavy images hold the intro hostage
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', trigger);
  else trigger();
  // safety net in case DOMContentLoaded already passed unusually
  setTimeout(trigger, 2000);
} else {
  fireLoaded();
}

// run a callback only once the intro loader has lifted — otherwise entrance
// animations for anything already in view play (and finish) behind the loader
const whenLoaded = (cb) => {
  if (document.body.classList.contains('is-loaded')) cb();
  else {
    const t = setInterval(() => {
      if (document.body.classList.contains('is-loaded')) { clearInterval(t); cb(); }
    }, 100);
  }
};

// ===== Header scroll state =====
const header = document.getElementById('header');
const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 80);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

// ===== Hero carousel (home only) =====
const carousel = document.getElementById('heroCarousel');
const dotsWrap = document.getElementById('heroDots');
if (carousel && dotsWrap) {
  const slides = [...carousel.querySelectorAll('.slide')];
  let current = 0;

  slides.forEach((_, i) => {
    const b = document.createElement('button');
    b.setAttribute('aria-label', `Go to slide ${i + 1}`);
    if (i === 0) b.classList.add('active');
    b.addEventListener('click', () => go(i));
    dotsWrap.appendChild(b);
  });
  const dots = [...dotsWrap.children];

  const go = (i) => {
    slides[current].classList.remove('is-active');
    dots[current].classList.remove('active');
    current = (i + slides.length) % slides.length;
    slides[current].classList.add('is-active');
    dots[current].classList.add('active');
  };
  let timer = setInterval(() => go(current + 1), 5500);
  dotsWrap.addEventListener('click', () => {
    clearInterval(timer);
    timer = setInterval(() => go(current + 1), 5500);
  });
}

// ===== Scroll reveal =====
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) {
      e.target.classList.add('in');
      io.unobserve(e.target);
    }
  });
}, { threshold: 0.18 });
whenLoaded(() => document.querySelectorAll('.reveal').forEach((el) => io.observe(el)));

// ===== Wellness cluster: single image that opens up into the spread =====
const well = document.querySelector('.well');
if (well) {
  // two-phase: photos unfurl open one-by-one onto a centred pile, then the
  // pile disperses out into the final fanned spread
  const runWell = () => {
    well.classList.add('well-stack');                              // unfurl in centre
    setTimeout(() => well.classList.add('well-open'), 1700);       // then disperse
  };
  // hold until the intro loader has wiped away
  const reveal = () => {
    if (document.body.classList.contains('is-loaded')) runWell();
    else setTimeout(reveal, 120);
  };
  const wellIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { reveal(); wellIO.unobserve(e.target); }
    });
  }, { threshold: 0.2 });
  wellIO.observe(well);
}

// ===== House of Ralf: gentle parallax float (photos drift with the scroll) =====
(function () {
  const stage = document.querySelector('.house-stage');
  const center = document.querySelector('.house-center');
  if (!stage) return;
  const tiles = Array.prototype.slice.call(stage.querySelectorAll('.hp'));
  if (!tiles.length) return;

  // mobile lays the photos out in a static grid; reduced-motion users opt out
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || window.matchMedia('(max-width:760px)').matches) return;

  // per-tile drift rate (fraction of AMP). mixed signs let some photos rise
  // while others sink as you scroll, for a layered, floating depth
  const factors = [-0.45, 0.62, -0.78, 0.50, 0.82, -0.55, 0.70];
  const AMP = 210;

  const clamp = (v, a, b) => (v < a ? a : (v > b ? b : v));

  let ticking = false;
  const render = () => {
    ticking = false;
    const r = stage.getBoundingClientRect();
    const vh = window.innerHeight;
    // 0 as the stage enters from the bottom -> 1 as it leaves past the top
    const p = clamp((vh - r.top) / (vh + r.height), 0, 1);
    const drift = (p - 0.5) * 2;                  // -1 .. 1, neutral when centred
    for (let i = 0; i < tiles.length; i++) {
      const y = drift * factors[i % factors.length] * AMP;
      tiles[i].style.transform = 'translate3d(0,' + y.toFixed(1) + 'px,0)';
    }
    if (center) {
      center.style.transform = 'translate(-50%,-50%) translateY(' + (drift * -18).toFixed(1) + 'px)';
    }
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(render); } };

  render();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  window.addEventListener('load', render);
})();

// ===== Overlay menu =====
// Hovering a word previews where it goes. Clicking one holds that photo dead
// still, fades the words off it, and hands it to the arriving page — which is
// already showing the same photo under the same scrim, and peels the scrim away.

// where each word leads, and the hero it lands on. the only copy of this map.
const HERO = {
  'about.html': 'ralf-house.png',
  'story.html': 'ralf-bedroom-dusk.jpg',
  'rooms.html': 'V2_Guestroom_day.png',
  'presents.html': 'presents.jpg',
};
const MENU_IMG = 'ralf-menu.png';   // idle, nothing hovered

// sessionStorage throws outright in some privacy modes — never let it kill a link
const store = {
  set(k, v) { try { sessionStorage.setItem(k, v); return true; } catch (_) { return false; } },
  get(k) { try { return sessionStorage.getItem(k); } catch (_) { return null; } },
  del(k) { try { sessionStorage.removeItem(k); } catch (_) { /* nothing to do */ } },
};

const toggle = document.getElementById('navToggle');
const nav = document.getElementById('primaryNav');
if (toggle && nav) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const here = location.pathname.split('/').pop() || 'index.html';

  // --- photo layers, built here so the eight copies of the nav markup stay untouched
  const bg = document.createElement('div');
  bg.className = 'pnav-bg';
  const layers = {};
  const addLayer = (key, src) => {
    const img = new Image();
    img.className = 'pnav-layer';
    img.alt = '';
    img.setAttribute('aria-hidden', 'true');
    img.dataset.src = src;            // no src yet — nothing is fetched until the menu is wanted
    bg.appendChild(img);
    layers[key] = img;
  };
  addLayer('default', MENU_IMG);
  Object.keys(HERO).forEach((href) => addLayer(href, HERO[href]));
  nav.prepend(bg);
  layers.default.classList.add('is-active');

  let warmed = false;
  const warm = () => {
    if (warmed) return;
    warmed = true;
    Object.keys(layers).forEach((k) => { layers[k].src = layers[k].dataset.src; });
  };

  const show = (key) => {
    const next = layers[key] || layers.default;
    Object.keys(layers).forEach((k) => layers[k].classList.toggle('is-active', layers[k] === next));
  };

  // the words: every direct link except the Book button (EN/FR live inside .pnav-lang)
  const words = [...nav.querySelectorAll(':scope > a')].filter((a) => !a.classList.contains('btn-book'));
  words.forEach((a) => a.classList.add('pnav-word'));

  // a link we can take over: one of ours, opening in this tab. leaves #shop,
  // EN/FR and the Mews booking tab exactly as they were.
  const isOurs = (a) => !a.target && !!HERO[a.getAttribute('href') || ''];

  // --- hover: swap the photo, step the other words back, warm the next page
  const prefetched = new Set();
  const hoverOn = (a) => {
    const href = a.getAttribute('href');
    nav.classList.add('is-hovering');
    words.forEach((w) => w.classList.toggle('is-hot', w === a));
    show(isOurs(a) ? href : 'default');
    if (isOurs(a) && !prefetched.has(href)) {
      prefetched.add(href);
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = href;
      document.head.appendChild(link);
    }
  };
  const hoverOff = () => {
    nav.classList.remove('is-hovering');
    words.forEach((w) => w.classList.remove('is-hot'));
    show('default');
  };
  words.forEach((a) => {
    a.addEventListener('mouseenter', () => hoverOn(a));
    a.addEventListener('mouseleave', hoverOff);
    a.addEventListener('focus', () => hoverOn(a));      // tabbing previews too
  });
  nav.addEventListener('mouseleave', hoverOff);
  nav.addEventListener('focusout', (e) => { if (!nav.contains(e.relatedTarget)) hoverOff(); });

  // --- open / close
  let leaving = null;
  const openNav = () => {
    warm();
    nav.classList.add('open');
    document.body.classList.add('nav-open');
    toggle.setAttribute('aria-expanded', 'true');
  };
  const closeNav = () => {
    if (leaving) { clearTimeout(leaving); leaving = null; store.del('ralf:curtain'); }
    nav.classList.remove('open', 'is-leaving', 'is-hovering');
    words.forEach((w) => w.classList.remove('is-hot'));
    document.body.classList.remove('nav-open');
    toggle.setAttribute('aria-expanded', 'false');
    show('default');
  };
  toggle.setAttribute('aria-expanded', 'false');
  toggle.addEventListener('pointerenter', warm);   // a head start before the click
  toggle.addEventListener('click', () => (nav.classList.contains('open') ? closeNav() : openNav()));
  document.getElementById('navClose')?.addEventListener('click', closeNav);

  // --- leaving: hold the photo, fade the words, hand off
  nav.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    // anything below navigates exactly as it does today — no interception at all
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (!isOurs(a)) { closeNav(); return; }
    const href = a.getAttribute('href');
    if (href === here) { e.preventDefault(); closeNav(); return; }   // already on this page
    if (reduceMotion.matches) return;                                // straight there, no stall
    if (!store.set('ralf:curtain', '1')) return;                     // storage blocked: don't brick the link

    e.preventDefault();
    // .is-hot out-specifies the leaving fade, so drop the hover state first
    nav.classList.remove('is-hovering');
    words.forEach((w) => w.classList.remove('is-hot'));
    // settle this word's photo to its exact resting frame. a touch tap never
    // hovered, and a fast click may be mid-crossfade — either way the next page
    // must open on the photo we're leaving on.
    show(href);
    nav.classList.add('is-leaving');
    leaving = setTimeout(() => { location.href = href; }, 380);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('open')) { closeNav(); toggle.focus(); }
  });

  // --- back button. bfcache restores the DOM verbatim, so without this you return
  // to a dead full-screen photo: no words, no close button, and the scroll locked.
  window.addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    document.documentElement.classList.remove('is-curtain');
    document.body.classList.add('is-loaded');
    closeNav();
  });
}

// ===== Newsletter form =====
const form = document.getElementById('newsletterForm');
const note = document.getElementById('formNote');
if (form && note) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    form.reset();
    note.hidden = false;
  });
}

// ===== Opening announcement pop-up (once per session) =====
const announce = document.getElementById('announce');
if (announce && store.get('ralf-announce') !== '1') {
  setTimeout(() => announce.classList.add('show'), 4800);
  const dismiss = () => {
    announce.classList.remove('show');
    store.set('ralf-announce', '1');
  };
  announce.querySelector('.announce-close')?.addEventListener('click', dismiss);
  announce.querySelector('.announce-btn')?.addEventListener('click', dismiss);
  announce.addEventListener('click', (e) => { if (e.target === announce) dismiss(); });
}

// ===== Rooms rail: the nav follows the room you're looking at =====
// A room becomes the current one once it crosses a band through the middle of
// the viewport. Between rooms nothing is in the band and no entry fires, so the
// last room simply stays lit — that's what makes the rail read as a guide
// rather than a light flickering off in the gaps.
(function () {
  const rail = document.querySelector('.rooms-rail-list');
  if (!rail) return;
  const links = Array.prototype.slice.call(rail.querySelectorAll('.rail-link'));
  const panels = links.map((a) => document.querySelector(a.getAttribute('href')));
  if (!panels.length || panels.some((p) => !p)) return;

  const setCurrent = (panel) => {
    links.forEach((a, i) => a.classList.toggle('is-current', panels[i] === panel));
  };

  const railIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) setCurrent(e.target); });
  }, { rootMargin: '-45% 0px -45% 0px' });
  panels.forEach((p) => railIO.observe(p));
})();

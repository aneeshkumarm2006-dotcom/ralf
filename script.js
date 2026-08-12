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
  'about.html': 'The%20Bar_Lobby%20at%20The%20Ralf%20.png',
  'story.html': 'ralf-bar-lobby.png',
  'rooms.html': 'V2_Guestroom_day.png',
  'presents.html': 'presents.jpg',
  'contact.html': 'ralf-reception.png',
};
const MENU_IMG = 'ralf-menu.png';   // idle, nothing hovered

// sessionStorage throws outright in some privacy modes — never let it kill a link
const store = {
  set(k, v) { try { sessionStorage.setItem(k, v); return true; } catch (_) { return false; } },
  get(k) { try { return sessionStorage.getItem(k); } catch (_) { return null; } },
  del(k) { try { sessionStorage.removeItem(k); } catch (_) { /* nothing to do */ } },
};

// ===== Rooms arch transition =====
// One espresso veil — a full sheet with a single arch-shaped hole cut out of it —
// drives both halves of the Rooms hand-off: the menu photo collapsing into the
// reference arch, and the arriving hero growing back out of it. The hole is static;
// only transform:scale animates, so the whole reveal lives on the compositor and
// stays smooth even while the destination is still decoding images. Modelled on
// lafantaisie.com/rooms.
const ARCH = {
  // arch hole as fractions of the viewport; opened wider on a narrow phone so it
  // reads as an arch and not a sliver. [l,r] sides · [t,b] top/bottom · dome = crown height
  frac() {
    return window.matchMedia('(max-width:760px)').matches
      ? { l: 0.16, r: 0.84, t: 0.25, b: 0.71, dome: 0.40 }
      : { l: 0.39, r: 0.61, t: 0.26, b: 0.73, dome: 0.44 };
  },
  // a veil sized to the viewport: opaque espresso with the arch punched out (evenodd),
  // origin at the arch's centre, and dataset.max = the scale that just clears every corner
  build() {
    const W = innerWidth, H = innerHeight, f = this.frac();
    const left = f.l * W, right = f.r * W, top = f.t * H, bottom = f.b * H;
    const dh = (bottom - top) * f.dome, rx = (right - left) / 2;
    const outer = `M0 0H${W}V${H}H0Z`;                                   // the full sheet
    const arch = `M${left} ${bottom}V${top + dh}A${rx} ${dh} 0 0 1 ${right} ${top + dh}V${bottom}Z`;  // the hole
    const veil = document.createElement('div');
    veil.className = 'arch-veil';
    veil.style.clipPath = `path(evenodd,'${outer} ${arch}')`;
    veil.style.transformOrigin = `${(left + right) / 2}px ${(top + bottom) / 2}px`;
    veil.dataset.max = Math.max(W / (right - left), H / (bottom - top)) * 1.15;
    return veil;
  },
};

// Arriving on Rooms from the menu: mount the veil at the small arch (its default
// scale 1), then grow it open once the hero has painted. The .hero sits on espresso
// and .hero-bg starts hidden, so nothing but espresso shows before the veil mounts.
if (document.documentElement.classList.contains('is-arch')
    && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const veil = ARCH.build();
  document.body.appendChild(veil);
  document.documentElement.classList.add('arch-ready');   // reveal the hero beneath the hole
  whenLoaded(() => {
    // hold one frame on the reference shape, then open it out to the full frame
    requestAnimationFrame(() => {
      veil.style.transition = 'transform 1.15s var(--ease)';
      veil.style.transform = `scale(${veil.dataset.max})`;
      const drop = () => veil.remove();
      veil.addEventListener('transitionend', drop, { once: true });
      setTimeout(drop, 1500);                              // fallback if transitionend is missed
    });
  });
}

// Arch hand-off into Rooms — the espresso veil collapses to the reference arch;
// rooms.html (is-arch) then grows it back open, so the two arches meet across the
// cut. Shared by the MENU's "Rooms" word and the homepage "See our rooms" button.
// The caller owns the reduced-motion + storage guards. Returns the pending
// navigation timeout so a cancel (e.g. closing the menu) can clear it.
const archCollapseToRooms = (href) => {
  const veil = ARCH.build();
  veil.style.transform = `scale(${veil.dataset.max})`;   // start wide: the hole clears the frame
  document.body.appendChild(veil);
  requestAnimationFrame(() => {
    veil.style.transition = 'transform .6s var(--ease)';
    veil.style.transform = 'scale(1)';                   // collapse to the reference arch
  });
  return setTimeout(() => { location.href = href; }, 640);
};

// The homepage hero "See our rooms" button gets the same arch transition as the
// menu's Rooms word. There's no menu photo to hold here, so the arch simply
// collapses over the hero and rooms.html grows it back open on arrival.
const heroRooms = document.querySelector('.hero-rooms');
if (heroRooms) {
  heroRooms.addEventListener('click', (e) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;  // straight there
    if (!store.set('ralf:curtain', '1')) return;                                // storage blocked: let the link go
    e.preventDefault();
    archCollapseToRooms(heroRooms.getAttribute('href') || 'rooms.html');
  });
}

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

  // a link we can take over: one of ours, opening in this tab. leaves EN/FR
  // and the Mews booking tab exactly as they were.
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
    document.querySelectorAll('.arch-veil').forEach((v) => v.remove());   // drop a half-built Rooms veil
    nav.classList.remove('open', 'is-leaving', 'is-arching', 'is-hovering');
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
    if (href === 'rooms.html') {
      // Rooms gets the arch: lay the same veil over the menu, wide open so the whole
      // photo shows, then collapse it to the reference shape (transform only → smooth)
      // while the words fade and the scrim lifts. rooms.html (is-arch) mounts the veil
      // at that exact small arch and grows it — so the two arches meet across the cut.
      nav.classList.add('is-arching');
      leaving = archCollapseToRooms(href);
    } else {
      nav.classList.add('is-leaving');
      leaving = setTimeout(() => { location.href = href; }, 380);
    }
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

// ===== Forms (newsletter sign-up, contact) =====
// PRE-LAUNCH: neither of these posts anywhere. They clear and confirm so the
// pages can be demoed; both need a real endpoint before the site goes live.
[['newsletterForm', 'formNote'], ['contactForm', 'contactNote']].forEach(([formId, noteId]) => {
  const form = document.getElementById(formId);
  const note = document.getElementById(noteId);
  if (!form || !note) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    // the contact form is novalidate so the browser doesn't fight the styling —
    // check it here instead, or an empty message would read back as "sent"
    if (!form.checkValidity()) { form.reportValidity(); return; }
    form.reset();
    note.hidden = false;
  });
});

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

  // The rail sits in the page flow, starting level with the first room's copy:
  // it scrolls with the content like anything else, parks at its sticky top
  // limit, and is carried away by the section's end (both limits are plain CSS
  // sticky behaviour). JS only measures where that first description actually
  // starts so the rail's natural position lines up with it.
  const alignRail = () => {
    const info = panels[0].querySelector('.room-info');
    const track = rail.parentElement;   // .rooms-rail spans the whole section
    if (!info || !track) return;
    const offset = info.getBoundingClientRect().top - track.getBoundingClientRect().top;
    rail.style.setProperty('--rail-start', Math.max(0, Math.round(offset)) + 'px');
  };

  const setCurrent = (panel) => {
    links.forEach((a, i) => a.classList.toggle('is-current', panels[i] === panel));
  };

  const railIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) setCurrent(e.target); });
  }, { rootMargin: '-45% 0px -45% 0px' });
  panels.forEach((p) => railIO.observe(p));

  alignRail();
  window.addEventListener('resize', alignRail, { passive: true });
  window.addEventListener('load', alignRail);
})();

// ===== Rooms: the masthead steps aside while you read down the page =====
// Scrolling down tucks the fixed header away (html.nav-tucked, styled in CSS);
// the first upward scroll brings it back. Rooms page only.
(function () {
  if (!document.querySelector('.rooms-index') || !header) return;
  const SHOW_ZONE = 160;                       // this close to the top it always shows
  const SLACK = 8;                             // ignore direction wobble under 8px
  const root = document.documentElement;
  let lastY = window.scrollY;
  window.addEventListener('scroll', () => {
    const y = Math.max(0, window.scrollY);     // rubber-band overscroll goes negative
    if (document.body.classList.contains('nav-open')) { lastY = y; return; }
    if (y < SHOW_ZONE) { root.classList.remove('nav-tucked'); lastY = y; return; }
    if (Math.abs(y - lastY) < SLACK) return;   // let tiny moves accumulate until decisive
    root.classList.toggle('nav-tucked', y > lastY);
    lastY = y;
  }, { passive: true });
  // keyboard: tabbing into a tucked header must bring it back on-screen
  header.addEventListener('focusin', () => root.classList.remove('nav-tucked'));
})();

// ===== Rooms: each photo drifts inside its arch as the room passes =====
// The arch reveal (clip + settle) is CSS on .room-panel.reveal.in; this adds the
// slow vertical parallax on top, so the image feels alive rather than pasted in.
// The photo is scaled up in CSS (scale 1.08), so this ±drift never bares an edge.
(function () {
  const imgs = Array.prototype.slice.call(document.querySelectorAll('.room-media img'));
  if (!imgs.length) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const AMP = 26;                                  // px of travel, well inside the overscan
  const clamp = (v, a, b) => (v < a ? a : (v > b ? b : v));

  let ticking = false;
  const render = () => {
    ticking = false;
    const vh = window.innerHeight;
    for (let i = 0; i < imgs.length; i++) {
      const frame = imgs[i].parentElement;
      const r = frame.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) continue;    // off-screen: leave it be
      // 0 as the arch enters from the bottom -> 1 as it leaves past the top
      const p = clamp((vh - r.top) / (vh + r.height), 0, 1);
      const y = (p - 0.5) * 2 * AMP;               // -AMP..AMP, neutral when centred
      imgs[i].style.setProperty('--ry', y.toFixed(1) + 'px');
    }
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(render); } };

  render();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  window.addEventListener('load', render);
})();

// ===== Seamless hero-video loop =====
// The native `loop` attribute lets the video reach end-of-stream, where the
// browser tears down the decoded frame — a gray flash + re-buffer stall — before
// it restarts. Instead we drop `loop` and jump back a hair BEFORE the true end,
// so playback never hits end-of-stream and the last frame is never cleared.
(() => {
  const vid = document.querySelector('video.hero-bg');
  if (!vid) return;

  // Paint the poster behind the video so any residual gap shows a matching
  // frame, never the element's empty gray box.
  if (vid.poster) vid.style.backgroundImage = `url("${vid.poster}")`;

  vid.loop = false;
  const LEAD = 0.12; // seconds before the end to wrap around
  vid.addEventListener('timeupdate', () => {
    if (vid.duration && vid.currentTime >= vid.duration - LEAD) {
      vid.currentTime = 0;
    }
  });
  // fallback: if a frame is ever missed and it does reach the end, restart at once
  vid.addEventListener('ended', () => { vid.currentTime = 0; vid.play(); });
})();

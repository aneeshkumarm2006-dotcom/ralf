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
if (document.getElementById('loader')) {
  // lock the page at the top until the intro finishes
  document.documentElement.classList.add('is-loading');
  window.scrollTo(0, 0);
  window.addEventListener('wheel', blockScroll, { passive: false });
  window.addEventListener('touchmove', blockScroll, { passive: false });
  // hold the loader briefly so the logo reads, then wipe + reveal hero
  const MIN = document.body.classList.contains('home') ? 1600 : 1100;
  let done = false;
  const trigger = () => { if (!done) { done = true; setTimeout(fireLoaded, MIN); } };
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

// ===== Mobile nav =====
const toggle = document.getElementById('navToggle');
const nav = document.getElementById('primaryNav');
if (toggle && nav) {
  toggle.addEventListener('click', () => nav.classList.toggle('open'));
  nav.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') nav.classList.remove('open');
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
if (announce && sessionStorage.getItem('ralf-announce') !== '1') {
  setTimeout(() => announce.classList.add('show'), 4800);
  const dismiss = () => {
    announce.classList.remove('show');
    sessionStorage.setItem('ralf-announce', '1');
  };
  announce.querySelector('.announce-close')?.addEventListener('click', dismiss);
  announce.querySelector('.announce-btn')?.addEventListener('click', dismiss);
  announce.addEventListener('click', (e) => { if (e.target === announce) dismiss(); });
}

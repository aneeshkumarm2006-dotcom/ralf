// ===== Loader intro =====
const fireLoaded = () => document.body.classList.add('is-loaded');
if (document.getElementById('loader')) {
  // hold the loader briefly so the logo reads, then wipe + reveal hero
  const MIN = document.body.classList.contains('home') ? 1600 : 1100;
  let done = false;
  const trigger = () => { if (!done) { done = true; setTimeout(fireLoaded, MIN); } };
  if (document.readyState === 'complete') trigger();
  else window.addEventListener('load', trigger);
  // safety net in case 'load' never fires (slow images)
  setTimeout(trigger, 2800);
} else {
  fireLoaded();
}

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
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

// ===== House of Ralf collage: scroll-linked parallax (Maybourne-style drift) =====
const houseStage = document.querySelector('.house-stage');
if (houseStage) {
  const photos = [...houseStage.querySelectorAll('.hp')];
  // fade in as each photo enters
  const fadeIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('hp-in'); fadeIO.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  photos.forEach((p) => fadeIO.observe(p));

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isDesktop = () => window.matchMedia('(min-width: 761px)').matches;
  let ticking = false;
  const apply = () => {
    ticking = false;
    if (reduce || !isDesktop()) { photos.forEach((p) => { p.style.transform = ''; }); return; }
    const vh = window.innerHeight;
    const rect = houseStage.getBoundingClientRect();
    // -1..1: how far the section's centre is from the viewport centre
    const progress = ((vh / 2) - (rect.top + rect.height / 2)) / vh;
    photos.forEach((p) => {
      const speed = parseFloat(p.dataset.speed || '0');
      p.style.transform = `translateY(${(progress * speed).toFixed(1)}px)`;
    });
  };
  const requestApply = () => { if (!ticking) { ticking = true; requestAnimationFrame(apply); } };
  window.addEventListener('scroll', requestApply, { passive: true });
  window.addEventListener('resize', requestApply);
  apply();
}

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
  setTimeout(() => announce.classList.add('show'), 2200);
  const dismiss = () => {
    announce.classList.remove('show');
    sessionStorage.setItem('ralf-announce', '1');
  };
  announce.querySelector('.announce-close')?.addEventListener('click', dismiss);
  announce.querySelector('.announce-btn')?.addEventListener('click', dismiss);
  announce.addEventListener('click', (e) => { if (e.target === announce) dismiss(); });
}

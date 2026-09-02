import { Surface } from './surface.js';

const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

/* ── the water ──────────────────────────────────────────── */
const water = new Surface($('#water'), { reduced: RM });

/* ── reading depth: how far down the page you are drives how calm
   the water is. Written to CSS too, so the light follows. */
const root = document.documentElement;
let ticking = false;
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    const max = root.scrollHeight - window.innerHeight;
    const d = max > 0 ? clamp(window.scrollY / max, 0, 1) : 0;
    water.setDepth(d);
    root.style.setProperty('--depth', d.toFixed(3));
    ticking = false;
  });
}
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', onScroll, { passive: true });
onScroll();

/* ── reveal on enter ────────────────────────────────────── */
const revealables = $$('.reveal');
if ('IntersectionObserver' in window && !RM) {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const sibs = [...(e.target.parentElement?.children || [])];
      const idx = Math.max(0, sibs.indexOf(e.target));
      e.target.style.transitionDelay = `${Math.min(idx, 10) * 45}ms`;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.06 });
  revealables.forEach(el => io.observe(el));
} else {
  revealables.forEach(el => el.classList.add('is-in'));
}

/* ── count-up ───────────────────────────────────────────── */
function countUp(el) {
  const to  = parseFloat(el.dataset.to);
  const dec = parseInt(el.dataset.dec || '0', 10);
  const pre = el.dataset.prefix || '';
  const suf = el.dataset.suffix || '';
  const fmt = v => pre + (dec ? v.toFixed(dec) : Math.round(v).toLocaleString('en-US')) + suf;

  if (RM) { el.textContent = fmt(to); return; }
  const t0 = performance.now(), dur = 1500;
  const tick = now => {
    const p = clamp((now - t0) / dur, 0, 1);
    el.textContent = fmt(to * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

const counters = $$('.num');
if ('IntersectionObserver' in window) {
  const cio = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { countUp(e.target); cio.unobserve(e.target); }
  }), { threshold: 0.45 });
  counters.forEach(c => cio.observe(c));
} else counters.forEach(countUp);

/* years hunting — computed from the HackerOne join date, never stale */
{
  const joined = new Date('2020-05-21T15:45:49Z');
  const el = $('#yrs');
  if (el) {
    el.dataset.to = String(Math.floor((Date.now() - joined) / (365.2425 * 864e5)));
    el.classList.add('num');
    if ('IntersectionObserver' in window) {
      const o = new IntersectionObserver(es => es.forEach(e => {
        if (e.isIntersecting) { countUp(e.target); o.unobserve(e.target); }
      }), { threshold: 0.45 });
      o.observe(el);
    } else countUp(el);
  }
}

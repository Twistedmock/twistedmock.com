import { Abyss } from './abyss.js';

const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

/* ── the water ──────────────────────────────────────────── */
const water = new Abyss($('#water'), { reduced: RM });

/* ── descent: scroll drives depth, depth drives everything ──
   Metres are interpolated between the sections' own data-depth
   values, so the gauge always agrees with the section headings. */
const marks = [{ y: 0, m: 0, zone: 'Epipelagic' }].concat(
  $$('section[data-depth]').map(s => ({
    el: s,
    m: +s.dataset.depth,
    zone: s.dataset.zone || '',
  }))
);

const gaugeFill = $('.gauge__rail i');
const gDepth = $('#g-depth');
const gZone  = $('#g-zone');
const deepen = $('.deepen');
const MAXM   = 6000;

function positions() {
  for (const mk of marks) if (mk.el) mk.y = mk.el.offsetTop;
}
positions();
window.addEventListener('resize', () => { positions(); onScroll(); }, { passive: true });

let ticking = false;
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    // measured from the top of the viewport, so the gauge reads 0 m while
    // the hero is still on screen and hits a section's depth as it lands
    const y = window.scrollY;

    // interpolate metres between the two surrounding section marks
    let m = 0;
    for (let i = 0; i < marks.length; i++) {
      const a = marks[i], b = marks[i + 1];
      if (!b) { m = a.m; break; }
      if (y < b.y) {
        const t = clamp((y - a.y) / ((b.y - a.y) || 1), 0, 1);
        m = a.m + (b.m - a.m) * t;
        break;
      }
    }

    const d = clamp(m / MAXM, 0, 1);
    water.setDepth(d);
    if (deepen) deepen.style.opacity = (d * 0.9).toFixed(3);
    if (gaugeFill) gaugeFill.style.height = `${(d * 100).toFixed(1)}%`;
    if (gDepth) gDepth.textContent = Math.round(m).toLocaleString('en-US');
    if (gZone) {
      const zone = m < 200 ? 'Epipelagic' : m < 1000 ? 'Mesopelagic'
                 : m < 4000 ? 'Bathypelagic' : m < 6000 ? 'Abyssopelagic' : 'Hadal';
      if (gZone.textContent !== zone) gZone.textContent = zone;
    }
    ticking = false;
  });
}
window.addEventListener('scroll', onScroll, { passive: true });
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

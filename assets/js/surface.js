/* ══════════════════════════════════════════════════════════════
   THE SURFACE
   A single canvas holding three layers of sunlit water:
     · glints     — soft pools of refracted light, drifting
     · caustics   — the bright web sunlight throws on clear water
     · sparkle    — the fine twinkle of the surface itself
   plus the ripples your pointer leaves. Depth is driven by scroll:
   further down the water is calmer and the light a little softer —
   it never goes dark.
   ══════════════════════════════════════════════════════════════ */

export class Surface {
  constructor(canvas, opts = {}) {
    this.cv  = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });
    this.reduced = !!opts.reduced;

    this.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    this.t = 0;
    this.last = 0;
    this.running = false;
    this.depth = 0;               // 0 = surface, 1 = deepest

    this.pointer = { x: -9e9, y: -9e9, lx: -9e9, ly: -9e9, on: false };
    this.rings = [];              // live ripples: {x, y, r, a, w}

    this.loop = this.loop.bind(this);
    this.makeSprites();
    this.resize();
    this.bind();
    this.reduced ? this.draw() : this.start();
  }

  /* glow sprites drawn once — per-particle gradients every frame are
     far too expensive */
  makeSprites() {
    const mk = (s, stops) => {
      const g = document.createElement('canvas');
      g.width = g.height = s;
      const c = g.getContext('2d');
      const grd = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      stops.forEach(([o, col]) => grd.addColorStop(o, col));
      c.fillStyle = grd;
      c.fillRect(0, 0, s, s);
      return g;
    };
    this.spark = mk(48, [
      [0,    'rgba(255,255,255,1)'],
      [0.22, 'rgba(255,255,255,.85)'],
      [0.5,  'rgba(200,240,250,.25)'],
      [1,    'rgba(180,230,245,0)'],
    ]);
    this.pool = mk(256, [
      [0,    'rgba(255,255,255,.55)'],
      [0.35, 'rgba(180,236,246,.28)'],
      [0.7,  'rgba(120,205,235,.08)'],
      [1,    'rgba(120,205,235,0)'],
    ]);
  }

  resize() {
    const W = this.cv.clientWidth, H = this.cv.clientHeight;
    if (!W || !H) return;
    this.cv.width  = Math.round(W * this.dpr);
    this.cv.height = Math.round(H * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.W = W; this.H = H;
    this.build();
    if (this.reduced) this.draw();
  }

  build() {
    const { W, H } = this;
    const small = W < 760;

    /* ── caustics ─────────────────────────────────────────────
       Wavy strands spread over the whole height. Two sines each,
       drifting at different speeds, so where they cross the light
       pools and separates like it does on a pool floor. */
    const N = this.NCAUS = small ? 9 : 14;
    this.caus = [];
    for (let i = 0; i < N; i++) {
      const t = (i + 0.5) / N;
      this.caus.push({
        base: H * t,
        amp:  22 + Math.random() * 38,
        k1:   0.0035 + Math.random() * 0.0035,
        k2:   0.0080 + Math.random() * 0.0060,
        sp1:  0.00016 + Math.random() * 0.00020,
        sp2:  -(0.00011 + Math.random() * 0.00016),
        ph1:  Math.random() * 99,
        ph2:  Math.random() * 99,
        a:    0.35 + Math.random() * 0.45,
      });
    }

    /* ── sparkle ─────────────────────────────────────────────── */
    const sn = this.NSPARK = small ? 70 : 140;
    this.sp = new Float32Array(sn * 5);      // x, y, phase, rate, size
    for (let i = 0; i < sn; i++) {
      const o = i * 5;
      this.sp[o]     = Math.random() * W;
      this.sp[o + 1] = Math.random() * H;
      this.sp[o + 2] = Math.random() * Math.PI * 2;
      this.sp[o + 3] = 0.0006 + Math.random() * 0.0018;
      this.sp[o + 4] = 1.2 + Math.random() * 2.4;
    }

    /* ── glints ──────────────────────────────────────────────── */
    const gn = small ? 5 : 8;
    this.glints = [];
    for (let i = 0; i < gn; i++) {
      this.glints.push({
        x: Math.random() * W, y: Math.random() * H,
        r: W * (0.10 + Math.random() * 0.14),
        sx: 0.00004 + Math.random() * 0.00008, sy: 0.00003 + Math.random() * 0.00007,
        px: Math.random() * 99, py: Math.random() * 99,
        a: 0.35 + Math.random() * 0.4,
      });
    }
  }

  bind() {
    let rt;
    window.addEventListener('resize', () => {
      clearTimeout(rt); rt = setTimeout(() => this.resize(), 200);
    }, { passive: true });

    if (this.reduced) return;   // still water for anyone who asked for it

    const move = (x, y) => {
      const r = this.cv.getBoundingClientRect();
      this.pointer.x = x - r.left;
      this.pointer.y = y - r.top;
      this.pointer.on = true;
    };
    window.addEventListener('pointermove', e => {
      move(e.clientX, e.clientY);
      // a ripple every few centimetres of travel, not every event
      const p = this.pointer, dx = p.x - p.lx, dy = p.y - p.ly;
      if (dx * dx + dy * dy > 42 * 42) { this.ripple(p.x, p.y, 0.32, 60); p.lx = p.x; p.ly = p.y; }
    }, { passive: true });
    window.addEventListener('pointerdown', e => {
      move(e.clientX, e.clientY);
      this.ripple(this.pointer.x, this.pointer.y, 0.75, 180);
      this.ripple(this.pointer.x, this.pointer.y, 0.45, 120);
      this.ripple(this.pointer.x, this.pointer.y, 0.25, 70);
    }, { passive: true });
    document.addEventListener('pointerleave', () => { this.pointer.on = false; }, { passive: true });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(es => {
        es[0].isIntersecting ? this.start() : this.stop();
      }, { threshold: 0 }).observe(this.cv);
    }
  }

  ripple(x, y, a, max) {
    if (this.rings.length > 60) this.rings.shift();
    this.rings.push({ x, y, r: 2, a, max, w: 1.2 });
  }

  setDepth(d) { this.depth = d < 0 ? 0 : d > 1 ? 1 : d; }

  start() { if (!this.running && !this.reduced) { this.running = true; this.last = 0; requestAnimationFrame(this.loop); } }
  stop()  { this.running = false; }

  loop(now) {
    if (!this.running) return;
    const dt = this.last ? Math.min(now - this.last, 48) : 16;
    this.last = now;
    this.t += dt;
    this.step(dt);
    this.draw();
    requestAnimationFrame(this.loop);
  }

  step(dt) {
    const { W, H } = this;

    // the sparkle drifts, very slowly, like a surface with a breath of wind on it
    const sp = this.sp;
    for (let i = 0; i < this.NSPARK; i++) {
      const o = i * 5;
      sp[o]     += Math.sin(this.t * 0.0003 + sp[o + 2]) * 0.05 + 0.012;
      sp[o + 1] += Math.cos(this.t * 0.00025 + sp[o + 2] * 1.3) * 0.04;
      if (sp[o] > W + 6) sp[o] = -6;
      if (sp[o + 1] < -6) sp[o + 1] = H + 6; else if (sp[o + 1] > H + 6) sp[o + 1] = -6;
    }

    // ripples spread and thin out
    const k = dt / 16.67;
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const g = this.rings[i];
      g.r += (1.6 + g.max * 0.012) * k;
      g.a *= Math.pow(0.955, k);
      if (g.r > g.max || g.a < 0.01) this.rings.splice(i, 1);
    }
  }

  draw() {
    const ctx = this.ctx, { W, H } = this;
    ctx.clearRect(0, 0, W, H);

    // deeper water is calmer and the light softer — but it stays lit
    const lit = 1 - this.depth * 0.55;

    /* ── glints ── */
    ctx.globalCompositeOperation = 'lighter';
    for (const g of this.glints) {
      const x = g.x + Math.sin(this.t * g.sx + g.px) * W * 0.06;
      const y = g.y + Math.cos(this.t * g.sy + g.py) * H * 0.05;
      ctx.globalAlpha = g.a * lit * 0.9;
      ctx.drawImage(this.pool, x - g.r, y - g.r, g.r * 2, g.r * 2);
    }
    ctx.globalAlpha = 1;

    /* ── caustics ──
       Two passes per strand: a wide soft pass for the bloom, and a
       hair-thin bright pass for the edge of the light. */
    const step = W < 760 ? 12 : 9;
    for (let i = 0; i < this.NCAUS; i++) {
      const c = this.caus[i];
      ctx.beginPath();
      for (let x = -20; x <= W + 20; x += step) {
        const y = c.base
          + Math.sin(x * c.k1 + this.t * c.sp1 + c.ph1) * c.amp
          + Math.sin(x * c.k2 + this.t * c.sp2 + c.ph2) * c.amp * 0.45;
        x === -20 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      const a = c.a * lit;
      ctx.strokeStyle = `rgba(255,255,255,${0.10 * a})`;
      ctx.lineWidth = 16;
      ctx.stroke();
      ctx.strokeStyle = `rgba(255,255,255,${0.55 * a})`;
      ctx.lineWidth = 1.1;
      ctx.stroke();
    }

    /* ── sparkle ── */
    const sp = this.sp, spr = this.spark;
    for (let i = 0; i < this.NSPARK; i++) {
      const o = i * 5;
      const tw = (Math.sin(this.t * sp[o + 3] + sp[o + 2]) + 1) * 0.5;
      const e = tw * tw * tw;               // mostly dim, briefly bright
      if (e < 0.05) continue;
      const r = sp[o + 4] * (1 + e * 2.2);
      ctx.globalAlpha = e * 0.85 * lit;
      ctx.drawImage(spr, sp[o] - r, sp[o + 1] - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    /* ── ripples ──
       Drawn as ellipses so they read as rings on a surface seen at an
       angle, not circles painted on a wall. */
    for (const g of this.rings) {
      ctx.beginPath();
      ctx.ellipse(g.x, g.y, g.r, g.r * 0.58, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,255,255,${g.a})`;
      ctx.lineWidth = 2.2;
      ctx.stroke();
      ctx.strokeStyle = `rgba(10,143,168,${g.a * 0.35})`;
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
  }
}

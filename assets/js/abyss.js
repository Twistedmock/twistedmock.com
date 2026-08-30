/* ══════════════════════════════════════════════════════════════
   THE ABYSS
   A single canvas holding four layers of water:
     · light shafts      — sunlight failing through the surface
     · the wave field    — one line per wave, rolling
     · marine snow       — the constant fall of particulate
     · bioluminescence   — plankton that flare when disturbed
   Depth is driven by scroll: the further down, the darker and the
   quieter the water gets.
   ══════════════════════════════════════════════════════════════ */

export class Abyss {
  constructor(canvas, opts = {}) {
    this.cv  = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });
    this.reduced = !!opts.reduced;

    this.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    this.t = 0;
    this.last = 0;
    this.running = false;
    this.depth = 0;               // 0 = surface, 1 = hadal

    this.pointer = { x: -9e9, y: -9e9, px: -9e9, py: -9e9, speed: 0, on: false };

    this.loop = this.loop.bind(this);
    this.makeGlow();
    this.resize();
    this.bind();
    this.start();
  }

  /* a glow sprite, drawn once — per-particle radial gradients are far
     too expensive to build every frame */
  makeGlow() {
    const s = 64;
    const g = document.createElement('canvas');
    g.width = g.height = s;
    const c = g.getContext('2d');
    const grd = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    grd.addColorStop(0,    'rgba(190,255,244,1)');
    grd.addColorStop(0.18, 'rgba(96,236,212,.85)');
    grd.addColorStop(0.45, 'rgba(52,190,190,.28)');
    grd.addColorStop(1,    'rgba(40,150,170,0)');
    c.fillStyle = grd;
    c.fillRect(0, 0, s, s);
    this.glow = g;
  }

  resize() {
    const W = this.cv.clientWidth, H = this.cv.clientHeight;
    if (!W || !H) return;
    this.cv.width  = Math.round(W * this.dpr);
    this.cv.height = Math.round(H * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.W = W; this.H = H;
    this.build();
  }

  build() {
    const { W, H } = this;
    const small = W < 760;

    /* ── the wave field ──────────────────────────────────────
       Lines bunch toward the horizon and spread toward the viewer,
       so the field reads as distance rather than stripes. */
    this.horizon = H * 0.30;
    const N = this.NWAVES = small ? 22 : 34;
    this.waves = [];
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      const p = Math.pow(t, 1.75);
      this.waves.push({
        base: this.horizon + (H - this.horizon * 0.55) * p,
        amp:  (2.5 + p * 26) * (small ? 0.7 : 1),
        k1:   (0.0042 + Math.random() * 0.0034) / (0.45 + p),
        k2:   (0.0091 + Math.random() * 0.0062) / (0.45 + p),
        sp1:  0.00019 + Math.random() * 0.00021,
        sp2:  -(0.00013 + Math.random() * 0.00017),
        ph1:  Math.random() * 99,
        ph2:  Math.random() * 99,
        near: p,
      });
    }

    /* ── marine snow ─────────────────────────────────────── */
    const sn = this.NSNOW = small ? 90 : 190;
    this.snow = new Float32Array(sn * 5);   // x, y, vy, drift, size
    for (let i = 0; i < sn; i++) {
      const o = i * 5;
      this.snow[o]     = Math.random() * W;
      this.snow[o + 1] = Math.random() * H;
      this.snow[o + 2] = 0.09 + Math.random() * 0.24;
      this.snow[o + 3] = Math.random() * 99;
      this.snow[o + 4] = 0.5 + Math.random() * 1.7;
    }

    /* ── plankton ────────────────────────────────────────── */
    const pn = this.NPLANK = small ? 150 : 300;
    this.pk = new Float32Array(pn * 6);     // x, y, energy, phase, size, drift
    for (let i = 0; i < pn; i++) {
      const o = i * 6;
      this.pk[o]     = Math.random() * W;
      this.pk[o + 1] = Math.random() * H;
      this.pk[o + 2] = 0;
      this.pk[o + 3] = Math.random() * Math.PI * 2;
      this.pk[o + 4] = 0.8 + Math.random() * 2.2;
      this.pk[o + 5] = 0.2 + Math.random() * 0.6;
    }

    /* ── light shafts ────────────────────────────────────── */
    const ln = small ? 4 : 7;
    this.shafts = [];
    for (let i = 0; i < ln; i++) {
      this.shafts.push({
        x: (i + 0.5) / ln * W + (Math.random() - 0.5) * W * 0.1,
        w: W * (0.035 + Math.random() * 0.075),
        lean: (Math.random() - 0.5) * 0.5,
        sp: 0.00007 + Math.random() * 0.00011,
        ph: Math.random() * 99,
        a: 0.05 + Math.random() * 0.07,
      });
    }
  }

  bind() {
    let rt;
    window.addEventListener('resize', () => {
      clearTimeout(rt); rt = setTimeout(() => this.resize(), 200);
    }, { passive: true });

    const move = (x, y) => {
      const r = this.cv.getBoundingClientRect();
      this.pointer.x = x - r.left;
      this.pointer.y = y - r.top;
      this.pointer.on = true;
    };
    window.addEventListener('pointermove', e => move(e.clientX, e.clientY), { passive: true });
    window.addEventListener('pointerdown', e => { move(e.clientX, e.clientY); this.burst(); }, { passive: true });
    document.addEventListener('pointerleave', () => { this.pointer.on = false; }, { passive: true });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(es => {
        es[0].isIntersecting ? this.start() : this.stop();
      }, { threshold: 0 }).observe(this.cv);
    }
  }

  /* a click lights up everything nearby at once */
  burst() {
    const { pk, NPLANK } = this;
    const R = 260, R2 = R * R;
    for (let i = 0; i < NPLANK; i++) {
      const o = i * 6;
      const dx = pk[o] - this.pointer.x, dy = pk[o + 1] - this.pointer.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < R2) pk[o + 2] = Math.min(1, pk[o + 2] + (1 - d2 / R2) * 1.4);
    }
  }

  setDepth(d) { this.depth = d < 0 ? 0 : d > 1 ? 1 : d; }

  start() { if (!this.running) { this.running = true; this.last = 0; requestAnimationFrame(this.loop); } }
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
    const p = this.pointer;

    // pointer speed drives how hard the plankton flare
    const dx = p.x - p.px, dy = p.y - p.py;
    p.speed = Math.min(1, Math.sqrt(dx * dx + dy * dy) / 26);
    p.px = p.x; p.py = p.y;

    // marine snow falls
    const sn = this.snow;
    for (let i = 0; i < this.NSNOW; i++) {
      const o = i * 5;
      sn[o + 1] += sn[o + 2] * dt * 0.06;
      sn[o]     += Math.sin(this.t * 0.0004 + sn[o + 3]) * 0.05;
      if (sn[o + 1] > H + 6) { sn[o + 1] = -6; sn[o] = Math.random() * W; }
    }

    // plankton: drift, decay, and flare when the pointer disturbs them
    const pk = this.pk;
    const R = 150, R2 = R * R;
    const on = p.on;
    const decay = Math.pow(0.965, dt / 16.67);
    for (let i = 0; i < this.NPLANK; i++) {
      const o = i * 6;
      pk[o + 1] += Math.sin(this.t * 0.0003 + pk[o + 3]) * 0.06 - 0.012 * pk[o + 5];
      pk[o]     += Math.cos(this.t * 0.00022 + pk[o + 3] * 1.7) * 0.07;

      if (pk[o + 1] < -8) pk[o + 1] = H + 8;
      if (pk[o] < -8) pk[o] = W + 8; else if (pk[o] > W + 8) pk[o] = -8;

      pk[o + 2] *= decay;

      if (on) {
        const ddx = pk[o] - p.x, ddy = pk[o + 1] - p.y;
        const d2 = ddx * ddx + ddy * ddy;
        if (d2 < R2) {
          const f = (1 - d2 / R2);
          pk[o + 2] = Math.min(1, pk[o + 2] + f * f * (0.06 + p.speed * 0.32));
          // nudge them away from the disturbance
          const d = Math.sqrt(d2) || 1;
          pk[o]     += (ddx / d) * f * 0.7;
          pk[o + 1] += (ddy / d) * f * 0.7;
        }
      }
    }
  }

  draw() {
    const ctx = this.ctx, { W, H } = this;
    ctx.clearRect(0, 0, W, H);

    // everything dims as the water deepens
    const lit = 1 - this.depth;

    /* ── light shafts ── */
    if (lit > 0.02) {
      ctx.globalCompositeOperation = 'lighter';
      // Three nested wedges per shaft — a narrow bright core inside wider,
      // fainter ones. Stacked, the edges feather out like light in water
      // instead of reading as a flat polygon.
      const LAYERS = [[1.0, 0.30], [0.58, 0.34], [0.26, 0.40]];
      for (const s of this.shafts) {
        const sway = Math.sin(this.t * s.sp + s.ph) * W * 0.03;
        const x = s.x + sway;
        const len = H * (0.55 + 0.35 * lit);
        const lean = s.lean * 140;
        for (const [wide, aMul] of LAYERS) {
          const topW = s.w * 0.4 * wide, botW = s.w * 2.3 * wide;
          const a = s.a * lit * aMul;
          const g = ctx.createLinearGradient(x, 0, x + lean, len);
          g.addColorStop(0,    `rgba(150,235,235,${a})`);
          g.addColorStop(0.35, `rgba(90,200,215,${a * 0.45})`);
          g.addColorStop(1,    'rgba(60,150,180,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.moveTo(x - topW, 0);
          ctx.lineTo(x + topW, 0);
          ctx.lineTo(x + botW + lean, len);
          ctx.lineTo(x - botW + lean, len);
          ctx.closePath();
          ctx.fill();
        }
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    /* ── the wave field ──
       Two passes per line: a wide soft pass for the glow, a hair-thin
       bright pass for the crest. Cheaper and cleaner than shadowBlur. */
    const step = W < 760 ? 12 : 9;
    for (let i = 0; i < this.NWAVES; i++) {
      const w = this.waves[i];
      const fade = (0.16 + w.near * 0.84) * (0.30 + lit * 0.70);

      ctx.beginPath();
      for (let x = -20; x <= W + 20; x += step) {
        const y = w.base
          + Math.sin(x * w.k1 + this.t * w.sp1 + w.ph1) * w.amp
          + Math.sin(x * w.k2 + this.t * w.sp2 + w.ph2) * w.amp * 0.42;
        x === -20 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      // Deliberately faint: this is the water, not the content. The named
      // programs draw their own waves and must be the brighter thing.
      ctx.strokeStyle = `rgba(64,196,196,${0.032 * fade})`;
      ctx.lineWidth = 5 + w.near * 7;
      ctx.stroke();
      ctx.strokeStyle = `rgba(158,240,232,${0.155 * fade})`;
      ctx.lineWidth = 0.7 + w.near * 0.5;
      ctx.stroke();
    }

    /* ── marine snow ── */
    const sn = this.snow;
    ctx.fillStyle = `rgba(196,228,236,${0.13 + lit * 0.10})`;
    for (let i = 0; i < this.NSNOW; i++) {
      const o = i * 5;
      ctx.fillRect(sn[o], sn[o + 1], sn[o + 4], sn[o + 4]);
    }

    /* ── bioluminescence ── */
    const pk = this.pk, glow = this.glow;
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < this.NPLANK; i++) {
      const o = i * 6;
      const e = pk[o + 2];
      if (e < 0.012) continue;
      const r = (5 + e * 26) * pk[o + 4] * 0.6;
      ctx.globalAlpha = Math.min(1, e * 1.15);
      ctx.drawImage(glow, pk[o] - r, pk[o + 1] - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
}

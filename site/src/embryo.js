// ─── Живой эмбрион: анимация развития, привязанная к прокрутке ────────────────
// Стадии: ооцит → оплодотворение → зигота → 2 → 4 → 8 клеток → морула →
// бластоциста → хетчинг. Деления — настоящая «физика» клеток внутри зоны.
const Embryo = (() => {
  const STAGES = ['oocyte', 'fert', 'zygote', 'c2', 'c4', 'c8', 'morula', 'blast', 'hatch'];
  const COUNT = { oocyte: 1, fert: 1, zygote: 1, c2: 2, c4: 4, c8: 8, morula: 16, blast: 30, hatch: 30 };
  let cv, ctx, W = 0, H = 0, DPR = 1, raf = 0, t0 = 0, last = 0;
  let stage = 'oocyte', stageT = 0, cells = [], sperm = [], mouse = { x: -1e4, y: -1e4 }, scrollY = 0, visible = true;
  const E = { x: 0, y: 0, R: 100, tx: 0, ty: 0, tR: 100, zona: 1, breach: 0, out: 0, cavity: 0, pn: 0, compact: 0, alpha: 1 };
  let onStage = () => {};

  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const lerp = (a, b, k) => a + (b - a) * k;

  function mkCell(x, y, r) {
    const gran = Array.from({ length: 14 }, () => { const a = rnd() * 6.283, d = Math.sqrt(rnd()) * 0.75; return [Math.cos(a) * d, Math.sin(a) * d, 0.03 + rnd() * 0.05]; });
    return { x, y, vx: 0, vy: 0, r, tr: r, gran, nuc: rnd() * 6.283, role: 'c', tx: null, ty: null, flat: 0 };
  }

  function layout() {
    const wide = W >= 980;
    E.tx = wide ? W * 0.735 : W * 0.5;
    E.ty = wide ? H * 0.53 : Math.min(H * 0.3, 280);
    E.tR = wide ? Math.min(H * 0.29, W * 0.19) : Math.min(W * 0.36, H * 0.21);
    if (!E.R || E.R === 100) { E.x = E.tx; E.y = E.ty; E.R = E.tR; }
  }
  function resize() {
    DPR = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    cv.width = W * DPR; cv.height = H * DPR; cv.style.width = W + 'px'; cv.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    layout();
  }

  // ── стадии: деление / слияние клеток и целевые позиции
  function setStage(s) {
    if (s === stage || !STAGES.includes(s)) return;
    const prev = stage; stage = s; stageT = 0; onStage(s);
    const n = COUNT[s];
    if (s === 'blast' || s === 'hatch') {
      while (cells.length < n) { const c = cells[(rnd() * cells.length) | 0]; const d = mkCell(c.x + (rnd() - 0.5) * 0.05, c.y + (rnd() - 0.5) * 0.05, c.r * 0.8); cells.push(d); }
      const te = n - 9;
      cells.forEach((c, i) => {
        if (i < te) { const a = (i / te) * Math.PI * 2; c.role = 'te'; c.tx = Math.cos(a) * 0.74; c.ty = Math.sin(a) * 0.74; c.tr = 0.13; c.ang = a; }
        else { const k = i - te, a = 2.35 + (k % 3 - 1) * 0.22, rr = 0.5 - Math.floor(k / 3) * 0.13; c.role = 'icm'; c.tx = Math.cos(a) * rr; c.ty = Math.sin(a) * rr; c.tr = 0.12; }
      });
      return;
    }
    cells.forEach((c) => { c.role = 'c'; c.tx = c.ty = null; });
    if (cells.length < n) {
      while (cells.length < n) {
        const src = cells.slice(); for (const c of src) {
          if (cells.length >= n) break;
          const a = rnd() * 6.283, off = c.r * 0.3, ca = Math.cos(a), sa = Math.sin(a);
          const nr = c.r / Math.cbrt(2);
          c.x -= ca * off * 0.5; c.y -= sa * off * 0.5; c.tr = nr; c.r = Math.max(nr, c.r * 0.92);
          const d = mkCell(c.x + ca * off, c.y + sa * off, c.r); d.tr = nr; d.vx = ca * 0.002; d.vy = sa * 0.002; cells.push(d);
        }
      }
    } else if (cells.length > n) {
      while (cells.length > n) { const a = cells.pop(); const b = cells[cells.length - 1 - ((rnd() * Math.min(3, cells.length - 1)) | 0)] || cells[0]; b.x = (a.x + b.x) / 2; b.y = (a.y + b.y) / 2; }
    }
    const base = { oocyte: 0.8, fert: 0.8, zygote: 0.8, c2: 0.8 / Math.cbrt(2), c4: 0.8 / Math.cbrt(4), c8: 0.8 / Math.cbrt(8), morula: 0.8 / Math.cbrt(16) * 0.95 }[s];
    cells.forEach((c) => { c.tr = base; });
    if (n === 1) { cells[0].x *= 0.3; cells[0].y *= 0.3; }
    void prev;
  }

  // ── физика клеток (единица — радиус зоны)
  function step(dt) {
    const k = Math.min(1, dt * 60);
    const inner = s => (s === 'blast' || s === 'hatch' ? 0.9 : 0.86);
    const lim = inner(stage);
    const overlapAllow = stage === 'morula' ? 0.6 : 0.82;
    const mx = (mouse.x - E.x) / E.R, my = (mouse.y - E.y) / E.R;
    for (const c of cells) {
      c.r += (c.tr - c.r) * 0.06 * k;
      if (c.tx != null) { c.vx += (c.tx - c.x) * 0.012 * k; c.vy += (c.ty - c.y) * 0.012 * k; c.flat += ((c.role === 'te' ? 1 : 0) - c.flat) * 0.05 * k; }
      else { c.flat += (0 - c.flat) * 0.05 * k; c.vx -= c.x * (stage === 'morula' ? 0.004 : 0.0016) * k; c.vy -= c.y * (stage === 'morula' ? 0.004 : 0.0016) * k; }
      const dmx = c.x - mx, dmy = c.y - my, dm = Math.hypot(dmx, dmy);
      if (dm < 0.35 && dm > 1e-4) { c.vx += (dmx / dm) * 0.0016 * k; c.vy += (dmy / dm) * 0.0016 * k; }
    }
    if (stage !== 'blast' && stage !== 'hatch') {
      for (let i = 0; i < cells.length; i++) for (let j = i + 1; j < cells.length; j++) {
        const a = cells[i], b = cells[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1e-4, min = (a.r + b.r) * overlapAllow;
        if (d < min) { const f = ((min - d) / min) * 0.02 * k, ux = dx / d, uy = dy / d; a.vx -= ux * f; a.vy -= uy * f; b.vx += ux * f; b.vy += uy * f; }
      }
    }
    for (const c of cells) {
      c.vx *= 0.86; c.vy *= 0.86; c.x += c.vx * k; c.y += c.vy * k;
      const d = Math.hypot(c.x, c.y), maxd = Math.max(0, lim - c.r * (c.role === 'te' ? 0.4 : 1));
      if (d > maxd) { c.x *= maxd / d; c.y *= maxd / d; }
    }
  }

  // ── сперматозоиды фона
  function mkSperm() {
    const a = rnd() * 6.283;
    return { x: rnd() * W, y: rnd() * H, a, v: 26 + rnd() * 30, ph: rnd() * 6.283, turn: (rnd() - 0.5) * 0.6, len: 26 + rnd() * 10, s: 0.7 + rnd() * 0.5 };
  }
  function updateSperm(dt, t) {
    const target = stage === 'fert';
    for (const s of sperm) {
      let want = s.a + Math.sin(t * 0.7 + s.ph) * s.turn * dt;
      if (target) { const dx = E.x - s.x, dy = E.y - s.y, d = Math.hypot(dx, dy); if (d > E.R * 1.02) { const aim = Math.atan2(dy, dx); const diff = Math.atan2(Math.sin(aim - s.a), Math.cos(aim - s.a)); want = s.a + diff * Math.min(1, dt * 1.5); } else { s.a += Math.PI * 0.6 * dt; } }
      const dmx = s.x - mouse.x, dmy = s.y - mouse.y, dm = Math.hypot(dmx, dmy);
      if (dm < 110) { const away = Math.atan2(dmy, dmx); want = s.a + Math.atan2(Math.sin(away - s.a), Math.cos(away - s.a)) * 0.12; }
      s.a = want;
      const sp = s.v * (target ? 1.35 : 1);
      s.x += Math.cos(s.a) * sp * dt; s.y += Math.sin(s.a) * sp * dt;
      if (s.x < -60) s.x = W + 60; if (s.x > W + 60) s.x = -60; if (s.y < -60) s.y = H + 60; if (s.y > H + 60) s.y = -60;
    }
  }
  function drawSperm(t) {
    ctx.lineCap = 'round';
    for (const s of sperm) {
      const ca = Math.cos(s.a), sa = Math.sin(s.a);
      ctx.strokeStyle = 'rgba(11,42,138,.28)'; ctx.lineWidth = 1.1 * s.s; ctx.beginPath();
      for (let i = 0; i <= 14; i++) {
        const u = i / 14, back = u * s.len * s.s, wave = Math.sin(u * 7 - t * 14 + s.ph) * 4.5 * u * s.s;
        const x = s.x - ca * back - sa * wave, y = s.y - sa * back + ca * wave;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
      ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.a); ctx.fillStyle = 'rgba(11,42,138,.45)';
      ctx.beginPath(); ctx.ellipse(1.5 * s.s, 0, 3.6 * s.s, 2.3 * s.s, 0, 0, 6.283); ctx.fill(); ctx.restore();
    }
  }

  // ── сетка счётной камеры (как у Маклера: 10 × 10), с параллаксом
  function drawGrid() {
    const step = 46, off = -(scrollY * 0.15) % step;
    ctx.lineWidth = 1;
    for (let i = -1, x = 0; x < W + step; i++, x = i * step) { ctx.strokeStyle = i % 10 === 0 ? 'rgba(31,79,255,.075)' : 'rgba(31,79,255,.035)'; ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); ctx.stroke(); }
    let j = Math.floor(-off / step) - 1;
    for (let y = off - step; y < H + step; y += step, j++) { const gi = Math.round((y - off) / step + scrollY * 0.15 / step); ctx.strokeStyle = gi % 10 === 0 ? 'rgba(31,79,255,.075)' : 'rgba(31,79,255,.035)'; ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); ctx.stroke(); }
  }

  // ── отрисовка эмбриона
  function drawCell(c, R, t, alpha) {
    const x = c.x * R, y = c.y * R, r = c.r * R;
    ctx.save(); ctx.translate(x, y);
    if (c.flat > 0.01) { const a = Math.atan2(c.y, c.x); ctx.rotate(a); ctx.scale(1 - 0.45 * c.flat, 1); }
    const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
    g.addColorStop(0, `rgba(255,255,255,${0.98 * alpha})`); g.addColorStop(0.7, `rgba(226,238,255,${0.94 * alpha})`); g.addColorStop(1, `rgba(176,205,255,${0.92 * alpha})`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.283); ctx.fill();
    ctx.strokeStyle = `rgba(31,79,255,${(stage === 'morula' ? 0.18 : 0.38) * alpha})`; ctx.lineWidth = Math.max(1, R * 0.006); ctx.stroke();
    ctx.fillStyle = `rgba(11,42,138,${0.16 * alpha})`;
    for (const [gx, gy, gr] of c.gran) { ctx.beginPath(); ctx.arc(gx * r, gy * r, Math.max(0.6, gr * r), 0, 6.283); ctx.fill(); }
    if (cells.length > 1 && cells.length <= 16 && c.role === 'c') {
      ctx.strokeStyle = `rgba(31,79,255,${0.22 * alpha})`; ctx.lineWidth = Math.max(1, R * 0.004);
      ctx.beginPath(); ctx.arc(Math.cos(c.nuc) * r * 0.15, Math.sin(c.nuc) * r * 0.15, r * 0.28, 0, 6.283); ctx.stroke();
    }
    ctx.restore();
  }
  function drawEmbryo(t) {
    const R = E.R;
    ctx.save(); ctx.translate(E.x, E.y); ctx.globalAlpha = E.alpha;
    const breathe = REDUCED ? 1 : 1 + Math.sin(t * 0.9) * 0.006; ctx.scale(breathe, breathe);
    // мягкое свечение
    const glow = ctx.createRadialGradient(0, 0, R * 0.5, 0, 0, R * 1.55);
    glow.addColorStop(0, 'rgba(56,198,244,.16)'); glow.addColorStop(1, 'rgba(56,198,244,0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, 0, R * 1.55, 0, 6.283); ctx.fill();
    // зона пеллюцида (с брешью при хетчинге)
    const zIn = (stage === 'blast' || stage === 'hatch' ? 0.93 : 0.86) * R, zOut = R * (stage === 'blast' || stage === 'hatch' ? 0.985 : 1);
    const gap = E.breach, ga = -0.7;
    const zg = ctx.createRadialGradient(0, 0, zIn, 0, 0, zOut);
    zg.addColorStop(0, 'rgba(31,79,255,.10)'); zg.addColorStop(0.5, 'rgba(56,198,244,.22)'); zg.addColorStop(1, 'rgba(31,79,255,.14)');
    ctx.fillStyle = zg; ctx.beginPath(); ctx.arc(0, 0, zOut, ga + gap, ga - gap + 6.283); ctx.arc(0, 0, zIn, ga - gap + 6.283, ga + gap, true); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(31,79,255,.30)'; ctx.lineWidth = Math.max(1, R * 0.006);
    for (const rr of [zOut, zIn]) { ctx.beginPath(); ctx.arc(0, 0, rr, ga + gap, ga - gap + 6.283); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(31,79,255,.08)';
    for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.arc(0, 0, zIn + (zOut - zIn) * (i / 4), ga + gap, ga - gap + 6.283); ctx.stroke(); }
    // перивителлиновое пространство и полярные тельца
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.arc(0, 0, zIn, 0, 6.283); ctx.fill();
    const pbN = stage === 'oocyte' || stage === 'fert' ? 1 : (stage === 'zygote' || stage === 'c2' || stage === 'c4') ? 2 : 0;
    for (let i = 0; i < pbN; i++) { const a = -1.05 + i * 0.32; drawCell({ x: Math.cos(a) * 0.79, y: Math.sin(a) * 0.79, r: 0.065, gran: [], role: 'pb', flat: 0, nuc: 0 }, R, t, 0.9); }
    // полость бластоцисты
    if (E.cavity > 0.01) {
      const cg = ctx.createRadialGradient(R * 0.1, R * 0.05, R * 0.05, 0, 0, R * 0.78);
      cg.addColorStop(0, `rgba(232,246,255,${0.9 * E.cavity})`); cg.addColorStop(1, `rgba(196,228,255,${0.8 * E.cavity})`);
      ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(0, 0, R * 0.78, 0, 6.283); ctx.fill();
    }
    // клетки: при хетчинге часть эмбриона выходит через брешь
    ctx.save();
    if (E.out > 0.001) ctx.translate(Math.cos(ga) * R * 0.32 * E.out, Math.sin(ga) * R * 0.32 * E.out);
    const ordered = cells.slice().sort((a, b) => (a.role === 'icm') - (b.role === 'icm') || a.y - b.y);
    for (const c of ordered) drawCell(c, R, t, 1);
    ctx.restore();
    // пронуклеусы зиготы
    if (E.pn > 0.01 && cells.length === 1) {
      const c = cells[0];
      for (const s of [-1, 1]) {
        const px = c.x * R + s * R * 0.13, py = c.y * R + 0.02 * R, pr = R * 0.12 * E.pn;
        ctx.fillStyle = `rgba(240,248,255,${0.95 * E.pn})`; ctx.strokeStyle = `rgba(31,79,255,${0.45 * E.pn})`; ctx.lineWidth = Math.max(1, R * 0.006);
        ctx.beginPath(); ctx.arc(px, py, pr, 0, 6.283); ctx.fill(); ctx.stroke();
        ctx.fillStyle = `rgba(31,79,255,${0.45 * E.pn})`;
        for (let k = 0; k < 4; k++) { const a = k * 1.7 + s; ctx.beginPath(); ctx.arc(px + Math.cos(a) * pr * 0.45, py + Math.sin(a) * pr * 0.45, pr * 0.13, 0, 6.283); ctx.fill(); }
      }
    }
    ctx.restore();
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!visible) return;
    const t = (now - t0) / 1000, dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now; stageT += dt;
    // плавное позиционирование
    E.x = lerp(E.x, E.tx, 0.08); E.y = lerp(E.y, E.ty, 0.08); E.R = lerp(E.R, E.tR, 0.08);
    E.pn = lerp(E.pn, stage === 'zygote' ? 1 : 0, 0.05);
    E.cavity = lerp(E.cavity, stage === 'blast' || stage === 'hatch' ? 1 : 0, 0.03);
    E.breach = lerp(E.breach, stage === 'hatch' ? 0.42 : 0, 0.03);
    E.out = lerp(E.out, stage === 'hatch' ? 1 : 0, 0.02);
    if (!REDUCED) step(dt); else for (let i = 0; i < 4; i++) step(0.05);
    if (!REDUCED) updateSperm(dt, t);
    ctx.clearRect(0, 0, W, H);
    drawGrid();
    drawSperm(t);
    drawEmbryo(t);
  }

  return {
    STAGES,
    init(canvas, cb) {
      cv = canvas; ctx = cv.getContext('2d'); onStage = cb || onStage;
      resize(); addEventListener('resize', resize);
      addEventListener('pointermove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
      addEventListener('scroll', () => { scrollY = window.scrollY; }, { passive: true });
      document.addEventListener('visibilitychange', () => { visible = !document.hidden; });
      cells = [mkCell(0, 0, 0.8)];
      const n = W < 700 ? 9 : 18; sperm = Array.from({ length: n }, mkSperm);
      t0 = last = performance.now(); raf = requestAnimationFrame(frame);
      return true;
    },
    setStage,
    get stage() { return stage; },
    get geom() { return { x: E.tx, y: E.ty, R: E.tR }; },
    pause(v) { visible = !v; },
  };
})();

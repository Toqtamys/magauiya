// ─── Сцена «путешествие сквозь клетку» ──────────────────────────────────────
// Девять сцен от сперматозоидов до белка. Положение pos (0…8) задаёт прокрутка:
// между соседними сценами камера «влетает» в следующую — текущая растёт и гаснет,
// следующая вырастает из точки фокуса. Шкала масштаба и подпись — в углах кадра.
const Stage = (() => {
  const C = { ground: '#071740', deep: '#0b2160', mid: '#12307a', soft: '#1c3f96', line: '#7fa7ff', ice: '#dce8ff', white: '#ffffff', cyan: '#38c6f4', blue: '#1f4fff', brown: '#d38b45' };
  let cv, g, W = 0, H = 0, dpr = 1, U = 1;
  let pos = 0, target = 0, auto = false, running = true, visible = true, last = 0, time = 0, raf = 0;
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  const TAU = Math.PI * 2;
  const rnd = (() => { let a = 1234567; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();
  const ease = (x) => x * x * (3 - 2 * x);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  // ── постоянные данные сцен (раскладки), чтобы кадры не «прыгали»
  const sperm = Array.from({ length: 16 }, () => ({ x: rnd() * 2.4 - 1.2, y: rnd() * 1.8 - 0.9, a: rnd() * TAU, v: 0.06 + rnd() * 0.06, ph: rnd() * TAU, turn: (rnd() - 0.5) * 0.4 }));
  const ring = Array.from({ length: 9 }, (_, i) => ({ a: (i / 9) * TAU + rnd() * 0.3, ph: rnd() * TAU, d: 1.18 + rnd() * 0.25 }));
  const granules = Array.from({ length: 90 }, () => { const r = Math.sqrt(rnd()) * 0.66, a = rnd() * TAU; return { x: Math.cos(a) * r, y: Math.sin(a) * r, s: 0.006 + rnd() * 0.01 }; });
  const tissue = (() => {
    const out = [], cols = 13, rows = 11;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = (c - cols / 2 + (r % 2) * 0.5) * 0.24 + (rnd() - 0.5) * 0.05, y = (r - rows / 2) * 0.21 + (rnd() - 0.5) * 0.05;
      out.push({ x, y, s: 0.105 + rnd() * 0.02, rot: rnd() * TAU, nx: (rnd() - 0.5) * 0.03, ny: (rnd() - 0.5) * 0.03, tone: rnd(), mit: rnd() < 0.05 });
    }
    return out;
  })();
  const chromos = Array.from({ length: 7 }, (_, i) => ({ x: Math.cos(i * 0.9) * (0.25 + (i % 3) * 0.2), y: Math.sin(i * 1.7) * 0.45, a: rnd() * Math.PI, len: 0.32 + rnd() * 0.22, cen: 0.35 + rnd() * 0.3, bands: Array.from({ length: 9 }, () => rnd()) }));
  const fibres = Array.from({ length: 70 }, () => ({ a: rnd() * TAU, r: 0.15 + rnd() * 0.55, l: 0.05 + rnd() * 0.12, w: rnd() }));
  const prot = (() => {   // глобула из плотно упакованных атомов с карманом справа
    const pts = [];
    let tries = 0;
    while (pts.length < 230 && tries++ < 20000) {
      const x = rnd() * 2 - 1, y = rnd() * 2 - 1, z = rnd() * 2 - 1;
      const r = Math.hypot(x / 0.95, y / 0.78, z / 0.8);
      const w = 1 + 0.12 * Math.sin(Math.atan2(y, x) * 5) ;
      if (r > 0.82 * w) continue;
      if (Math.hypot(x - 0.62, y + 0.05) < 0.36 && z > -0.6) continue;           // карман
      if (pts.some((p) => (p.x - x) ** 2 + (p.y - y) ** 2 + (p.z - z) ** 2 < 0.0165)) continue;
      pts.push({ x, y, z, c: rnd() });
    }
    return pts;
  })();

  // ── рисование
  function spermAt(x, y, a, ph, s, alpha = 1) {
    g.save(); g.translate(x, y); g.rotate(a); g.globalAlpha *= alpha;
    g.strokeStyle = C.cyan; g.lineWidth = Math.max(1, s * 0.09); g.lineCap = 'round';
    g.beginPath(); g.moveTo(-s * 0.55, 0);
    for (let i = 1; i <= 18; i++) { const u = i / 18; g.lineTo(-s * 0.55 - u * s * 2.6, Math.sin(ph - u * 7) * s * 0.28 * u); }
    g.stroke();
    g.fillStyle = C.white; g.beginPath(); g.ellipse(0, 0, s * 0.55, s * 0.36, 0, 0, TAU); g.fill();
    g.fillStyle = C.ice; g.beginPath(); g.ellipse(-s * 0.62, 0, s * 0.24, s * 0.12, 0, 0, TAU); g.fill();
    g.restore();
  }
  function cell(x, y, r, nucleus = true, tone = C.soft) {
    g.fillStyle = tone; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    g.strokeStyle = C.line; g.lineWidth = Math.max(1, r * 0.04); g.stroke();
    if (nucleus) { g.fillStyle = C.ice; g.globalAlpha *= 0.9; g.beginPath(); g.arc(x + r * 0.12, y - r * 0.08, r * 0.28, 0, TAU); g.fill(); g.globalAlpha /= 0.9; g.fillStyle = C.blue; g.beginPath(); g.arc(x + r * 0.16, y - r * 0.1, r * 0.08, 0, TAU); g.fill(); }
  }
  function zona(R, w) { g.strokeStyle = C.line; g.lineWidth = w; g.globalAlpha *= 0.55; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.stroke(); g.globalAlpha /= 0.55; g.strokeStyle = C.ice; g.lineWidth = Math.max(1, w * 0.12); g.beginPath(); g.arc(0, 0, R + w / 2, 0, TAU); g.stroke(); g.beginPath(); g.arc(0, 0, R - w / 2, 0, TAU); g.stroke(); }

  const SCENE = [
    // 0 · сперматозоиды
    (t) => {
      for (const s of sperm) {
        const x = ((s.x + Math.cos(s.a) * s.v * t + 3.6) % 2.4) - 1.2, y = ((s.y + Math.sin(s.a) * s.v * t + 2.7) % 1.8) - 0.9;
        spermAt(x * U * 1.15, y * U * 1.1, s.a + Math.sin(t * 0.5 + s.ph) * s.turn, t * 9 + s.ph, U * 0.07);
      }
    },
    // 1 · ооцит, сперматозоиды у зоны
    (t) => {
      const R = U * 0.78;
      for (const p of ring) {
        const pull = 0.5 + 0.5 * Math.sin(t * 0.6 + p.ph), d = R * (p.d - 0.12 * pull);
        spermAt(Math.cos(p.a) * d, Math.sin(p.a) * d, p.a + Math.PI, t * 10 + p.ph, U * 0.06);
      }
      zona(R, U * 0.09);
      g.fillStyle = C.mid; g.beginPath(); g.arc(0, 0, R * 0.84, 0, TAU); g.fill();
      for (const q of granules) { g.fillStyle = C.soft; g.beginPath(); g.arc(q.x * U, q.y * U, q.s * U, 0, TAU); g.fill(); }
      g.fillStyle = C.ice; g.beginPath(); g.arc(R * 0.62, -R * 0.55, U * 0.06, 0, TAU); g.fill();          // полярное тельце
      const pn = 0.5 + 0.5 * Math.sin(t * 0.8);
      for (const k of [-1, 1]) { g.fillStyle = C.deep; g.beginPath(); g.arc(k * U * (0.09 + 0.01 * pn), 0, U * 0.085, 0, TAU); g.fill(); g.strokeStyle = C.cyan; g.lineWidth = 1.5; g.stroke(); g.fillStyle = C.cyan; g.beginPath(); g.arc(k * U * 0.1, -U * 0.02, U * 0.018, 0, TAU); g.fill(); }
    },
    // 2 · дробление, 4 бластомера
    (t) => {
      const R = U * 0.8; zona(R, U * 0.06);
      const b = 0.03 * Math.sin(t * 0.9);
      const cs = [[-0.27, -0.22], [0.25, -0.25], [-0.24, 0.27], [0.28, 0.23]];
      g.save(); g.rotate(t * 0.05);
      cs.forEach(([x, y], i) => cell(x * U * (1 + b), y * U * (1 + b), U * (0.36 + (i % 2) * 0.03), true, i % 2 ? C.soft : C.mid));
      g.fillStyle = C.line; for (let i = 0; i < 5; i++) { const a = i * 1.3 + 0.4; g.beginPath(); g.arc(Math.cos(a) * U * 0.55, Math.sin(a) * U * 0.56, U * 0.035, 0, TAU); g.fill(); }
      g.restore();
    },
    // 3 · бластоциста
    (t) => {
      const R = U * 0.82, br = 1 + 0.02 * Math.sin(t * 0.7);
      g.save(); g.scale(br, br); zona(R, U * 0.035);
      g.fillStyle = C.deep; g.beginPath(); g.arc(0, 0, R * 0.95, 0, TAU); g.fill();
      const n = 26;
      for (let i = 0; i < n; i++) { const a = (i / n) * TAU; g.save(); g.translate(Math.cos(a) * R * 0.88, Math.sin(a) * R * 0.88); g.rotate(a + Math.PI / 2); g.fillStyle = i % 2 ? C.soft : C.mid; g.beginPath(); g.ellipse(0, 0, R * 0.13, R * 0.055, 0, 0, TAU); g.fill(); g.strokeStyle = C.line; g.lineWidth = 1.2; g.stroke(); g.fillStyle = C.ice; g.beginPath(); g.ellipse(0, 0, R * 0.04, R * 0.022, 0, 0, TAU); g.fill(); g.restore(); }
      for (let i = 0; i < 9; i++) { const a = -0.9 + (i % 3) * 0.32, rr = R * (0.55 + Math.floor(i / 3) * 0.11); cell(Math.cos(a) * rr - R * 0.05, Math.sin(a) * rr, R * 0.12, true, i % 2 ? C.soft : C.mid); }
      g.restore();
    },
    // 4 · ткань
    (t) => {
      g.save(); g.translate(Math.sin(t * 0.1) * U * 0.05, Math.cos(t * 0.08) * U * 0.04);
      for (const c of tissue) {
        const x = c.x * U * 1.3, y = c.y * U * 1.3, s = c.s * U * 1.3;
        g.fillStyle = c.tone < 0.5 ? C.mid : C.deep; g.beginPath();
        for (let k = 0; k < 6; k++) { const a = c.rot + (k / 6) * TAU; const rr = s * (0.92 + 0.08 * Math.sin(k * 2.1 + c.tone * 9)); k ? g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
        g.closePath(); g.fill(); g.strokeStyle = C.soft; g.lineWidth = 2; g.stroke();
        if (c.mit) { g.strokeStyle = C.cyan; g.lineWidth = 3; g.beginPath(); g.moveTo(x - s * 0.35, y); g.lineTo(x + s * 0.35, y); g.stroke(); }
        else { g.fillStyle = c.tone > 0.85 ? C.brown : C.line; g.beginPath(); g.ellipse(x + c.nx * U, y + c.ny * U, s * 0.4, s * 0.3, c.rot, 0, TAU); g.fill(); }
      }
      g.restore();
    },
    // 5 · ядро
    (t) => {
      const R = U * 0.8;
      g.fillStyle = C.mid; g.beginPath(); g.ellipse(0, 0, R, R * 0.9, 0, 0, TAU); g.fill();
      g.strokeStyle = C.line; g.lineWidth = U * 0.025; g.stroke();
      g.fillStyle = C.ground; for (let i = 0; i < 28; i++) { const a = (i / 28) * TAU; g.beginPath(); g.arc(Math.cos(a) * R, Math.sin(a) * R * 0.9, U * 0.014, 0, TAU); g.fill(); }
      g.strokeStyle = C.cyan; g.lineCap = 'round';
      for (const f of fibres) { const a = f.a + t * 0.04 * (f.w - 0.5); const x = Math.cos(a) * f.r * U, y = Math.sin(a) * f.r * U * 0.85; g.lineWidth = 1 + f.w * 2.5; g.globalAlpha = 0.5 + f.w * 0.5; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + f.l * U, y - f.l * U * 0.6, x + f.l * U * 0.4, y + f.l * U); g.stroke(); }
      g.globalAlpha = 1; g.fillStyle = C.ice; g.beginPath(); g.ellipse(-R * 0.25, R * 0.2, U * 0.12, U * 0.1, 0.4, 0, TAU); g.fill();
    },
    // 6 · хромосомы с исчерченностью
    (t) => {
      for (const c of chromos) {
        g.save(); g.translate(c.x * U, c.y * U); g.rotate(c.a + Math.sin(t * 0.3 + c.x * 3) * 0.08);
        const L = c.len * U, w = U * 0.075;
        for (const side of [-1, 1]) {
          g.save(); g.rotate(side * 0.16);
          g.fillStyle = C.ice; g.beginPath(); g.roundRect(-w / 2, -L * c.cen, w, L, w / 2); g.fill();
          c.bands.forEach((b, i) => { if (b < 0.45) return; g.fillStyle = b > 0.8 ? C.blue : C.line; const y = -L * c.cen + (i + 0.5) * (L / 9.5); g.fillRect(-w / 2, y, w, L / 22 + b * L / 30); });
          g.restore();
        }
        g.fillStyle = C.cyan; g.beginPath(); g.arc(0, 0, w * 0.45, 0, TAU); g.fill();
        g.restore();
      }
    },
    // 7 · двойная спираль
    (t) => {
      const len = U * 2.2, amp = U * 0.32, n = 34, ph = t * 0.9;
      g.save(); g.rotate(-0.35);
      for (let i = 0; i < n; i++) {
        const x = -len / 2 + (i / (n - 1)) * len, a = ph + i * 0.55, y1 = Math.sin(a) * amp, y2 = Math.sin(a + Math.PI) * amp, z = Math.cos(a);
        g.strokeStyle = [C.cyan, C.line, C.blue, C.ice][i % 4]; g.lineWidth = U * 0.022; g.globalAlpha = 0.45 + 0.4 * Math.abs(z);
        g.beginPath(); g.moveTo(x, y1); g.lineTo(x, y2); g.stroke();
      }
      g.globalAlpha = 1;
      for (const off of [0, Math.PI]) {
        g.strokeStyle = off ? C.ice : C.white; g.lineWidth = U * 0.045; g.lineCap = 'round'; g.beginPath();
        for (let i = 0; i <= 120; i++) { const x = -len / 2 + (i / 120) * len, a = ph + (i / 120) * (n - 1) * 0.55 + off; i ? g.lineTo(x, Math.sin(a) * amp) : g.moveTo(x, Math.sin(a) * amp); }
        g.stroke();
      }
      g.restore();
    },
    // 8 · белок и лиганд
    (t) => {
      const s = U * 0.95, rot = t * 0.18, ca = Math.cos(Math.sin(rot) * 0.35), sa = Math.sin(Math.sin(rot) * 0.35);
      const P = prot.map((p) => { const x = p.x * ca + p.z * sa, z = -p.x * sa + p.z * ca; return { x, y: p.y, z, c: p.c }; }).sort((a, b) => a.z - b.z);
      for (const p of P) {
        const r = s * (0.072 + 0.018 * p.z);
        g.fillStyle = p.c < 0.12 ? C.cyan : p.c < 0.2 ? C.ice : p.z > 0.35 ? C.line : p.z > -0.2 ? C.soft : C.mid;
        g.beginPath(); g.arc(p.x * s, p.y * s, r, 0, TAU); g.fill();
        g.strokeStyle = C.ground; g.lineWidth = 1.2; g.stroke();
      }
      // лиганд в кармане: кольцо и боковая группа, слегка «дышит»
      const lx = s * (0.6 + 0.04 * Math.sin(t * 0.9)), ly = -s * 0.05;
      g.save(); g.translate(lx, ly); g.rotate(Math.sin(t * 0.5) * 0.4);
      const rr = s * 0.085;
      g.strokeStyle = C.white; g.lineWidth = 4; g.lineJoin = 'round'; g.beginPath();
      for (let k = 0; k <= 6; k++) { const a = (k / 6) * TAU + Math.PI / 6; k ? g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      g.stroke(); g.beginPath(); g.moveTo(rr, 0); g.lineTo(rr * 1.9, 0); g.lineTo(rr * 2.4, rr * 0.8); g.stroke();
      g.fillStyle = C.brown; g.beginPath(); g.arc(rr * 2.4, rr * 0.8, rr * 0.32, 0, TAU); g.fill();
      g.fillStyle = C.cyan; g.beginPath(); g.arc(-rr, 0, rr * 0.28, 0, TAU); g.fill();
      g.restore();
    },
  ];
  // куда «влетает» камера в каждой сцене (в долях U)
  const FOCUS = [[0, 0], [0.1, 0], [0.25, -0.25], [-0.3, 0], [0, 0], [0, 0], [0.12, 0.05], [0, 0], [0, 0]];
  const ZOOM = 2.6;

  function fmtScale(um) {
    if (um >= 1) return `${um >= 10 ? Math.round(um) : um.toFixed(1)} µm`;
    const nm = um * 1000; return `${nm >= 10 ? Math.round(nm) : nm.toFixed(1)} nm`;
  }

  function frame(now) {
    raf = 0;
    if (!running || !visible) return;
    const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now; time += dt;
    if (auto) target = (target + dt * 0.12) % (SCENE.length - 0.001);
    pos += (target - pos) * Math.min(1, dt * 3.2);
    if (auto && target < pos - 1) pos = target;
    mouse.x += (mouse.tx - mouse.x) * 0.05; mouse.y += (mouse.ty - mouse.y) * 0.05;
    draw();
    raf = requestAnimationFrame(frame);
  }
  function draw() {
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = C.ground; g.fillRect(0, 0, W, H);
    const i = Math.floor(clamp(pos, 0, SCENE.length - 1)), f = clamp(pos - i, 0, 1), j = Math.min(SCENE.length - 1, i + 1);
    const cx = W / 2 + mouse.x * 14, cy = H / 2 + mouse.y * 10;
    const layer = (k, scale, alpha) => {
      if (alpha <= 0.01) return;
      const [fx, fy] = FOCUS[k];
      g.save(); g.globalAlpha = alpha; g.translate(cx, cy); g.scale(scale, scale); g.translate(-fx * U * (scale - 1) / scale, -fy * U * (scale - 1) / scale);
      SCENE[k](time); g.restore();
    };
    if (i === j || f < 0.001) layer(i, 1, 1);
    else {
      const e = ease(f);
      layer(i, Math.exp(e * ZOOM), 1 - ease(clamp((f - 0.35) / 0.55, 0, 1)));
      layer(j, Math.exp((e - 1) * ZOOM * 0.6), ease(clamp((f - 0.25) / 0.6, 0, 1)));
    }
    // подпись и шкала масштаба
    const k = f < 0.5 ? i : j, sc = SCENES[k];
    const um = Math.exp(Math.log(SCENES[i].um) * (1 - f) + Math.log(SCENES[j].um) * f);
    const pad = Math.max(16, Math.min(28, W * 0.03));
    g.globalAlpha = 1; g.font = `500 ${W < 520 ? 14 : 16}px Onest, system-ui, sans-serif`; g.textBaseline = 'top';
    const name = tr(sc.name), tw = g.measureText(name).width, bar = 100 * (U / 300), lab = fmtScale(um * (U / 300));
    g.fillStyle = C.ground; g.fillRect(pad - 10, pad - 8, tw + 20, 36);
    g.fillRect(pad - 10, H - pad - 40, Math.max(bar, g.measureText(lab).width) + 20, 48);
    g.fillStyle = C.white; g.fillText(name, pad, pad);
    g.fillRect(pad, H - pad - 6, bar, 6);
    g.textBaseline = 'bottom'; g.fillText(lab, pad, H - pad - 14);
  }
  function resize() {
    const b = cv.getBoundingClientRect(); dpr = Math.min(2, devicePixelRatio || 1);
    W = Math.max(1, b.width); H = Math.max(1, b.height); cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    U = Math.min(W, H) * 0.45; draw();
  }
  function kick() { if (g && !raf && running && visible) { last = 0; raf = requestAnimationFrame(frame); } }

  return {
    init(canvas) {
      cv = canvas; g = cv.getContext('2d');
      resize(); addEventListener('resize', resize);
      new ResizeObserver(resize).observe(cv);
      addEventListener('pointermove', (e) => { mouse.tx = e.clientX / innerWidth - 0.5; mouse.ty = e.clientY / innerHeight - 0.5; }, { passive: true });
      document.addEventListener('visibilitychange', () => { visible = !document.hidden; kick(); });
      if ('IntersectionObserver' in window) new IntersectionObserver((es) => { visible = es[0].isIntersecting && !document.hidden; kick(); }).observe(cv);
      if (REDUCED) { running = false; draw(); return; }
      kick();
    },
    set(p) { target = clamp(p, 0, SCENE.length - 1); if (REDUCED && g) { pos = Math.round(target); draw(); } kick(); },
    setAuto(on) { auto = on; kick(); },
    pause(on) { running = !on; if (!on) kick(); },
    redraw() { if (g) draw(); },
    get count() { return SCENE.length; },
  };
})();

// ─── Небо BOPASI: взгляд вверх между неоновыми небоскрёбами ────────────────
// Общий фон для сайта и офлайн-файла. Один холст на весь экран, под содержимым.
// При входе «поднимаем голову»: стены домов уходят к краям, проступают звёзды.
// Небо медленно вращается вокруг зенита; прокрутка поворачивает его и уводит дома вниз.
// 21 яркая звезда — инструменты BOPASI, связанные в созвездия по разделам.
function createSky(canvas, opts = {}) {
  const groups = opts.groups || [21];                  // сколько инструментов в каждом разделе
  let labels = opts.labels || [];
  const reduced = !!opts.reduced;
  const TAU = Math.PI * 2;
  const g = canvas.getContext('2d');
  const towersCv = document.createElement('canvas'), tg = towersCv.getContext('2d');
  const bgCv = document.createElement('canvas'), bg = bgCv.getContext('2d');
  let W = 0, H = 0, dpr = 1, Z = { x: 0, y: 0 }, R = 1, small = false;
  let raf = 0, t0 = performance.now(), last = t0, rot = 0, focus = -1, focusA = 0, towersD = -1, flick = 0, alive = true;
  const shoot = { t: -1, x: 0, y: 0, a: 0, next: 3 };
  let seed = 20260617;
  const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };

  // звёзды в полярных координатах вокруг зенита — небо вращается целиком
  const stars = Array.from({ length: 520 }, () => ({ r: Math.sqrt(rnd()), a: rnd() * TAU, s: rnd() < 0.08 ? 1.6 + rnd() : 0.5 + rnd() * 0.9, tw: rnd() * TAU, sp: 0.6 + rnd() * 2.2, hue: rnd() }));
  // созвездия инструментов: каждый раздел — своя дуга вокруг зенита
  const total = groups.reduce((a, b) => a + b, 0);
  const tools = [];
  { let k = 0; groups.forEach((n, gi) => {
    const ca = (gi / groups.length) * TAU + 0.35, cr = 0.2 + (gi % 2) * 0.16;
    for (let j = 0; j < n; j++) {
      const a = ca + (j - (n - 1) / 2) * (0.34 / Math.max(1, n / 3)) + (rnd() - 0.5) * 0.12;
      tools.push({ i: k++, g: gi, a, r: cr + (rnd() - 0.5) * 0.12 + (j % 2) * 0.05, ph: rnd() * TAU });
    }
  }); }
  // небоскрёбы по кругу кадра: основание у края экрана, крыши смотрят в зенит
  const towers = [];
  { let a = rnd() * 0.3; while (a < TAU - 0.12) { const w = 0.1 + rnd() * 0.12; towers.push({ a: a + w / 2, w, h: 0.26 + rnd() * 0.24, neon: rnd() < 0.5 ? 'c' : 'm', sign: rnd() < 0.35, win: rnd() }); a += w + 0.035 + rnd() * 0.06; } }
  const drones = Array.from({ length: 4 }, () => ({ x: rnd(), y: rnd(), vx: (rnd() - 0.5) * 0.012, vy: (rnd() - 0.5) * 0.008, ph: rnd() * TAU }));

  const NEON = { c: '46,242,255', m: '255,43,214', y: '255,214,90' };

  function resize() {
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    small = W < 700;
    for (const c of [canvas, towersCv, bgCv]) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    Z = { x: W / 2, y: H * 0.46 }; R = Math.hypot(W, H) * 0.62;
    paintBg(); towersD = -1;
  }

  // фон: ночной градиент, туманности и розовое зарево города снизу
  function paintBg() {
    bg.setTransform(dpr, 0, 0, dpr, 0, 0);
    const lg = bg.createLinearGradient(0, 0, 0, H);
    lg.addColorStop(0, '#03020c'); lg.addColorStop(0.45, '#0a0628'); lg.addColorStop(0.8, '#1b0b4a'); lg.addColorStop(1, '#3a0f5e');
    bg.fillStyle = lg; bg.fillRect(0, 0, W, H);
    const neb = (x, y, r, c, a) => { const rg = bg.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, `rgba(${c},${a})`); rg.addColorStop(1, `rgba(${c},0)`); bg.fillStyle = rg; bg.fillRect(0, 0, W, H); };
    neb(W * 0.5, H * 1.08, Math.max(W, H) * 0.7, NEON.m, 0.28);
    neb(W * 0.18, H * 0.2, Math.max(W, H) * 0.45, '108,60,255', 0.18);
    neb(W * 0.85, H * 0.35, Math.max(W, H) * 0.4, NEON.c, 0.1);
    neb(Z.x, Z.y, Math.min(W, H) * 0.35, '120,90,255', 0.12);
  }

  // точка на краю кадра по лучу из зенита
  function edge(a) {
    const dx = Math.cos(a), dy = Math.sin(a), m = 40;
    const tx = dx > 0 ? (W + m - Z.x) / dx : dx < 0 ? (-m - Z.x) / dx : Infinity;
    const ty = dy > 0 ? (H + m - Z.y) / dy : dy < 0 ? (-m - Z.y) / dy : Infinity;
    const k = Math.min(tx, ty); return { x: Z.x + dx * k, y: Z.y + dy * k };
  }
  const lerp = (p, q, u) => ({ x: p.x + (q.x - p.x) * u, y: p.y + (q.y - p.y) * u });

  // дома рисуются в отдельный слой и обновляются, только когда меняется «наклон головы»
  function paintTowers(D, tick) {
    tg.setTransform(dpr, 0, 0, dpr, 0, 0); tg.clearRect(0, 0, W, H);
    for (const tw of towers) {
      const a1 = tw.a - tw.w / 2, a2 = tw.a + tw.w / 2;
      const B1 = edge(a1), B2 = edge(a2);
      const reach = Math.min(0.97, tw.h * D);
      const T1 = lerp(B1, Z, reach), T2 = lerp(B2, Z, reach);
      // корпус
      const gr = tg.createLinearGradient((B1.x + B2.x) / 2, (B1.y + B2.y) / 2, (T1.x + T2.x) / 2, (T1.y + T2.y) / 2);
      gr.addColorStop(0, 'rgba(4,2,14,.97)'); gr.addColorStop(1, 'rgba(18,10,48,.94)');
      tg.fillStyle = gr; tg.beginPath(); tg.moveTo(B1.x, B1.y); tg.lineTo(B2.x, B2.y); tg.lineTo(T2.x, T2.y); tg.lineTo(T1.x, T1.y); tg.closePath(); tg.fill();
      // окна: сетка в перспективе, ближе к крыше — мельче
      const rows = small ? 9 : 15, cols = small ? 3 : 5;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const h = Math.sin((r * 12.9898 + c * 78.233 + tw.win * 437.5) * 43758.5453); const lit = h - Math.floor(h);
        if (lit < 0.55) continue;
        const u = 0.06 + (r / rows) * 0.9, v = 0.15 + (c / (cols - 1 || 1)) * 0.7;
        const p = lerp(lerp(B1, B2, v), lerp(T1, T2, v), u);
        const s = Math.max(1.2, 5.5 * (1 - u * 0.75) * (small ? 0.7 : 1));
        const on = lit > 0.93 ? (Math.sin(tick * 0.9 + lit * 50) > -0.2) : true;
        if (!on) continue;
        const col = lit > 0.86 ? NEON.m : lit > 0.72 ? NEON.c : NEON.y;
        tg.fillStyle = `rgba(${col},${0.25 + (lit - 0.55) * 1.3})`; tg.fillRect(p.x - s / 2, p.y - s / 2, s, s * 1.3);
      }
      // неоновое ребро и карниз
      const nc = NEON[tw.neon];
      tg.save(); tg.shadowColor = `rgba(${nc},.9)`; tg.shadowBlur = 14; tg.strokeStyle = `rgba(${nc},.85)`; tg.lineWidth = 1.6;
      tg.beginPath(); tg.moveTo(B1.x, B1.y); tg.lineTo(T1.x, T1.y); tg.lineTo(T2.x, T2.y); tg.stroke();
      if (tw.sign) {   // вертикальная вывеска вдоль фасада
        const s1 = lerp(lerp(B1, B2, 0.78), lerp(T1, T2, 0.78), 0.22), s2 = lerp(lerp(B1, B2, 0.78), lerp(T1, T2, 0.78), 0.55);
        tg.lineWidth = small ? 3 : 5; tg.strokeStyle = `rgba(${tw.neon === 'c' ? NEON.m : NEON.c},${0.65 + 0.3 * Math.sin(tick * 2 + tw.win * 9)})`;
        tg.beginPath(); tg.moveTo(s1.x, s1.y); tg.lineTo(s2.x, s2.y); tg.stroke();
      }
      tg.restore();
    }
  }

  function starAt(rn, a) { const rr = rn * R; return { x: Z.x + Math.cos(a) * rr, y: Z.y + Math.sin(a) * rr * 0.92 }; }

  function frame(now) {
    if (!alive) return;
    if (small && !reduced && now - last < 30) { raf = requestAnimationFrame(frame); return; }   // телефоны: ~30 кадров в секунду
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const t = (now - t0) / 1000;
    const sy = window.scrollY || 0;
    const intro = reduced ? 1 : Math.min(1, t / 2.6), ei = 1 - Math.pow(1 - intro, 3);
    rot += dt * 0.006;
    const turn = rot + sy * 0.00035 + (1 - ei) * 0.35;
    // «наклон головы»: на входе стены почти закрывают небо, потом расходятся; прокрутка уводит их ещё дальше
    const D = (2.3 - 1.3 * ei) * (1 - Math.min(sy / (H * 3), 0.6));
    const tick = Math.floor(t * 2);
    if (Math.abs(D - towersD) > 0.004 || tick !== flick) { paintTowers(D, t); towersD = D; flick = tick; }

    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.drawImage(bgCv, 0, 0, W, H);
    // звёзды
    const sa = ei;
    for (const s of stars) {
      const p = starAt(s.r, s.a + turn);
      if (p.x < -4 || p.y < -4 || p.x > W + 4 || p.y > H + 4) continue;
      const tw = reduced ? 0.8 : 0.55 + 0.45 * Math.sin(t * s.sp + s.tw);
      g.globalAlpha = sa * tw * (s.s > 1.5 ? 1 : 0.8);
      g.fillStyle = s.hue < 0.12 ? '#9ef9ff' : s.hue < 0.2 ? '#ffb3f1' : '#ffffff';
      const z = s.s * (small ? 0.85 : 1); g.fillRect(p.x - z / 2, p.y - z / 2, z, z);
    }
    g.globalAlpha = 1;
    // кольцо прицела в зените
    const hr = Math.min(W, H) * 0.3;
    g.save(); g.translate(Z.x, Z.y); g.rotate(turn * 2);
    g.strokeStyle = `rgba(${NEON.c},${0.14 * sa})`; g.lineWidth = 1; g.setLineDash([3, 9]);
    g.beginPath(); g.arc(0, 0, hr, 0, TAU); g.stroke(); g.setLineDash([]);
    for (let k = 0; k < 24; k++) { const a = (k / 24) * TAU, l = k % 6 === 0 ? 14 : 6; g.beginPath(); g.moveTo(Math.cos(a) * hr, Math.sin(a) * hr); g.lineTo(Math.cos(a) * (hr + l), Math.sin(a) * (hr + l)); g.stroke(); }
    g.restore();
    // созвездия инструментов
    const mR = Math.min(W, H) / R * 1.05;
    const pos = tools.map((s) => starAt(s.r * mR, s.a + turn * 1.0));
    focusA += ((focus >= 0 ? 1 : 0) - focusA) * Math.min(1, dt * 8);
    g.lineWidth = 1;
    for (let k = 1; k < tools.length; k++) if (tools[k].g === tools[k - 1].g) {
      const on = focus >= 0 && tools[focus].g === tools[k].g;
      g.strokeStyle = on ? `rgba(${NEON.m},${0.7 * sa})` : `rgba(${NEON.c},${0.28 * sa})`;
      g.beginPath(); g.moveTo(pos[k - 1].x, pos[k - 1].y); g.lineTo(pos[k].x, pos[k].y); g.stroke();
    }
    tools.forEach((s, k) => {
      const p = pos[k], f = k === focus, pulse = reduced ? 1 : 0.75 + 0.25 * Math.sin(t * 2.2 + s.ph);
      const rad = (small ? 9 : 13) * pulse * (f ? 1.9 : 1);
      const rg = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad);
      rg.addColorStop(0, `rgba(255,255,255,${sa})`); rg.addColorStop(0.25, `rgba(${f ? NEON.m : NEON.c},${0.8 * sa})`); rg.addColorStop(1, `rgba(${f ? NEON.m : NEON.c},0)`);
      g.fillStyle = rg; g.beginPath(); g.arc(p.x, p.y, rad, 0, TAU); g.fill();
      g.strokeStyle = `rgba(255,255,255,${0.7 * sa})`; g.beginPath();   // лучи-блики
      const fl = rad * 1.5; g.moveTo(p.x - fl, p.y); g.lineTo(p.x + fl, p.y); g.moveTo(p.x, p.y - fl); g.lineTo(p.x, p.y + fl); g.stroke();
      if (f && labels[k]) {
        g.globalAlpha = focusA; g.font = `600 ${small ? 11 : 13}px "IBM Plex Mono", ui-monospace, monospace`;
        const tx = p.x + 18, ty = p.y - 18, txt = labels[k].toUpperCase(), w = g.measureText(txt).width;
        g.strokeStyle = `rgba(${NEON.m},.9)`; g.beginPath(); g.moveTo(p.x + 6, p.y - 6); g.lineTo(tx, ty + 6); g.stroke();
        g.fillStyle = 'rgba(5,3,15,.82)'; g.fillRect(tx, ty - 12, w + 16, 24);
        g.strokeRect(tx, ty - 12, w + 16, 24);
        g.fillStyle = '#fff'; g.fillText(txt, tx + 8, ty + 5); g.globalAlpha = 1;
      }
    });
    // падающая звезда
    if (!reduced) {
      shoot.next -= dt;
      if (shoot.t < 0 && shoot.next <= 0) { shoot.t = 0; shoot.x = W * (0.2 + Math.random() * 0.6); shoot.y = H * (0.05 + Math.random() * 0.3); shoot.a = Math.PI * (0.15 + Math.random() * 0.2) * (Math.random() < 0.5 ? 1 : -1) + (Math.random() < 0.5 ? 0 : Math.PI); shoot.next = 5 + Math.random() * 7; }
      if (shoot.t >= 0) {
        shoot.t += dt; const k = shoot.t / 0.9; if (k > 1) shoot.t = -1; else {
          const L = 160 * (1 - Math.abs(k - 0.5) * 1.2), hx = shoot.x + Math.cos(shoot.a) * k * 420, hy = shoot.y + Math.abs(Math.sin(shoot.a)) * k * 300;
          const lg = g.createLinearGradient(hx, hy, hx - Math.cos(shoot.a) * L, hy - Math.abs(Math.sin(shoot.a)) * L);
          lg.addColorStop(0, 'rgba(255,255,255,.95)'); lg.addColorStop(1, `rgba(${NEON.c},0)`);
          g.strokeStyle = lg; g.lineWidth = 2; g.beginPath(); g.moveTo(hx, hy); g.lineTo(hx - Math.cos(shoot.a) * L, hy - Math.abs(Math.sin(shoot.a)) * L); g.stroke();
        }
      }
      // дроны с мигающими огнями
      for (const d of drones) {
        d.x = (d.x + d.vx * dt + 1) % 1; d.y = (d.y + d.vy * dt + 1) % 1;
        const x = d.x * W, y = d.y * H * 0.7, b = Math.sin(t * 6 + d.ph) > 0.6;
        g.fillStyle = `rgba(255,70,90,${b ? 0.95 : 0.25})`; g.fillRect(x - 1.5, y - 1.5, 3, 3);
        g.fillStyle = `rgba(${NEON.c},${b ? 0.25 : 0.8})`; g.fillRect(x + 5, y - 1, 2, 2);
      }
    }
    // дома поверх звёзд
    g.drawImage(towersCv, 0, 0, W, H);
    if (!reduced) raf = requestAnimationFrame(frame);
  }

  const onResize = () => { resize(); if (reduced) frame(performance.now()); };
  const onVis = () => { cancelAnimationFrame(raf); if (!document.hidden && !reduced) { last = performance.now(); raf = requestAnimationFrame(frame); } };
  const onScroll = () => { if (reduced) frame(performance.now()); };
  resize();
  addEventListener('resize', onResize); document.addEventListener('visibilitychange', onVis); addEventListener('scroll', onScroll, { passive: true });
  raf = requestAnimationFrame(frame);
  return {
    focus(i) { focus = typeof i === 'number' && i >= 0 && i < total ? i : -1; if (reduced) frame(performance.now()); },
    setLabels(l) { labels = l || []; },
    destroy() { alive = false; cancelAnimationFrame(raf); removeEventListener('resize', onResize); document.removeEventListener('visibilitychange', onVis); removeEventListener('scroll', onScroll); },
  };
}

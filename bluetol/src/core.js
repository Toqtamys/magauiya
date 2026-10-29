// ===== BlueTol analysis core (shared by test harness and page) =====
const TB = (() => {
  const DEF = { work: 1300, loose: 14, seed: 30, hueT: 212, darkR: 55, minPale: 0.2, minAsym: 0.15 };

  function rgb2hue(r, g, b) {
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    if (d === 0) return 0;
    let h;
    if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
    h *= 60; return h < 0 ? h + 360 : h;
  }
  function median(arr) { const a = Float32Array.from(arr).sort(); return a.length ? a[a.length >> 1] : 0; }

  // background red channel via block medians + bilinear
  function background(R, G, B, w, h) {
    const bs = 16, bw = Math.ceil(w / bs), bh = Math.ceil(h / bs);
    const out = [new Float32Array(bw * bh), new Float32Array(bw * bh), new Float32Array(bw * bh)];
    const chans = [R, G, B];
    for (let by = 0; by < bh; by++) for (let bx = 0; bx < bw; bx++) {
      for (let c = 0; c < 3; c++) {
        const v = [];
        for (let y = by * bs; y < Math.min(h, by * bs + bs); y += 2) for (let x = bx * bs; x < Math.min(w, bx * bs + bs); x += 2) v.push(chans[c][y * w + x]);
        out[c][by * bw + bx] = median(v);
      }
    }
    // large-window median over blocks (robust against cells): radius 6 blocks
    const sm = out.map(o => {
      const r = new Float32Array(bw * bh), rad = 6;
      for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
        const v = [];
        for (let j = Math.max(0, y - rad); j <= Math.min(bh - 1, y + rad); j++) for (let i = Math.max(0, x - rad); i <= Math.min(bw - 1, x + rad); i++) v.push(o[j * bw + i]);
        // upper-half median: background is the brightest dominant component
        const s = Float32Array.from(v).sort(); r[y * bw + x] = s[Math.floor(s.length * 0.6)];
      }
      return r;
    });
    const res = sm.map(() => new Float32Array(w * h));
    for (let y = 0; y < h; y++) {
      const fy = Math.min(bh - 1.001, Math.max(0, (y + 0.5) / bs - 0.5)), y0 = Math.floor(fy), ty = fy - y0, y1 = Math.min(bh - 1, y0 + 1);
      for (let x = 0; x < w; x++) {
        const fx = Math.min(bw - 1.001, Math.max(0, (x + 0.5) / bs - 0.5)), x0 = Math.floor(fx), tx = fx - x0, x1 = Math.min(bw - 1, x0 + 1);
        for (let c = 0; c < 3; c++) {
          const o = sm[c];
          res[c][y * w + x] = (o[y0 * bw + x0] * (1 - tx) + o[y0 * bw + x1] * tx) * (1 - ty) + (o[y1 * bw + x0] * (1 - tx) + o[y1 * bw + x1] * tx) * ty;
        }
      }
    }
    return res;
  }

  function morph(m, w, h, dil, it) {
    let a = m;
    for (let k = 0; k < it; k++) {
      const b = new Uint8Array(w * h);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        let v = dil ? 0 : 1;
        for (let j = -1; j <= 1 && (dil ? !v : v); j++) for (let i = -1; i <= 1; i++) {
          const yy = y + j, xx = x + i;
          const p = (yy < 0 || yy >= h || xx < 0 || xx >= w) ? 0 : a[yy * w + xx];
          if (dil && p) { v = 1; break; } if (!dil && !p) { v = 0; break; }
        }
        b[y * w + x] = v;
      }
      a = b;
    }
    return a;
  }
  function fillHoles(m, w, h) {
    const out = new Uint8Array(w * h), st = [];
    for (let x = 0; x < w; x++) { st.push(x, (h - 1) * w + x); }
    for (let y = 0; y < h; y++) { st.push(y * w, y * w + w - 1); }
    const ext = new Uint8Array(w * h);
    while (st.length) {
      const p = st.pop(); if (ext[p] || m[p]) continue; ext[p] = 1;
      const x = p % w, y = (p / w) | 0;
      if (x > 0) st.push(p - 1); if (x < w - 1) st.push(p + 1); if (y > 0) st.push(p - w); if (y < h - 1) st.push(p + w);
    }
    for (let i = 0; i < w * h; i++) out[i] = ext[i] ? 0 : 1;
    return out;
  }
  function components(m, w, h, minArea) {
    const lab = new Int32Array(w * h), comps = []; let n = 0;
    for (let i = 0; i < w * h; i++) {
      if (!m[i] || lab[i]) continue;
      n++; const px = [], st = [i]; lab[i] = n;
      while (st.length) {
        const p = st.pop(); px.push(p);
        const x = p % w, y = (p / w) | 0;
        for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1])
          if (q >= 0 && m[q] && !lab[q]) { lab[q] = n; st.push(q); }
      }
      if (px.length >= minArea) comps.push(px);
    }
    return comps;
  }

  // split a merged blob: erode until >=2 sizeable cores, then grow back
  function splitBlob(px, w) {
    let xs = px.map(p => p % w), ys = px.map(p => (p / w) | 0);
    const x0 = Math.min(...xs) - 1, y0 = Math.min(...ys) - 1, bw = Math.max(...xs) - x0 + 2, bh = Math.max(...ys) - y0 + 2;
    let m = new Uint8Array(bw * bh);
    px.forEach((p, k) => m[(ys[k] - y0) * bw + xs[k] - x0] = 1);
    const orig = m;
    for (let it = 1; it <= 25; it++) {
      m = morph(m, bw, bh, false, 1);
      const cores = components(m, bw, bh, Math.max(6, px.length * 0.006));
      if (!cores.length) break;
      if (cores.length >= 2) {
        const owner = new Int32Array(bw * bh).fill(-1); let q = [];
        cores.forEach((c, ci) => c.forEach(p => { owner[p] = ci; q.push(p); }));
        while (q.length) {
          const nq = [];
          for (const p of q) {
            const x = p % bw, y = (p / bw) | 0;
            for (const r of [x > 0 ? p - 1 : -1, x < bw - 1 ? p + 1 : -1, y > 0 ? p - bw : -1, y < bh - 1 ? p + bw : -1])
              if (r >= 0 && orig[r] && owner[r] < 0) { owner[r] = owner[p]; nq.push(r); }
          }
          q = nq;
        }
        const parts = cores.map(() => []);
        for (let i = 0; i < bw * bh; i++) if (owner[i] >= 0) parts[owner[i]].push((y0 + ((i / bw) | 0)) * w + x0 + (i % bw));
        return parts.filter(p => p.length > px.length * 0.08);
      }
    }
    return [px];
  }

  function analyze(img, opt) {
    const o = Object.assign({}, DEF, opt || {});
    const { width: W0, height: H0, data } = img;
    const s = Math.min(1, o.work / W0), w = Math.round(W0 * s), h = Math.round(H0 * s);
    const R = new Float32Array(w * h), G = new Float32Array(w * h), B = new Float32Array(w * h);
    // area-average downscale
    const cnt = new Float32Array(w * h);
    for (let y = 0; y < H0; y++) { const yy = Math.min(h - 1, (y * s) | 0); for (let x = 0; x < W0; x++) {
      const xx = Math.min(w - 1, (x * s) | 0), i = yy * w + xx, j = (y * W0 + x) * 4;
      R[i] += data[j]; G[i] += data[j + 1]; B[i] += data[j + 2]; cnt[i]++; } }
    for (let i = 0; i < w * h; i++) { R[i] /= cnt[i]; G[i] /= cnt[i]; B[i] /= cnt[i]; }
    const [bR, bG, bB] = background(R, G, B, w, h);
    const st = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) st[i] = bR[i] - R[i];
    // 3x3 smooth
    const ss = new Float32Array(w * h);
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      let a = 0; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) a += st[(y + j) * w + x + i]; ss[y * w + x] = a / 9; }
    let m = new Uint8Array(w * h);
    const k = w / 1296; // geometry relative to the tuning resolution
    for (let i = 0; i < w * h; i++) m[i] = ss[i] > o.loose ? 1 : 0;
    m = morph(morph(m, w, h, true, 2), w, h, false, 2);
    m = fillHoles(m, w, h);
    m = morph(morph(m, w, h, false, 2), w, h, true, 2);
    let comps = components(m, w, h, Math.round(150 * k * k));
    comps = comps.filter(px => px.filter(p => st[p] > o.seed).length >= 40 * k * k);
    const areas = comps.map(c => c.length).filter(a => a < 2000 * k * k);
    const med = areas.length >= 5 ? median(areas) : 850 * k * k;
    // split merged
    let objs = [];
    for (const c of comps) {
      if (c.length > 1.45 * med && c.length < 4.5 * med) objs.push(...splitBlob(c, w)); else objs.push(c);
    }
    const cells = objs.map(px => measure(px, w, h, R, G, B, st, med, o, s, bG, bB));
    return { cells, width: W0, height: H0, medianArea: med / (s * s) };
  }

  function measure(px, w, h, R, G, B, st, med, o, s, bG, bB) {
    const n = px.length;
    let cx = 0, cy = 0; for (const p of px) { cx += p % w; cy += (p / w) | 0; } cx /= n; cy /= n;
    let sxx = 0, syy = 0, sxy = 0;
    for (const p of px) { const dx = p % w - cx, dy = ((p / w) | 0) - cy; sxx += dx * dx; syy += dy * dy; sxy += dx * dy; }
    sxx /= n; syy /= n; sxy /= n;
    const tr = sxx + syy, det = sxx * syy - sxy * sxy, disc = Math.sqrt(Math.max(0, tr * tr / 4 - det));
    const l1 = tr / 2 + disc, l2 = Math.max(1e-6, tr / 2 - disc);
    const ang = 0.5 * Math.atan2(2 * sxy, sxx - syy), ax = Math.cos(ang), ay = Math.sin(ang);
    const L = Math.sqrt(l1), elong = Math.sqrt(l1 / l2);
    const sv = px.map(p => st[p]), sorted = Float32Array.from(sv).sort();
    const p90 = sorted[Math.floor(n * 0.9)], p75 = sorted[Math.floor(n * 0.75)];
    let wsum = 0, wproj = 0, pale = 0, tr_ = 0, tg = 0, tb = 0, tn = 0, dB = 0;
    for (let k = 0; k < n; k++) {
      const p = px[k], v = Math.max(0, sv[k]);
      const proj = (p % w - cx) * ax + (((p / w) | 0) - cy) * ay;
      wsum += v; wproj += v * proj;
      if (sv[k] < 0.5 * p90) pale++;
      if (sv[k] >= p75) { tr_ += R[p]; tg += G[p]; tb += B[p]; dB += bB[p] - B[p]; tn++; }
    }
    const asym = Math.abs(wproj / Math.max(1, wsum)) / Math.max(1, L);
    const palef = pale / n;
    const r = tr_ / tn, g = tg / tn, b = tb / tn, hue = rgb2hue(r, g, b);
    // exclusion
    let excl = null;
    const rel = n / med;
    if (rel < 0.35) excl = 'мелкий объект';
    else if (rel > 2.3) excl = 'крупная клетка / скопление';
    else if (elong > 2.9) excl = 'вытянутый фрагмент';
    else if (Math.max(r, g, b) < 60 && b - r < 40) excl = 'чёрный мусор';
    else if (p90 < 40) excl = 'слабо окрашен (мусор)';
    else if (dB / tn > 25) excl = 'не синий (мусор/тень)';
    else if ((hue > 255 && hue < 340) || (hue > 232 && r > 110)) excl = 'розово-фиолетовый мусор';
    else if (palef < o.minPale && asym < o.minAsym) excl = 'нет светлой части';
    else if (elong < 1.12 && palef < 0.3) excl = 'круглая клетка';
    const frag = hue >= o.hueT || r < o.darkR;
    const xs = px.map(p => p % w), ys = px.map(p => (p / w) | 0);
    const inv = 1 / s;
    return {
      x: cx * inv, y: cy * inv, rx: Math.sqrt(l1) * 2.1 * inv, ry: Math.sqrt(l2) * 2.1 * inv, ang,
      bbox: [Math.min(...xs) * inv, Math.min(...ys) * inv, (Math.max(...xs) + 1) * inv, (Math.max(...ys) + 1) * inv],
      area: n * inv * inv, elong, asym, pale: palef, p90, hue, rgb: [r, g, b], dB: dB / tn,
      auto: excl ? 'excluded' : (frag ? 'fragmented' : 'healthy'), reason: excl,
    };
  }
  function reclassify(c, o) {
    if (c.reason) return 'excluded';
    return (c.hue >= o.hueT || c.rgb[0] < o.darkR) ? 'fragmented' : 'healthy';
  }
  return { analyze, reclassify, DEF };
})();
if (typeof module !== 'undefined') module.exports = TB;

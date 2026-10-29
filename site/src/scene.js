// ─── 3D-сцена: эмбрион в центре и «торнадо» карточек инструментов ──────────
// Идея как у «The Year of Greta»: фигура в центре, вокруг вращается спираль
// карточек-событий; прокрутка ведёт по спирали, клик открывает карточку.
const Scene = (() => {
  let THREE, renderer, scene, camera, clock, raf = 0, paused = false;
  let bg, hero, helix, particles, swimmers = [], cards = [], glows = [];
  let cur = -1.6, target = -1.6, hovered = -1, lastActive = -99, cb = {};
  const N = () => cards.length;
  const P = { R: 4.6, STEP: (Math.PI * 2) / 5, DY: 2.6, BASE: 0.62, Y0: 0, CAM_Z: 11, LOOK_Y: 0, PORTRAIT: false };
  const pointer = { x: 0, y: 0, nx: 0, ny: 0, down: false, moved: 0 };

  // ── фон: вращающийся шум (как у Greta) в тёмно-синей гамме
  const BG_FRAG = `
    uniform float uTime, uProg; uniform vec2 uRes; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
    float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
      return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
    float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<4;i++){ v+=a*noise(p); p*=2.03; a*=.5; } return v; }
    void main(){
      vec2 uv = vUv - .5; uv.x *= uRes.x / uRes.y;
      float ang = uTime*.012 + uProg*.18; mat2 rot = mat2(cos(ang),-sin(ang),sin(ang),cos(ang));
      vec2 q = rot*uv*2.2;
      float n = fbm(q*1.6 + vec2(0., uTime*.02)) ;
      float swirl = fbm(rot*q*3.0 + n*1.8);
      vec3 deep = vec3(.012,.035,.13), mid = vec3(.035,.13,.40), hi = vec3(.20,.72,.94);
      float r = length(uv);
      vec3 col = mix(deep, mid, smoothstep(.15,.95, swirl) * .85);
      col += hi * pow(swirl, 3.5) * .22;
      col += hi * exp(-r*r*5.5) * .16;          // свечение вокруг эмбриона
      col *= 1. - smoothstep(.45, 1.25, r) * .55; // виньетка
      col += (hash(gl_FragCoord.xy + uTime*60.) - .5) * .035; // зерно
      gl_FragColor = vec4(col, 1.);
    }`;

  // ── стеклянная сфера с френелевским ореолом (зона, бластомеры)
  const GLASS_VERT = `varying vec3 vN, vV, vP; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); vP = position; gl_Position = projectionMatrix*mv; }`;
  const GLASS_FRAG = `
    uniform vec3 uColor, uRim; uniform float uPow, uCore, uTime, uGrain; varying vec3 vN, vV, vP;
    float h3(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719)))*43758.5453); }
    void main(){
      float f = pow(1. - max(dot(normalize(vN), normalize(vV)), 0.), uPow);
      float g = h3(floor(vP*28. + uTime*.3)) * uGrain;
      vec3 c = uColor*(uCore + g) + uRim*f;
      gl_FragColor = vec4(c, clamp(f*.95 + uCore + g*.5, 0., 1.));
    }`;

  // ── карточка: трепещущая плоскость (вершины смещаются волной при наведении)
  const CARD_VERT = `
    uniform float uTime, uHover, uSeed; varying vec2 vUv; varying float vShade;
    void main(){
      vUv = uv; vec3 p = position;
      float w = sin(uv.x*4.6 + uTime*2.1 + uSeed) * .55 + sin(uv.y*3.7 + uTime*1.6 + uSeed*1.7) * .45;
      float amp = .022 + .11*uHover;
      p.z += w * amp * (.35 + uv.x);
      vShade = w * amp * 3.2;
      gl_Position = projectionMatrix*modelViewMatrix*vec4(p,1.);
    }`;
  const CARD_FRAG = `
    uniform sampler2D uMap; uniform float uOpacity; uniform vec3 uBack; varying vec2 vUv; varying float vShade;
    void main(){
      vec4 c = gl_FrontFacing ? texture2D(uMap, vUv) : vec4(uBack, texture2D(uMap, vec2(1.-vUv.x, vUv.y)).a * .22);
      c.rgb *= 1. - vShade*.4;
      if (c.a < .02) discard;
      gl_FragColor = vec4(c.rgb, c.a*uOpacity);
    }`;

  function glassMat(o) {
    return new THREE.ShaderMaterial({
      vertexShader: GLASS_VERT, fragmentShader: GLASS_FRAG, transparent: true, depthWrite: false,
      blending: o.add === false ? THREE.NormalBlending : THREE.AdditiveBlending, side: o.side || THREE.FrontSide,
      uniforms: { uColor: { value: new THREE.Color(o.color) }, uRim: { value: new THREE.Color(o.rim) }, uPow: { value: o.pow ?? 2.4 }, uCore: { value: o.core ?? 0.04 }, uTime: { value: 0 }, uGrain: { value: o.grain ?? 0 } },
    });
  }

  function makeHero() {
    const g = new THREE.Group();
    const zona = new THREE.Mesh(new THREE.SphereGeometry(1.75, 72, 72), glassMat({ color: '#2a7fd6', rim: '#bfefff', pow: 2.2, core: 0.015, grain: 0.05 }));
    const zonaIn = new THREE.Mesh(new THREE.SphereGeometry(1.55, 64, 64), glassMat({ color: '#1f4fff', rim: '#38c6f4', pow: 3.2, core: 0.0, side: THREE.BackSide }));
    g.add(zona, zonaIn);
    const cells = new THREE.Group();
    const pos = [[0.42, 0.38, 0.3], [-0.45, 0.3, -0.28], [0.28, -0.44, -0.36], [-0.3, -0.36, 0.42]];
    pos.forEach((p, i) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.66, 48, 48), glassMat({ color: '#8fd9ff', rim: '#ffffff', pow: 1.8, core: 0.05, grain: 0.09 }));
      m.position.set(...p); m.userData.base = new THREE.Vector3(...p); m.userData.ph = i * 1.7;
      const nuc = new THREE.Mesh(new THREE.SphereGeometry(0.17, 24, 24), glassMat({ color: '#38c6f4', rim: '#e9fbff', pow: 1.2, core: 0.22 }));
      nuc.position.set(p[0] * 0.25, p[1] * 0.25, p[2] * 0.25); m.add(nuc);
      cells.add(m);
    });
    const pb = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 24), glassMat({ color: '#8fd9ff', rim: '#ffffff', pow: 1.6, core: 0.08 }));
    pb.position.set(0.95, 1.05, 0.55); cells.add(pb);
    g.add(cells); g.userData.cells = cells;
    return g;
  }

  function makeParticles(count) {
    const geo = new THREE.BufferGeometry();
    const a = (n) => new Float32Array(n);
    const r = a(count), ang = a(count), y = a(count), sp = a(count), sz = a(count);
    for (let i = 0; i < count; i++) { r[i] = 2.2 + Math.pow(Math.random(), 0.7) * 8; ang[i] = Math.random() * 6.283; y[i] = Math.random() * 20 - 10; sp[i] = 0.02 + Math.random() * 0.08; sz[i] = 0.6 + Math.random() * 2.4; }
    geo.setAttribute('position', new THREE.BufferAttribute(a(count * 3), 3));
    geo.setAttribute('aR', new THREE.BufferAttribute(r, 1)); geo.setAttribute('aA', new THREE.BufferAttribute(ang, 1));
    geo.setAttribute('aY', new THREE.BufferAttribute(y, 1)); geo.setAttribute('aS', new THREE.BufferAttribute(sp, 1)); geo.setAttribute('aSz', new THREE.BufferAttribute(sz, 1));
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uDpr: { value: renderer.getPixelRatio() } },
      vertexShader: `attribute float aR, aA, aY, aS, aSz; uniform float uTime, uDpr; varying float vA;
        void main(){ float t = uTime; float an = aA + t*aS; float yy = mod(aY + t*.12*(1.+aS*4.) + 10., 20.) - 10.;
          vec3 p = vec3(cos(an)*aR, yy, sin(an)*aR); vec4 mv = modelViewMatrix*vec4(p,1.);
          gl_PointSize = aSz * uDpr * (34. / -mv.z); vA = smoothstep(10., 6., abs(yy)) * (.25 + .75*fract(aA*7.3));
          gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord-.5); float a = smoothstep(.5, .0, d); gl_FragColor = vec4(vec3(.62,.88,1.), a*vA*.42); }`,
    });
    const pts = new THREE.Points(geo, mat); pts.frustumCulled = false;
    return pts;
  }

  function makeSwimmers(n) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const segs = 22, geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(segs * 3), 3));
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xbfe9ff, transparent: true, opacity: 0.55, depthWrite: false }));
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 12), new THREE.MeshBasicMaterial({ color: 0xe6f8ff, transparent: true, opacity: 0.9 }));
      head.scale.set(1.5, 1, 1);
      const s = { line, head, segs, r0: 4 + Math.random() * 5, a0: Math.random() * 6.28, y0: (Math.random() - 0.5) * 7, sp: 0.18 + Math.random() * 0.22, ph: Math.random() * 6.28, dir: Math.random() < 0.5 ? 1 : -1, life: Math.random() };
      out.push(s);
    }
    return out;
  }
  function updateSwimmer(s, t) {
    const pos = s.line.geometry.attributes.position.array;
    const L = 1.0;
    const at = (tt) => {
      const k = ((s.life + tt * 0.025) % 1);           // жизненный цикл: подплывает к эмбриону
      const r = s.r0 * (1 - k * 0.62) + 1.9 * k;
      const a = s.a0 + s.dir * tt * s.sp;
      return [Math.cos(a) * r, s.y0 * (1 - k * 0.7) + Math.sin(tt * 0.6 + s.ph) * 0.4, Math.sin(a) * r, k];
    };
    const [hx, hy, hz, k] = at(t);
    const [px, py, pz] = at(t - 0.08);
    let dx = hx - px, dy = hy - py, dz = hz - pz; const dl = Math.hypot(dx, dy, dz) || 1; dx /= dl; dy /= dl; dz /= dl;
    // перпендикуляр для «биения» хвоста
    let nx = -dz, nz = dx;
    for (let i = 0; i < s.segs; i++) {
      const u = i / (s.segs - 1), back = u * L;
      const wave = Math.sin(u * 9 - t * 14 + s.ph) * 0.09 * u;
      pos[i * 3] = hx - dx * back + nx * wave; pos[i * 3 + 1] = hy - dy * back + Math.sin(u * 6 - t * 9) * 0.03 * u; pos[i * 3 + 2] = hz - dz * back + nz * wave;
    }
    s.line.geometry.attributes.position.needsUpdate = true;
    s.head.position.set(hx, hy, hz); s.head.lookAt(hx + dx, hy + dy, hz + dz); s.head.rotateY(Math.PI / 2);
    const fade = Math.min(1, k * 8) * Math.min(1, (1 - k) * 6);
    s.line.material.opacity = 0.5 * fade; s.head.material.opacity = 0.85 * fade;
  }

  // ── текстура карточки на canvas
  function roundRect(ctx, x, y, w, hh, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + hh, r); ctx.arcTo(x + w, y + hh, x, y + hh, r); ctx.arcTo(x, y + hh, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function wrap(ctx, text, maxW, maxLines) {
    const words = String(text).split(/\s+/); const lines = []; let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; if (lines.length === maxLines) break; }
      else line = test;
    }
    if (lines.length < maxLines && line) lines.push(line);
    if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
      let last = lines[maxLines - 1]; while (ctx.measureText(last + '…').width > maxW && last.length) last = last.slice(0, -1);
      lines[maxLines - 1] = last.replace(/[\s,.;:—-]+$/, '') + '…';
    }
    return lines;
  }
  function drawCard(canvas, info) {
    const W = canvas.width, H = canvas.height, ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    roundRect(ctx, 6, 6, W - 12, H - 12, 34);
    const grd = ctx.createLinearGradient(0, 0, W, H); grd.addColorStop(0, '#ffffff'); grd.addColorStop(1, '#e9f3ff');
    ctx.fillStyle = grd; ctx.fill();
    ctx.save(); ctx.clip();
    ctx.globalAlpha = 0.07; ctx.strokeStyle = '#1f4fff'; ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.restore(); ctx.globalAlpha = 1;
    const pad = 70;
    ctx.fillStyle = '#1f4fff'; ctx.font = '600 58px Unbounded, "Golos Text", sans-serif'; ctx.textBaseline = 'top';
    ctx.fillText(info.num, pad, pad - 6);
    ctx.fillStyle = 'rgba(6,18,58,.55)'; ctx.font = '600 26px "Golos Text", sans-serif';
    const chap = info.chapter.toUpperCase(); let cx = pad + 150;
    for (const ch of chap) { ctx.fillText(ch, cx, pad + 14); cx += ctx.measureText(ch).width + 3.2; }
    ctx.fillStyle = '#06123a'; ctx.font = '700 76px Unbounded, "Golos Text", sans-serif';
    const nameLines = wrap(ctx, info.name, W - pad * 2 - 40, 2);
    nameLines.forEach((l, i) => ctx.fillText(l, pad, 190 + i * 88));
    ctx.fillStyle = 'rgba(6,18,58,.68)'; ctx.font = '400 31px "Golos Text", sans-serif';
    const ty = 190 + nameLines.length * 88 + 24;
    wrap(ctx, info.tagline, W - pad * 2 - 190, 3).forEach((l, i) => ctx.fillText(l, pad, ty + i * 42));
    ctx.fillStyle = '#1f4fff'; ctx.beginPath(); ctx.arc(pad + 9, H - pad - 4, 9, 0, 6.283); ctx.fill();
    ctx.fillStyle = 'rgba(6,18,58,.7)'; ctx.font = '600 26px "Golos Text", sans-serif'; ctx.fillText(info.badge, pad + 32, H - pad - 19);
    drawGlyph(ctx, info.glyph, W - pad - 140, H - pad - 150, 150, '#1f4fff', 3);
  }

  function makeGlowTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 256; const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(128, 128, 10, 128, 128, 128); g.addColorStop(0, 'rgba(120,220,255,.55)'); g.addColorStop(1, 'rgba(56,198,244,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256); return new THREE.CanvasTexture(c);
  }

  function layout() {
    const w = innerWidth, hgt = innerHeight, asp = w / hgt;
    if (asp >= 1.05) Object.assign(P, { BASE: 0.62, Y0: 0, CAM_Z: asp > 1.9 ? 10.2 : 11, LOOK_Y: 0, PORTRAIT: false });
    else if (asp >= 0.75) Object.assign(P, { BASE: 0.35, Y0: -1.7, CAM_Z: 13.5, LOOK_Y: -0.6, PORTRAIT: true });
    else Object.assign(P, { BASE: 0.0, Y0: -1.65, CAM_Z: 15.5, LOOK_Y: -0.9, PORTRAIT: true });
    camera.aspect = asp; camera.updateProjectionMatrix();
    renderer.setSize(w, hgt, false);
    bg.material.uniforms.uRes.value.set(w, hgt);
  }

  async function init(canvas, callbacks) {
    cb = callbacks;
    try { THREE = await loadThree(); } catch { return false; }
    try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); }
    catch { return false; }
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, innerWidth < 700 ? 1.5 : 1.75));
    scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100); clock = new THREE.Clock();

    bg = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, .9999, 1.); }',
      fragmentShader: BG_FRAG, depthWrite: false, depthTest: false,
      uniforms: { uTime: { value: 0 }, uProg: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) } },
    }));
    bg.frustumCulled = false; bg.renderOrder = -10; scene.add(bg);

    hero = makeHero(); scene.add(hero);
    particles = makeParticles(innerWidth < 700 ? 420 : 900); scene.add(particles);
    swimmers = makeSwimmers(innerWidth < 700 ? 6 : 11); swimmers.forEach((s) => scene.add(s.line, s.head));

    helix = new THREE.Group(); scene.add(helix);
    const glowTex = makeGlowTexture();
    const geo = new THREE.PlaneGeometry(2.56, 1.6, 40, 24);
    for (let i = 0; i < callbacks.count; i++) {
      const canvasTex = document.createElement('canvas'); canvasTex.width = 1024; canvasTex.height = 640;
      const tex = new THREE.CanvasTexture(canvasTex); tex.anisotropy = 8;
      const mat = new THREE.ShaderMaterial({
        vertexShader: CARD_VERT, fragmentShader: CARD_FRAG, transparent: true, side: THREE.DoubleSide,
        uniforms: { uMap: { value: tex }, uTime: { value: 0 }, uHover: { value: 0 }, uSeed: { value: i * 1.37 }, uOpacity: { value: 1 }, uBack: { value: new THREE.Color('#5f8dff') } },
      });
      const m = new THREE.Mesh(geo, mat);
      const th = i * P.STEP; m.position.set(Math.sin(th) * P.R, -i * P.DY, Math.cos(th) * P.R); m.rotation.y = th;
      m.userData = { i, canvas: canvasTex, tex, hover: 0 };
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 3.0), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
      glow.position.copy(m.position).multiplyScalar(0.985); glow.position.y = m.position.y; glow.rotation.y = th; glow.renderOrder = -1;
      helix.add(glow, m); cards.push(m); glows.push(glow);
    }
    redraw();
    if (document.fonts) document.fonts.ready.then(redraw);

    layout(); addEventListener('resize', layout);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerdown', (e) => { pointer.down = true; pointer.moved = 0; pointer.sx = e.clientX; pointer.sy = e.clientY; });
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointerleave', () => { hovered = -1; canvas.style.cursor = ''; });
    loop();
    return true;
  }

  const ray = { rc: null, v: null };
  function pick(clientX, clientY) {
    if (!ray.rc) { ray.rc = new THREE.Raycaster(); ray.v = new THREE.Vector2(); }
    ray.v.set((clientX / innerWidth) * 2 - 1, -(clientY / innerHeight) * 2 + 1);
    ray.rc.setFromCamera(ray.v, camera);
    const hit = ray.rc.intersectObjects(cards, false)[0];
    return hit ? hit.object.userData.i : -1;
  }
  function onMove(e) {
    pointer.nx = (e.clientX / innerWidth) * 2 - 1; pointer.ny = (e.clientY / innerHeight) * 2 - 1;
    if (pointer.down) pointer.moved += Math.abs(e.movementX || 0) + Math.abs(e.movementY || 0);
    if (e.pointerType === 'mouse') { hovered = pick(e.clientX, e.clientY); renderer.domElement.style.cursor = hovered >= 0 ? 'pointer' : ''; }
  }
  function onUp(e) {
    const wasDown = pointer.down; pointer.down = false;
    const dist = Math.hypot(e.clientX - (pointer.sx ?? e.clientX), e.clientY - (pointer.sy ?? e.clientY));
    if (!wasDown || dist > 8) return;
    const i = pick(e.clientX, e.clientY);
    if (i < 0) return;
    if (Math.abs(i - cur) < 0.5) cb.onOpen?.(i); else cb.onSeek?.(i);
  }

  function redraw() {
    cards.forEach((m) => { drawCard(m.userData.canvas, cb.cardInfo(m.userData.i)); m.userData.tex.needsUpdate = true; });
  }

  function loop() {
    raf = requestAnimationFrame(loop);
    if (paused) return;
    const dt = Math.min(clock.getDelta(), 0.1), t = clock.elapsedTime;
    cur += (target - cur) * (1 - Math.exp(-dt * (REDUCED ? 12 : 4.2)));   // не зависит от FPS
    if (Math.abs(target - cur) < 0.0005) cur = target;

    const idx = cur < -0.5 ? -1 : Math.max(0, Math.min(N() - 1, Math.round(cur)));
    if (idx !== lastActive) { lastActive = idx; cb.onActive?.(idx); }

    helix.rotation.y = P.BASE - cur * P.STEP + (REDUCED ? 0 : Math.sin(t * 0.25) * 0.02);
    helix.position.y = cur * P.DY + P.Y0;
    cards.forEach((m, i) => {
      const d = Math.abs(i - cur);
      const u = m.material.uniforms; u.uTime.value = t;
      m.userData.hover += ((hovered === i ? 1 : 0) - m.userData.hover) * Math.min(1, dt * 6);
      u.uHover.value = m.userData.hover + Math.max(0, 1 - d) * 0.25;
      u.uOpacity.value = Math.max(0.12, Math.min(1, 1.05 - d * 0.55));
      glows[i].material.opacity = Math.max(0, 1 - d * 1.6) * 0.9;
    });

    const k = Math.max(0, Math.min(1, (-cur - 0.5) / 1.1));   // 1 = интро, 0 = карточки
    const ke = k * k * (3 - 2 * k);
    hero.position.x = P.PORTRAIT ? 0 : 2.6 * ke;
    hero.position.y = P.PORTRAIT ? 1.7 * ke : 0;
    hero.scale.setScalar((P.PORTRAIT ? 1 - 0.22 * ke : 1) * (1 + Math.sin(t * 0.8) * 0.012));
    const cells = hero.userData.cells;
    hero.rotation.y = t * 0.07 + cur * 0.25; hero.rotation.x = Math.sin(t * 0.13) * 0.12;
    cells.children.forEach((c) => { if (c.userData.base) c.position.copy(c.userData.base).multiplyScalar(1 + Math.sin(t * 0.9 + c.userData.ph) * 0.025); });
    hero.traverse((o) => { if (o.material?.uniforms?.uTime) o.material.uniforms.uTime.value = t; });

    particles.material.uniforms.uTime.value = REDUCED ? 0 : t;
    swimmers.forEach((s) => updateSwimmer(s, REDUCED ? 0 : t));

    const px = REDUCED ? 0 : pointer.nx * 0.35, py = REDUCED ? 0 : pointer.ny * 0.2;
    camera.position.x += (px - camera.position.x) * 0.04;
    camera.position.y += (P.LOOK_Y + 0.35 - py - camera.position.y) * 0.04;
    camera.position.z += (P.CAM_Z - camera.position.z) * 0.08;
    camera.lookAt(0, P.LOOK_Y, 0);

    bg.material.uniforms.uTime.value = t; bg.material.uniforms.uProg.value = cur;
    renderer.render(scene, camera);
  }

  return {
    init,
    get progress() { return target; },
    setTarget(v) { target = Math.max(-1.6, Math.min(N() - 1, v)); },
    nudge(d) { this.setTarget(target + d); },
    // Привязка к ближайшей остановке по направлению жеста: одно деление колеса = одна карточка
    snap(dir = 0) {
      const stops = [-1.6, ...Array.from({ length: N() }, (_, i) => i)];
      if (dir > 0) target = stops.find((s) => s >= target - 1e-4) ?? stops[stops.length - 1];
      else if (dir < 0) target = [...stops].reverse().find((s) => s <= target + 1e-4) ?? stops[0];
      else target = stops.reduce((a, b) => (Math.abs(b - target) < Math.abs(a - target) ? b : a));
    },
    redraw,
    pause(v) { paused = v; if (!v) clock?.getDelta(); },
    get count() { return N(); },
  };
})();

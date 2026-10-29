'use client';
import { useEffect, useRef } from 'react';

/** Лёгкое кинематографичное поле: дрейфующие «клетки» и плывущие траектории сперматозоидов. */
export function HeroCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current!;
    const ctx = cv.getContext('2d')!;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w = 0, h = 0, raf = 0, t = 0;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);

    type Cell = { x: number; y: number; r: number; vx: number; vy: number; a: number };
    type Swim = { x: number; y: number; ph: number; sp: number; amp: number; len: number; a: number };
    let cells: Cell[] = [], swim: Swim[] = [];

    function resize() {
      const p = cv.parentElement!;
      w = p.clientWidth; h = p.clientHeight;
      cv.width = w * DPR; cv.height = h * DPR; cv.style.width = w + 'px'; cv.style.height = h + 'px';
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      const nC = Math.round((w * h) / 42000);
      cells = Array.from({ length: nC }, () => ({
        x: Math.random() * w, y: Math.random() * h, r: 18 + Math.random() * 60,
        vx: (Math.random() - 0.5) * 0.14, vy: (Math.random() - 0.5) * 0.14, a: 0.04 + Math.random() * 0.07,
      }));
      const nS = Math.round(w / 170);
      swim = Array.from({ length: nS }, () => ({
        x: Math.random() * w, y: Math.random() * h, ph: Math.random() * 6.28,
        sp: 0.25 + Math.random() * 0.5, amp: 5 + Math.random() * 9, len: 26 + Math.random() * 26, a: 0.1 + Math.random() * 0.14,
      }));
    }

    function draw() {
      t += 1;
      ctx.clearRect(0, 0, w, h);
      for (const c of cells) {
        c.x += c.vx; c.y += c.vy;
        if (c.x < -80) c.x = w + 80; if (c.x > w + 80) c.x = -80;
        if (c.y < -80) c.y = h + 80; if (c.y > h + 80) c.y = -80;
        const g = ctx.createRadialGradient(c.x, c.y, c.r * 0.2, c.x, c.y, c.r);
        g.addColorStop(0, `rgba(56,198,244,${c.a})`);
        g.addColorStop(1, 'rgba(31,79,255,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, 6.2832); ctx.fill();
      }
      for (const s of swim) {
        s.x += s.sp; s.ph += 0.05;
        if (s.x > w + s.len) { s.x = -s.len; s.y = Math.random() * h; }
        ctx.strokeStyle = `rgba(11,42,138,${s.a})`; ctx.lineWidth = 1.4; ctx.beginPath();
        for (let i = 0; i <= s.len; i += 2) {
          const yy = s.y + Math.sin(s.ph - i * 0.25) * s.amp * (i / s.len);
          i === 0 ? ctx.moveTo(s.x - i, yy) : ctx.lineTo(s.x - i, yy);
        }
        ctx.stroke();
        ctx.fillStyle = `rgba(31,79,255,${Math.min(0.5, s.a * 2.4)})`;
        ctx.beginPath(); ctx.arc(s.x, s.y + Math.sin(s.ph) * 0, 2.6, 0, 6.2832); ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    }

    resize();
    if (reduce) { draw(); cancelAnimationFrame(raf); } else draw();
    window.addEventListener('resize', resize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />;
}

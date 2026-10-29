'use client';
import { useEffect, useRef } from 'react';

/** Плавное появление при прокрутке. */
export function Reveal({ children, className = '', delay = 0, as: As = 'div' }: { children: React.ReactNode; className?: string; delay?: number; as?: any }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => { if (e.isIntersecting) { setTimeout(() => el.classList.add('in'), delay); io.unobserve(el); } }),
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [delay]);
  return <As ref={ref} className={`reveal ${className}`}>{children}</As>;
}

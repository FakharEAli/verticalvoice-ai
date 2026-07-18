'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

/* ---------------------------------------------------------------------------
 * ScrollReveal
 * ---------------------------------------------------------------------------
 * Wraps content and applies the `vv-fade-up` reveal once it scrolls into view,
 * with an optional stagger delay. Fully guards prefers-reduced-motion: when
 * reduced motion is on (or JS is unavailable after hydration) the content is
 * rendered visible immediately and never held at opacity 0.
 * ------------------------------------------------------------------------- */

export interface ScrollRevealProps {
  children: React.ReactNode;
  /** Stagger delay in milliseconds. Default 0. */
  delay?: number;
  className?: string;
}

export function ScrollReveal({ children, delay = 0, className }: ScrollRevealProps) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = React.useState(false);
  const [reduced, setReduced] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  React.useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const animate = shown && !reduced;
  const hidden = !shown && !reduced;

  return (
    <div
      ref={ref}
      className={cn(animate && 'animate-vv-fade-up', className)}
      style={{
        opacity: hidden ? 0 : undefined,
        animationDelay: animate && delay ? `${delay}ms` : undefined,
      }}
    >
      {children}
    </div>
  );
}

export default ScrollReveal;

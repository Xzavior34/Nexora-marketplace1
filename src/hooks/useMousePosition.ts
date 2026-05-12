import { useEffect, useRef } from 'react';
import { useMotionValue } from 'framer-motion';

/**
 * Returns normalised mouse position {x, y} in range [-1, 1]
 * relative to the window centre, as Framer Motion MotionValues.
 */
export function useMousePosition() {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        x.set((e.clientX / window.innerWidth) * 2 - 1);
        y.set((e.clientY / window.innerHeight) * 2 - 1);
      });
    };

    window.addEventListener('mousemove', handleMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [x, y]);

  return { x, y };
}

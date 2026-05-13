import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';

interface ScrollFloatWrapperProps {
  children: React.ReactNode;
  className?: string;
  intensity?: number;
}

export function ScrollFloatWrapper({ children, className = '', intensity = 1 }: ScrollFloatWrapperProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Track scroll progress within this element's viewport intersection
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'], // when top of element hits bottom of viewport -> bottom of element hits top
  });

  // Smooth the scroll progress
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  // Map scroll progress to 3D rotation and translation
  // It starts tilted down (-20deg) and below, comes to 0 at center, then tilts up (20deg)
  const rotateX = useTransform(smoothProgress, [0, 0.5, 1], [15 * intensity, 0, -15 * intensity]);
  const y = useTransform(smoothProgress, [0, 0.5, 1], [100 * intensity, 0, -100 * intensity]);
  const scale = useTransform(smoothProgress, [0, 0.5, 1], [0.9, 1, 0.9]);
  const opacity = useTransform(smoothProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);

  return (
    <div ref={ref} className={`perspective-1000 ${className}`}>
      <motion.div
        style={{
          rotateX,
          y,
          scale,
          opacity,
          transformStyle: 'preserve-3d',
        }}
        className="w-full h-full will-change-transform"
      >
        {children}
      </motion.div>
    </div>
  );
}

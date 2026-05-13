import { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';

export const FloatingMockup = ({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  // Smooth out the scroll progress with a heavy premium spring
  const springProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  // Transform values for a 3D tilt effect on scroll
  const y = useTransform(springProgress, [0, 1], [100, -100]);
  const rotateX = useTransform(springProgress, [0, 0.5, 1], [15, 5, -5]);
  const rotateY = useTransform(springProgress, [0, 0.5, 1], [-20, -10, 0]);
  const scale = useTransform(springProgress, [0, 0.5, 1], [0.9, 1, 1.05]);

  return (
    <div
      ref={ref}
      className={`relative perspective-[1200px] ${className}`}
      style={{
        transformStyle: 'preserve-3d',
      }}
    >
      <motion.div
        style={{
          y,
          rotateX,
          rotateY,
          scale,
          willChange: 'transform',
        }}
        className="w-full h-full relative"
      >
        {children}
      </motion.div>
    </div>
  );
};

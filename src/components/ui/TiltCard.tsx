import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  intensity?: number;      // tilt degrees, default 12
  sheenOpacity?: number;   // 0–1
  onClick?: () => void;
  as?: 'div' | 'button' | 'article';
  variants?: any;
}

/**
 * Shared 3D tilt card with cursor-following sheen highlight.
 * Wrap any card content with this for the Vercel/Linear premium depth feel.
 */
export function TiltCard({
  children,
  className = '',
  intensity = 12,
  sheenOpacity = 0.12,
  onClick,
  as = 'div',
  variants,
}: TiltCardProps) {
  const ref = useRef<HTMLElement>(null);

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);

  const springConfig = { stiffness: 180, damping: 25, mass: 1.2 };
  const springX = useSpring(rawX, springConfig);
  const springY = useSpring(rawY, springConfig);

  const rotateX = useTransform(springY, [-0.5, 0.5], [`${intensity}deg`, `-${intensity}deg`]);
  const rotateY = useTransform(springX, [-0.5, 0.5], [`-${intensity}deg`, `${intensity}deg`]);

  // Sheen position
  const sheenX = useTransform(springX, [-0.5, 0.5], ['0%', '100%']);
  const sheenY = useTransform(springY, [-0.5, 0.5], ['0%', '100%']);

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    rawX.set((e.clientX - rect.left) / rect.width - 0.5);
    rawY.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleMouseLeave = () => {
    rawX.set(0);
    rawY.set(0);
  };

  const Tag = motion[as] as any;

  return (
    <Tag
      ref={ref}
      onClick={onClick}
      className={`relative overflow-hidden ${className}`}
      variants={variants}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
        perspective: '1000px',
      }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Depth content layer */}
      <div style={{ transform: 'translateZ(20px)', height: '100%' }}>
        {children}
      </div>

      {/* Cursor-following sheen */}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{
          background: `radial-gradient(circle at ${sheenX} ${sheenY}, rgba(255,255,255,${sheenOpacity}) 0%, transparent 70%)`,
          zIndex: 10,
        }}
      />
    </Tag>
  );
}

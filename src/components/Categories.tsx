import { Wrench, Code, Utensils, Package, Laptop, Camera, Scissors, Truck } from "lucide-react";
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { TiltCard } from '@/components/ui/TiltCard';
import { useNavigate } from 'react-router-dom';

const categories = [
  { icon: Wrench,   name: "Artisans & Repairs",  count: 1256, image: "/images/artisan_new.png",  span: 'md:col-span-2 md:row-span-2' },
  { icon: Code,     name: "Web & Tech",           count: 849,  image: "/images/tech.png",          span: '' },
  { icon: Utensils, name: "Food & Catering",      count: 1124, image: "/images/food.png",          span: '' },
  { icon: Package,  name: "Logistics",            count: 2203, image: "/images/logistics.png",     span: 'md:col-span-2' },
  { icon: Laptop,   name: "Digital Services",     count: 647,  image: "/images/digital.png",       span: '' },
  { icon: Camera,   name: "Media & Events",       count: 445,  image: "/images/media.png",         span: '' },
  { icon: Scissors, name: "Beauty & Fashion",     count: 788,  image: "/images/fashion.png",       span: '' },
  { icon: Truck,    name: "Moving & Labour",      count: 334,  image: "/images/moving.png",        span: '' },
];

const container = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12 } },
};

// Each card flies in from depth + tilted, then transitions into a continuous
// gentle float. Duration and delay are staggered per-index so every card bobs
// at a slightly different pace — gives the section a living, breathing quality.
const cardItem = {
  hidden: { opacity: 0, y: 70, rotateX: 18, scale: 0.88 },
  visible: (i: number) => ({
    opacity: 1,
    y: [0, -(6 + (i % 3) * 3), 0],
    rotateX: 0,
    scale: 1,
    transition: {
      opacity:  { duration: 0.5 },
      scale:    { type: 'spring', stiffness: 180, damping: 22 },
      rotateX:  { type: 'spring', stiffness: 120, damping: 22 },
      y: {
        duration:   4.5 + (i % 4) * 0.8,
        repeat:     Infinity,
        repeatType: 'reverse' as const,
        ease:       'easeInOut',
        delay:      0.8,
      },
    },
  }),
};

const Categories = () => {
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <section id="categories" className="py-24 md:py-32 bg-secondary/30 relative overflow-hidden">
      {/* Ambient blobs */}
      <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-brand/8 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-sky-500/8 blur-3xl pointer-events-none" />
      {/* Blend fades into dark neighbours */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#030303] to-transparent pointer-events-none z-20" />
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#050505] to-transparent pointer-events-none z-20" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-block text-sm font-bold text-brand mb-3 tracking-widest uppercase">
            Marketplace Categories
          </span>
          <h2 className="text-3xl md:text-5xl font-extrabold text-foreground mb-4 tracking-tight">
            Verified Professional Services
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-lg leading-relaxed">
            From elite web developers to skilled local artisans — Nigeria's deepest pool of verified economic talent, one AI match away.
          </p>
        </motion.div>

        {/* Bento grid — perspective wrapper gives the 3D fly-in real depth */}
        <motion.div
          ref={ref}
          className="grid grid-cols-2 md:grid-cols-4 auto-rows-[180px] gap-4 max-w-5xl mx-auto"
          style={{ perspective: 1200 }}
          variants={container}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
        >
          {categories.map((cat, i) => (
            <motion.div
              key={cat.name}
              custom={i}
              variants={cardItem}
              className={cat.span}
              style={{ transformStyle: 'preserve-3d' }}
            >
              <TiltCard
                as="div"
                intensity={7}
                onClick={() => navigate('/gigs')}
                className="group relative rounded-3xl overflow-hidden cursor-pointer h-full w-full"
              >
                {/* Background image */}
                <div
                  className="absolute inset-0 bg-cover bg-center transition-all duration-700 ease-out group-hover:scale-110 group-hover:brightness-125"
                  style={{ backgroundImage: `url(${cat.image})` }}
                />

                {/* Sweep-shimmer sheen on hover */}
                <div className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/25 to-transparent group-hover:animate-shimmer z-10 pointer-events-none mix-blend-overlay" />

                {/* Dark vignette overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10 transition-opacity duration-500 group-hover:opacity-70 z-0" />

                {/* Content — floats in Z on hover via translateZ */}
                <div
                  className="relative h-full w-full p-5 flex flex-col justify-between z-20 transition-transform duration-500 ease-out group-hover:[transform:translateZ(30px)]"
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <div className="h-11 w-11 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center transition-all duration-500 group-hover:bg-white/30 group-hover:shadow-[0_0_35px_rgba(255,255,255,0.55)] group-hover:-translate-y-1.5">
                    <cat.icon className="h-5 w-5 text-white transition-transform duration-500 group-hover:scale-125" />
                  </div>

                  <div className="transition-transform duration-500 group-hover:translate-x-1.5">
                    <h3 className="font-bold text-white text-base leading-snug group-hover:text-brand-50 transition-colors drop-shadow-md">
                      {cat.name}
                    </h3>
                    <p className="text-white/75 text-xs mt-0.5 drop-shadow-sm font-semibold tracking-wide">
                      {cat.count.toLocaleString()} professionals
                    </p>
                  </div>
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Categories;

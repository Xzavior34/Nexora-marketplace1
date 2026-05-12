import { Wrench, Code, Utensils, Package, Laptop, Camera, Scissors, Truck } from "lucide-react";
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { TiltCard } from '@/components/ui/TiltCard';
import { useNavigate } from 'react-router-dom';

const categories = [
  { icon: Wrench,   name: "Artisans & Repairs",  count: 1256, gradient: "from-orange-500 to-red-500",    span: 'md:col-span-2 md:row-span-2' },
  { icon: Code,     name: "Web & Tech",           count: 849,  gradient: "from-violet-600 to-indigo-500", span: '' },
  { icon: Utensils, name: "Food & Catering",      count: 1124, gradient: "from-emerald-500 to-teal-400",  span: '' },
  { icon: Package,  name: "Logistics",            count: 2203, gradient: "from-sky-500 to-cyan-400",      span: 'md:col-span-2' },
  { icon: Laptop,   name: "Digital Services",     count: 647,  gradient: "from-fuchsia-500 to-pink-500",  span: '' },
  { icon: Camera,   name: "Media & Events",       count: 445,  gradient: "from-amber-500 to-orange-400",  span: '' },
  { icon: Scissors, name: "Beauty & Fashion",     count: 788,  gradient: "from-rose-500 to-pink-400",     span: '' },
  { icon: Truck,    name: "Moving & Labour",      count: 334,  gradient: "from-slate-600 to-slate-400",   span: '' },
];

const container = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const cardItem = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 280, damping: 24 } },
};

const Categories = () => {
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <section id="categories" className="py-24 md:py-32 bg-secondary/30 relative overflow-hidden">
      {/* Ambient blobs */}
      <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-brand/5 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-sky-500/5 blur-3xl pointer-events-none" />

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
            Find Your Hustle
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-lg leading-relaxed">
            From expert web developers to reliable local artisans — the right skill is always one match away.
          </p>
        </motion.div>

        {/* Bento grid */}
        <motion.div
          ref={ref}
          className="grid grid-cols-2 md:grid-cols-4 auto-rows-[160px] gap-4 max-w-5xl mx-auto"
          variants={container}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
        >
          {categories.map((cat, i) => (
            <TiltCard
              key={cat.name}
              as="div"
              variants={cardItem}
              className={`rounded-2xl overflow-hidden cursor-pointer ${cat.span}`}
              intensity={6}
              onClick={() => navigate('/gigs')}
            >
              <div className={`h-full w-full bg-gradient-to-br ${cat.gradient} p-6 flex flex-col justify-between`}>
                <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <cat.icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg leading-tight">{cat.name}</h3>
                  <p className="text-white/70 text-sm mt-1">{cat.count.toLocaleString()} professionals</p>
                </div>
              </div>
            </TiltCard>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Categories;

import { Brain, ShieldCheck, PiggyBank, Sparkles } from "lucide-react";
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { TiltCard } from '@/components/ui/TiltCard';

const steps = [
  {
    icon: Brain,
    step: '01',
    title: "Smart Match AI",
    description:
      "Our AI analyses your skills, university, and history to surface the highest-value gigs in seconds — ranked by compatibility, not recency.",
    gradient: "from-violet-600 to-indigo-500",
    glow: "shadow-[0_8px_32px_-4px_rgba(99,91,255,0.4)]",
  },
  {
    icon: ShieldCheck,
    step: '02',
    title: "Squad Escrow Security",
    description:
      "Every Naira is locked in Squad-powered escrow until you confirm delivery. Bank-grade protection on every transaction.",
    gradient: "from-sky-500 to-cyan-400",
    glow: "shadow-[0_8px_32px_-4px_rgba(14,165,233,0.4)]",
  },
  {
    icon: PiggyBank,
    step: '03',
    title: "Ajo Vault Auto-Savings",
    description:
      "A percentage of every payout flows automatically into your Ajo Vault — building a credit identity and unlocking micro-loans.",
    gradient: "from-fuchsia-500 to-violet-600",
    glow: "shadow-[0_8px_32px_-4px_rgba(192,38,211,0.4)]",
  },
];

const container = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.18 } },
};
const cardVariant = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 22 } },
};

const HowItWorks = () => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="how-it-works" className="py-24 md:py-32 bg-background relative overflow-hidden">
      {/* Decorative mesh */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-brand/4 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          className="text-center mb-20"
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand/10 text-brand text-sm font-semibold mb-6 border border-brand/20">
            <Sparkles className="h-4 w-4" />
            The Intelligent Economy Stack
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-5 text-balance">
            Three pillars. One intelligent economy.
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-lg leading-relaxed">
            AI matching. Bank-grade escrow. Automatic savings. Purpose-built for every Nigerian hustler.
          </p>
        </motion.div>

        <motion.div
          ref={ref}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto"
          variants={container}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
        >
          {steps.map((step, i) => (
            <TiltCard
              key={step.title}
              as="article"
              variants={cardVariant}
              className={`glass-card rounded-3xl p-8 h-full cursor-default ${step.glow}`}
              intensity={8}
            >
              {/* Step number + connector line */}
              <div className="flex items-center gap-3 mb-6">
                <span className="text-[11px] font-black tracking-[0.2em] text-muted-foreground uppercase">{step.step}</span>
                {i < steps.length - 1 && (
                  <div className="hidden md:block flex-1 h-px bg-gradient-to-r from-border to-transparent" />
                )}
              </div>

              <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${step.gradient} flex items-center justify-center mb-6 shadow-sm`}>
                <step.icon className="h-7 w-7 text-white" />
              </div>

              <h3 className="text-xl font-bold text-foreground mb-3 tracking-tight">{step.title}</h3>
              <p className="text-muted-foreground leading-relaxed text-sm">{step.description}</p>
            </TiltCard>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorks;

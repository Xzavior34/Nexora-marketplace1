import { Shield, Users, BadgeCheck, Lock, Banknote, Clock } from "lucide-react";
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { TiltCard } from '@/components/ui/TiltCard';

const trustPoints = [
  {
    icon: BadgeCheck,
    title: "Verified Professionals",
    description: "Join a trusted community of verified artisans, traders, and freelancers — every profile earns a Trust Tier.",
    accent: "text-violet-500",
    bg: "bg-violet-500/10",
  },
  {
    icon: Lock,
    title: "Escrow Protection",
    description: "Your money is held securely until you confirm the task is done. Zero risk, 100% accountability.",
    accent: "text-sky-500",
    bg: "bg-sky-500/10",
  },
  {
    icon: Banknote,
    title: "Naira Payments via Squad",
    description: "Pay and get paid in Naira. Direct bank transfers powered by Squad by GTCO.",
    accent: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    icon: Clock,
    title: "Instant Withdrawals",
    description: "Earned your money? Withdraw to your bank account instantly — no delays, no hidden fees.",
    accent: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    icon: Users,
    title: "Peer Reviews",
    description: "Rate and review after every gig. Build your Nexora reputation and climb the leaderboard.",
    accent: "text-pink-500",
    bg: "bg-pink-500/10",
  },
  {
    icon: Shield,
    title: "Dispute Resolution",
    description: "Issues? Our dedicated support team mediates every dispute fairly and transparently.",
    accent: "text-brand",
    bg: "bg-brand/10",
  },
];

const container = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const cardVariant = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 22 } },
};

const TrustSection = () => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <section id="trust" className="py-24 md:py-32 bg-background relative overflow-hidden">
      <div className="absolute -top-[12%] -left-[8%] w-[45%] h-[45%] rounded-full bg-brand/5 blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-[12%] -right-[8%] w-[45%] h-[45%] rounded-full bg-sky-500/5 blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-block text-sm font-bold text-brand mb-3 uppercase tracking-widest">
            Why Trust Us
          </span>
          <h2 className="text-3xl md:text-5xl font-extrabold text-foreground mb-4 tracking-tight">
            Built for Nigerians,<br className="hidden md:block" /> Secured Like Banks
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-lg leading-relaxed">
            We handle your money with bank-grade security powered by Squad by GTCO.
          </p>
        </motion.div>

        <motion.div
          ref={ref}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto"
          variants={container}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
        >
          {trustPoints.map((point) => (
            <TiltCard
              key={point.title}
              as="div"
              variants={cardVariant}
              className="glass-card rounded-2xl p-6 cursor-default"
              intensity={7}
            >
              <div className={`h-12 w-12 rounded-xl ${point.bg} flex items-center justify-center mb-5`}>
                <point.icon className={`h-6 w-6 ${point.accent}`} />
              </div>
              <h3 className="font-bold text-foreground mb-2 tracking-tight">{point.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{point.description}</p>
            </TiltCard>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default TrustSection;
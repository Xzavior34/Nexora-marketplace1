import { Brain, ShieldCheck, PiggyBank, Sparkles, Activity } from "lucide-react";
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { useRef, useState, useEffect, memo } from 'react';

// ─── Static star positions (computed once at module load, never re-rendered) ──
const STARS = Array.from({ length: 80 }, (_, i) => ({
  id: i,
  left: `${Math.random() * 100}%`,
  top: `${Math.random() * 100}%`,
  size: Math.random() * 2 + 0.5,
  delay: `${(Math.random() * 4).toFixed(2)}s`,
  duration: `${(Math.random() * 3 + 2).toFixed(2)}s`,
}));

const StarField = memo(() => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
    {STARS.map(s => (
      <div
        key={s.id}
        className="absolute rounded-full bg-white animate-twinkle"
        style={{
          left: s.left,
          top: s.top,
          width: s.size,
          height: s.size,
          animationDelay: s.delay,
          animationDuration: s.duration,
          opacity: 0,
        }}
      />
    ))}
  </div>
));
StarField.displayName = 'StarField';

// ─── Pillar data ───────────────────────────────────────────────────────────────
const pillars = [
  {
    id: "ai",
    icon: Brain,
    title: "Smart Match AI",
    badge: "01 — Intelligence",
    description:
      "Our model scores every gig against your verified skills, location, and professional history — returning ranked matches in milliseconds.",
    color: "#6366f1",
    gradient: "from-indigo-500 to-violet-600",
    borderActive: "border-indigo-400/60",
    glowActive: "shadow-[0_0_40px_rgba(99,102,241,0.45)]",
    ring: "bg-indigo-500/20",
  },
  {
    id: "escrow",
    icon: ShieldCheck,
    title: "Squad Escrow",
    badge: "02 — Security",
    description:
      "Every Naira is held by Squad (a GTCO company) until you confirm delivery. Bank-grade protection with zero paperwork.",
    color: "#0ea5e9",
    gradient: "from-sky-400 to-cyan-500",
    borderActive: "border-sky-400/60",
    glowActive: "shadow-[0_0_40px_rgba(14,165,233,0.45)]",
    ring: "bg-sky-500/20",
  },
  {
    id: "ajo",
    icon: PiggyBank,
    title: "Ajo Vault",
    badge: "03 — Wealth",
    description:
      "A micro-percentage of every payout flows automatically into your Ajo Vault, building a savings record that unlocks future micro-loans.",
    color: "#d946ef",
    gradient: "from-fuchsia-500 to-pink-500",
    borderActive: "border-fuchsia-400/60",
    glowActive: "shadow-[0_0_40px_rgba(217,70,239,0.45)]",
    ring: "bg-fuchsia-500/20",
  },
];

// ─── Pillar card ───────────────────────────────────────────────────────────────
const PillarCard = memo(({
  p, index, isActive, onEnter, onLeave
}: {
  p: typeof pillars[0];
  index: number;
  isActive: boolean;
  onEnter: () => void;
  onLeave: () => void;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 40, filter: 'blur(10px)' }}
    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
    transition={{ duration: 0.7, delay: 0.5 + index * 0.18, ease: [0.22, 1, 0.36, 1] }}
    onMouseEnter={onEnter}
    onMouseLeave={onLeave}
    className="relative"
  >
    <motion.div
      animate={{ scale: isActive ? 1.04 : 1 }}
      transition={{ type: 'spring', stiffness: 250, damping: 22 }}
      className={`relative rounded-3xl border backdrop-blur-md p-6 cursor-pointer overflow-hidden transition-colors duration-500 ${
        isActive
          ? `${p.borderActive} bg-white/8 ${p.glowActive}`
          : 'border-white/8 bg-white/4 hover:border-white/15'
      }`}
    >
      {/* Gradient wash */}
      <motion.div
        className={`absolute inset-0 bg-gradient-to-br ${p.gradient} rounded-3xl pointer-events-none`}
        animate={{ opacity: isActive ? 0.15 : 0 }}
        transition={{ duration: 0.4 }}
      />

      {/* Laser sweep */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            className="absolute top-0 bottom-0 w-[2px] pointer-events-none"
            style={{
              background: `linear-gradient(to bottom, transparent, ${p.color}, transparent)`,
              filter: `drop-shadow(0 0 6px ${p.color})`,
            }}
            initial={{ left: '-5%', opacity: 0 }}
            animate={{ left: '108%', opacity: [0, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 1.2, ease: 'easeInOut' }}
          />
        )}
      </AnimatePresence>

      <div className="relative z-10 flex flex-col gap-4">
        <span className="self-start text-[10px] font-bold tracking-[0.18em] uppercase px-2.5 py-1 rounded-full border border-white/10 text-white/40 bg-white/5">
          {p.badge}
        </span>

        {/* Icon with shake on active */}
        <motion.div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 ${isActive ? `bg-gradient-to-br ${p.gradient}` : 'bg-white/8'}`}
          animate={isActive ? { rotate: [0, -6, 6, -3, 0] } : { rotate: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p.icon className={`w-7 h-7 transition-colors duration-500 ${isActive ? 'text-white' : 'text-white/40'}`} />
        </motion.div>

        <div>
          <h3 className={`text-lg font-bold tracking-tight mb-2 transition-colors duration-500 ${isActive ? 'text-white' : 'text-white/60'}`}>
            {p.title}
          </h3>
          <p className={`text-sm leading-relaxed transition-colors duration-500 ${isActive ? 'text-white/65' : 'text-white/30'}`}>
            {p.description}
          </p>
        </div>

        <AnimatePresence>
          {isActive && (
            <motion.div
              className="flex items-center gap-2"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: p.color }} />
              <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: p.color }}>
                Active Node
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  </motion.div>
));
PillarCard.displayName = 'PillarCard';

// ─── Main Component ────────────────────────────────────────────────────────────
export default function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const [activeId, setActiveId] = useState<string | null>(null);

  return (
    <section id="how-it-works" ref={ref} className="relative py-28 bg-[#030303] overflow-hidden text-white">
      {/* ── Star field background ── */}
      <StarField />

      {/* ── Radial gradient wash ── */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_40%,rgba(99,102,241,0.10)_0%,transparent_70%)] pointer-events-none" />

      {/* ── Grid texture ── */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:36px_36px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_50%,#000_50%,transparent_100%)] pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">

        {/* ── Header ── */}
        <motion.div
          className="text-center mb-20"
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-7 shadow-[0_0_20px_rgba(99,102,241,0.15)]">
            <Activity className="h-3.5 w-3.5 text-indigo-400 animate-pulse" />
            <span className="text-indigo-400 text-xs font-bold tracking-[0.15em] uppercase">The Intelligent Economy Stack</span>
          </div>

          <h2 className="text-4xl md:text-6xl font-black mb-5 tracking-tighter leading-none">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/40">Three Pillars.</span>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-sky-400 to-fuchsia-400">
              One Engine.
            </span>
          </h2>
          <p className="text-white/40 max-w-md mx-auto text-base leading-relaxed">
            Hover each node to explore the autonomous systems powering Nigeria's most advanced gig economy.
          </p>
        </motion.div>

        {/* ── Main 3-column reactor ── */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-8 md:gap-6 items-center max-w-5xl mx-auto">

          {/* LEFT — AI pillar */}
          <div className="flex flex-col gap-6 md:justify-center">
            <PillarCard
              p={pillars[0]}
              index={0}
              isActive={activeId === pillars[0].id}
              onEnter={() => setActiveId(pillars[0].id)}
              onLeave={() => setActiveId(null)}
            />
          </div>

          {/* CENTER — Core orb with pure-CSS spinning rings */}
          <motion.div
            className="flex items-center justify-center"
            initial={{ scale: 0, opacity: 0 }}
            animate={inView ? { scale: 1, opacity: 1 } : {}}
            transition={{ type: 'spring', stiffness: 80, damping: 16, delay: 0.2 }}
          >
            <div className="relative w-48 h-48 flex items-center justify-center flex-shrink-0">
              {/* CSS-animated rings — zero JS overhead */}
              <div className="absolute w-full h-full rounded-full border border-indigo-500/25 animate-[spin_12s_linear_infinite]" />
              <div className="absolute w-[115%] h-[115%] rounded-full border border-dashed border-white/8 animate-[spin_20s_linear_infinite_reverse]" />
              <div
                className="absolute w-[88%] h-[88%] rounded-full animate-[spin_7s_linear_infinite]"
                style={{ border: '2px solid transparent', borderTopColor: '#6366f1', borderRightColor: '#0ea5e9' }}
              />

              {/* Glow aura */}
              <div
                className="absolute w-full h-full rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%)' }}
              />

              {/* Core disc */}
              <div
                className={`relative w-28 h-28 rounded-full flex flex-col items-center justify-center z-10 border-2 transition-all duration-500 ${
                  activeId ? 'border-white/50 shadow-[0_0_40px_rgba(255,255,255,0.3)]' : 'border-indigo-500/70 shadow-[0_0_60px_rgba(99,102,241,0.55)]'
                }`}
                style={{ background: '#050505' }}
              >
                <Sparkles className={`w-9 h-9 transition-colors duration-500 ${activeId ? 'text-white' : 'text-indigo-400'}`} />
              </div>
              <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[9px] font-extrabold tracking-[0.25em] text-white/40 uppercase whitespace-nowrap">
                Nexora Core
              </span>
            </div>
          </motion.div>

          {/* RIGHT — Escrow + Ajo stacked */}
          <div className="flex flex-col gap-6">
            {[pillars[1], pillars[2]].map((p, i) => (
              <PillarCard
                key={p.id}
                p={p}
                index={i + 1}
                isActive={activeId === p.id}
                onEnter={() => setActiveId(p.id)}
                onLeave={() => setActiveId(null)}
              />
            ))}
          </div>
        </div>

        {/* ── Stats bar ── */}
        <motion.div
          className="mt-20 pt-12 border-t border-white/5 grid grid-cols-3 gap-6 max-w-2xl mx-auto text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 1.0 }}
        >
          {[
            { label: 'Match Accuracy', value: '96%',     color: '#6366f1' },
            { label: 'Escrow Success', value: '99.9%',   color: '#0ea5e9' },
            { label: 'Avg Vault Growth', value: '₦8.4k/mo', color: '#d946ef' },
          ].map(stat => (
            <div key={stat.label}>
              <p className="text-2xl md:text-3xl font-black" style={{ color: stat.color }}>{stat.value}</p>
              <p className="text-[11px] text-white/30 mt-1 font-semibold tracking-wider uppercase">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

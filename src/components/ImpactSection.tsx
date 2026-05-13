import { TrendingUp, Quote, CheckCircle2, Users, Briefcase, Shield, Zap } from "lucide-react";
import { motion, useInView } from 'framer-motion';
import { useRef, useState, useEffect, memo } from 'react';

const CountUp = memo(({ target, suffix = '' }: { target: number; suffix?: string }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let v = 0; const step = target / 60;
    const id = setInterval(() => { v += step; if (v >= target) { setVal(target); clearInterval(id); } else setVal(Math.floor(v)); }, 25);
    return () => clearInterval(id);
  }, [inView, target]);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
});
CountUp.displayName = 'CountUp';

const reviews = [
  { name: "Adebayo O.", role: "Electrician, Lagos", text: "I earned ₦340k in 2 months. The escrow means I never chase payments anymore.", avatar: "AO" },
  { name: "Chioma N.", role: "UI/UX Designer, Abuja", text: "AI matching sends me perfect gigs. My income doubled since joining Nexora.", avatar: "CN" },
  { name: "Ibrahim M.", role: "Plumber, Kano", text: "The Ajo Vault saved me ₦85k without trying. First time having emergency funds.", avatar: "IM" },
  { name: "Funke A.", role: "Caterer, PH", text: "Clients see my Trust Tier and hire instantly. No more hours negotiating on WhatsApp.", avatar: "FA" },
];

export default function ImpactSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section ref={ref} className="relative py-28 bg-[#030303] overflow-hidden text-white">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_50%,rgba(217,70,239,0.06)_0%,transparent_70%)] pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div className="text-center mb-16" initial={{ opacity: 0, y: 24 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.8 }}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/20 mb-7">
            <TrendingUp className="h-3.5 w-3.5 text-fuchsia-400 animate-pulse" />
            <span className="text-[11px] font-bold text-fuchsia-400 tracking-[0.15em] uppercase">Real-World Impact</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-5 leading-none">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 via-violet-400 to-indigo-400">Problems We Solve.</span>
          </h2>
          <p className="text-white/40 max-w-lg mx-auto text-base">Real challenges facing Nigeria's gig economy — and how Nexora addresses them.</p>
        </motion.div>

        {/* Stats */}
        <motion.div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mb-16" initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.8, delay: 0.2 }}>
          {[
            { value: 2400, suffix: '+', label: 'Active Earners', color: 'from-indigo-500 to-violet-500' },
            { value: 8900, suffix: '+', label: 'Gigs Completed', color: 'from-sky-500 to-cyan-500' },
            { value: 12, suffix: 'M+', label: '₦ Transacted', color: 'from-emerald-500 to-green-500' },
            { value: 98, suffix: '%', label: 'Satisfaction', color: 'from-fuchsia-500 to-pink-500' },
          ].map(s => (
            <div key={s.label} className="p-5 rounded-2xl bg-white/[0.04] border border-white/8 text-center group hover:border-white/20 transition-colors">
              <p className={`text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br ${s.color}`}><CountUp target={s.value} suffix={s.suffix} /></p>
              <p className="text-[11px] text-white/35 mt-1 font-semibold tracking-wider uppercase">{s.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Problem cards — each with unique layout */}
        <div className="max-w-5xl mx-auto space-y-6 mb-20">

          {/* Problem 1: Wide horizontal — Payment trust deficit */}
          <motion.div className="rounded-3xl border border-sky-500/20 bg-gradient-to-r from-sky-500/[0.06] to-transparent p-8 relative overflow-hidden"
            initial={{ opacity: 0, x: -40 }} animate={inView ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.7, delay: 0.3 }}>
            <div className="absolute top-0 right-0 w-48 h-48 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6 items-center">
              <div>
                <span className="text-[10px] font-bold text-red-400/80 tracking-wider uppercase mb-2 block">The Challenge</span>
                <p className="text-white/70 text-sm leading-relaxed">Many freelancers in Nigeria's informal economy face payment delays or non-payment after completing work, creating a trust deficit that limits economic growth.</p>
              </div>
              <div className="hidden md:flex flex-col items-center gap-1"><Zap className="w-5 h-5 text-sky-400" /><div className="w-px h-8 bg-sky-500/30" /></div>
              <div>
                <span className="text-[10px] font-bold text-sky-400 tracking-wider uppercase mb-2 block">Nexora Solution</span>
                <p className="text-white text-sm leading-relaxed font-medium">Squad Escrow locks client funds before work begins. Freelancers are guaranteed payment upon delivery confirmation.</p>
                <div className="mt-3 flex items-center gap-2"><Shield className="w-4 h-4 text-sky-400" /><span className="text-xs font-bold text-sky-400">99.9% payment success rate</span></div>
              </div>
            </div>
          </motion.div>

          {/* Problem 2: Two-col cards — Discovery */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div className="rounded-3xl border border-indigo-500/20 bg-indigo-500/[0.04] p-7 relative overflow-hidden"
              initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay: 0.4 }}>
              <Briefcase className="w-10 h-10 text-indigo-400/20 absolute top-5 right-5" />
              <span className="text-[10px] font-bold text-red-400/80 tracking-wider uppercase mb-2 block">The Challenge</span>
              <p className="text-white/70 text-sm leading-relaxed mb-4">Finding reliable, skilled professionals often takes days of word-of-mouth searching and phone calls across cities.</p>
              <div className="h-px bg-white/8 my-4" />
              <span className="text-[10px] font-bold text-indigo-400 tracking-wider uppercase mb-2 block">Nexora Solution</span>
              <p className="text-white text-sm leading-relaxed font-medium">AI-powered matching surfaces verified professionals ranked by skill compatibility in under 2 seconds.</p>
              <div className="mt-3 flex gap-2">{[92, 87, 74].map(s => <span key={s} className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-full">{s}% match</span>)}</div>
            </motion.div>

            {/* Problem 3: Donut chart style — Savings gap */}
            <motion.div className="rounded-3xl border border-fuchsia-500/20 bg-fuchsia-500/[0.04] p-7 relative overflow-hidden"
              initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay: 0.5 }}>
              <div className="flex items-start gap-5">
                <div className="shrink-0">
                  <svg width="80" height="80" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                    <motion.circle cx="18" cy="18" r="15" fill="none" stroke="#d946ef" strokeWidth="3" strokeDasharray="94.2" strokeLinecap="round"
                      initial={{ strokeDashoffset: 94.2 }} animate={inView ? { strokeDashoffset: 94.2 * 0.12 } : {}} transition={{ duration: 1.5, delay: 0.6 }}
                      transform="rotate(-90 18 18)" />
                    <text x="18" y="20" textAnchor="middle" fill="#d946ef" fontSize="7" fontWeight="bold">88%</text>
                  </svg>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-red-400/80 tracking-wider uppercase mb-2 block">The Challenge</span>
                  <p className="text-white/70 text-sm leading-relaxed mb-3">Most gig workers lack formal savings infrastructure, leaving them vulnerable to emergencies.</p>
                  <span className="text-[10px] font-bold text-fuchsia-400 tracking-wider uppercase mb-2 block">Nexora Solution</span>
                  <p className="text-white text-sm leading-relaxed font-medium">Ajo Vault auto-saves a micro-percentage of every payout — building savings without friction.</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Problem 4: Wide — Dispute resolution with timeline */}
          <motion.div className="rounded-3xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/[0.05] to-transparent p-8"
            initial={{ opacity: 0, x: 40 }} animate={inView ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.7, delay: 0.6 }}>
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="flex-1">
                <span className="text-[10px] font-bold text-red-400/80 tracking-wider uppercase mb-2 block">The Challenge</span>
                <p className="text-white/70 text-sm leading-relaxed">Payment disputes between clients and freelancers often have no resolution path, damaging trust on both sides.</p>
              </div>
              <div className="flex-1">
                <span className="text-[10px] font-bold text-emerald-400 tracking-wider uppercase mb-2 block">Nexora Solution</span>
                <p className="text-white text-sm leading-relaxed font-medium mb-3">Built-in dispute resolution with human mediators who review evidence from both parties.</p>
                <div className="flex items-center gap-3 text-xs">
                  {['Dispute Filed', 'Evidence Review', 'Resolution'].map((s, i) => (
                    <div key={s} className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${i < 3 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-white/30'}`}>{i + 1}</div>
                      <span className="text-white/50 hidden sm:inline">{s}</span>
                      {i < 2 && <div className="w-6 h-px bg-emerald-500/30 hidden sm:block" />}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Reviews */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.8, delay: 0.7 }}>
          <h3 className="text-2xl font-bold text-white/90 mb-2 text-center">What Real Users Say</h3>
          <p className="text-white/35 text-sm text-center mb-8">From verified Nexora professionals across Nigeria</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
            {reviews.map((r, i) => (
              <motion.div key={r.name} className="p-5 rounded-2xl bg-white/[0.04] border border-white/8 hover:border-fuchsia-500/30 transition-colors relative overflow-hidden"
                initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5, delay: 0.8 + i * 0.1 }}>
                <Quote className="absolute top-3 right-3 w-8 h-8 text-white/5" />
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-fuchsia-500 to-indigo-500 flex items-center justify-center text-sm font-bold">{r.avatar}</div>
                  <div><p className="text-sm font-bold text-white">{r.name}</p><p className="text-[10px] text-white/40">{r.role}</p></div>
                </div>
                <p className="text-xs text-white/55 leading-relaxed italic">"{r.text}"</p>
                <div className="flex gap-0.5 mt-3">{[...Array(5)].map((_, j) => <span key={j} className="text-yellow-400 text-xs">★</span>)}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

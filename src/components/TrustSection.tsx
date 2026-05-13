import {
  Shield, Users, BadgeCheck, Lock, Banknote, Clock,
  CheckCircle2, MessageSquare, BarChart3,
  Briefcase, UserCheck, Star, Zap, RefreshCw
} from "lucide-react";
import { motion, useInView } from 'framer-motion';
import { useRef, useState, useEffect, memo } from 'react';

// ── Living network canvas (runs on RAF, not React state) ──
const NetworkCanvas = memo(() => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = canvas.offsetWidth;
    let H = canvas.offsetHeight;
    canvas.width = W;
    canvas.height = H;

    const COUNT = 50;
    const pts = Array.from({ length: COUNT }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.5 + 0.5,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
      }
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 120) {
            ctx.strokeStyle = `rgba(99,102,241,${(1 - d / 120) * 0.3})`;
            ctx.lineWidth = 0.7;
            ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.stroke();
          }
        }
      }
      for (const p of pts) {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(139,92,246,0.65)'; ctx.fill();
      }
      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);

    const onResize = () => { W = canvas.offsetWidth; H = canvas.offsetHeight; canvas.width = W; canvas.height = H; };
    window.addEventListener('resize', onResize, { passive: true });
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener('resize', onResize); };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden />;
});
NetworkCanvas.displayName = 'NetworkCanvas';

// ── Feature data ──
const features = [
  { icon: BadgeCheck, title: "Verified Pros", desc: "KYC verified — every profile earns a public Trust Tier.", accent: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20" },
  { icon: Lock, title: "Squad Escrow", desc: "GTCO-backed funds lock until you approve delivery.", accent: "text-sky-400", bg: "bg-sky-500/10", border: "border-sky-500/20" },
  { icon: Briefcase, title: "Post Gigs", desc: "Post any job in seconds — AI broadcasts to top talent.", accent: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20" },
  { icon: UserCheck, title: "Hire Profiles", desc: "Browse portfolios and Trust Tiers, hire in one tap.", accent: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  { icon: MessageSquare, title: "Real-time Chat", desc: "Encrypted client-freelancer chat built right in.", accent: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20" },
  { icon: BarChart3, title: "Analytics", desc: "Track gig history, income trends, and forecasts.", accent: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  { icon: Banknote, title: "Naira Payments", desc: "Instant bank transfers via Squad. No delays.", accent: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20" },
  { icon: Clock, title: "Instant Withdrawals", desc: "Withdraw to any Nigerian bank account instantly.", accent: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20" },
  { icon: Users, title: "Peer Reviews", desc: "Rate every gig — build a reputation that compounds.", accent: "text-pink-400", bg: "bg-pink-500/10", border: "border-pink-500/20" },
  { icon: Zap, title: "AI Matching", desc: "Ranks every gig against your skills in milliseconds.", accent: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20" },
  { icon: Star, title: "Trust Tiers", desc: "Bronze → Gold → Platinum. Unlock premium gig access.", accent: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20" },
  { icon: Shield, title: "Dispute Resolution", desc: "Human mediators resolve disputes fairly and fast.", accent: "text-brand", bg: "bg-brand/10", border: "border-brand/20" },
];

const escrowNodes = [
  { label: "Client Pays", icon: Users, color: "text-sky-400", glow: "border-sky-500 shadow-[0_0_20px_rgba(14,165,233,0.4)]" },
  { label: "Funds Locked", icon: Lock, color: "text-brand", glow: "border-brand shadow-[0_0_25px_rgba(167,139,250,0.5)]" },
  { label: "Gig Delivered", icon: CheckCircle2, color: "text-emerald-400", glow: "border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)]" },
];

export default function TrustSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const id = setInterval(() => setStep(s => (s + 1) % 3), 2800);
    return () => clearInterval(id);
  }, [inView]);

  return (
    <section id="trust" ref={ref} className="relative py-28 bg-[#050505] overflow-hidden text-white">
      <NetworkCanvas />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_30%,rgba(99,102,241,0.12)_0%,transparent_70%)] pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div className="text-center mb-20" initial={{ opacity: 0, y: 24 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.8 }}>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 mb-7">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] font-bold text-emerald-400 tracking-[0.18em] uppercase">Bank-Grade Security</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter leading-none mb-6">
            <span className="text-white">Built for Nigerians,</span><br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400">Secured Like Banks.</span>
          </h2>
          <p className="text-white/50 max-w-2xl mx-auto text-lg leading-relaxed">
            Post gigs, hire talent, chat, track earnings — all secured end-to-end by GTCO-backed Squad Escrow.
          </p>
        </motion.div>

        {/* Main layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 max-w-7xl mx-auto items-start">
          {/* Features grid */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {features.map((f, i) => (
              <motion.div key={f.title} className={`group relative p-3.5 rounded-2xl border ${f.border} bg-white/[0.04] hover:bg-white/[0.08] transition-all duration-300 overflow-hidden cursor-default`}
                initial={{ opacity: 0, x: -20 }} animate={inView ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.4, delay: i * 0.05 }}>
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/[0.03] to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none" />
                <div className="flex items-start gap-3 relative z-10">
                  <div className={`h-9 w-9 shrink-0 rounded-lg ${f.bg} flex items-center justify-center`}>
                    <f.icon className={`h-4 w-4 ${f.accent}`} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">{f.title}</h3>
                    <p className="text-[11px] text-white/40 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Escrow dashboard */}
          <div className="lg:col-span-5">
            <motion.div className="rounded-[2rem] border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-2xl overflow-hidden"
              initial={{ opacity: 0, scale: 0.92 }} animate={inView ? { opacity: 1, scale: 1 } : {}} transition={{ duration: 0.9, delay: 0.3 }}>
              <div className="flex justify-between items-center px-6 py-4 border-b border-white/8">
                <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-brand" /><span className="font-bold text-sm tracking-wider">SQUAD ESCROW</span></div>
                <div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500" /><div className="w-3 h-3 rounded-full bg-yellow-500" /><div className="w-3 h-3 rounded-full bg-green-500" /></div>
              </div>
              <div className="px-6 py-8">
                <div className="flex items-center justify-between relative">
                  <div className="absolute left-[15%] right-[15%] top-8 h-px bg-white/8" />
                  <motion.div className="absolute left-[15%] top-8 h-px bg-gradient-to-r from-sky-400 to-emerald-400"
                    animate={{ width: step === 0 ? '0%' : step === 1 ? '35%' : '70%' }} transition={{ duration: 1 }}
                    style={{ filter: 'drop-shadow(0 0 4px rgba(14,165,233,0.8))' }} />
                  {escrowNodes.map((es, i) => {
                    const isCurrent = step === i;
                    return (
                      <div key={es.label} className="relative flex flex-col items-center gap-3 z-10">
                        <div className={`w-16 h-16 rounded-full border-2 flex items-center justify-center bg-[#0a0a0a] transition-all duration-500 ${isCurrent ? es.glow : 'border-white/10'}`}>
                          {isCurrent && i === 1 && <motion.div className="absolute inset-0 rounded-full border-t-2 border-brand" animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }} />}
                          <es.icon className={`w-6 h-6 transition-colors duration-500 ${isCurrent ? es.color : 'text-white/20'}`} />
                        </div>
                        <span className={`font-semibold text-xs transition-colors duration-500 ${isCurrent ? 'text-white' : 'text-white/30'}`}>{es.label}</span>
                        {isCurrent && i === 0 && <span className="absolute -bottom-6 text-[10px] text-sky-400 font-mono animate-pulse">₦50,000</span>}
                        {isCurrent && i === 2 && <span className="absolute -bottom-6 text-[10px] text-emerald-400 font-mono animate-pulse">+₦50,000</span>}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-12 bg-black/50 rounded-xl p-3.5 border border-white/5 font-mono text-xs flex items-center gap-2 text-white/50">
                  <span className="text-brand">&gt;</span>
                  <motion.span key={step} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    {step === 0 && 'INITIATING_SQUAD_PAYMENT_GATEWAY...'}
                    {step === 1 && 'FUNDS_SECURED. AWAITING_APPROVAL...'}
                    {step === 2 && 'APPROVAL_RECEIVED. TRANSFERRING...'}
                  </motion.span>
                </div>
                <div className="flex justify-center gap-2 mt-4">
                  {[0, 1, 2].map(i => <div key={i} className={`h-1 rounded-full transition-all duration-500 ${step === i ? 'w-6 bg-brand' : 'w-2 bg-white/15'}`} />)}
                </div>
              </div>
            </motion.div>

            <div className="mt-4 grid grid-cols-2 gap-2.5">
              {[{ l: '2,400+ Earners', c: 'text-indigo-400' }, { l: '₦12M+ Escrow', c: 'text-sky-400' }, { l: '99.9% Success', c: 'text-emerald-400' }, { l: '<2s Withdrawals', c: 'text-amber-400' }].map(p => (
                <div key={p.l} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/8">
                  <div className={`w-1.5 h-1.5 rounded-full ${p.c.replace('text-', 'bg-')} animate-pulse`} />
                  <span className={`text-[11px] font-bold ${p.c}`}>{p.l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
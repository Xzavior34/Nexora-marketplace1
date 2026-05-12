import { useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Brain, PiggyBank, Sparkles, Users, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect, useRef } from 'react';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from 'lucide-react';
import { Hero3DBackground } from '@/components/Hero3DBackground';
import { motion, useInView, useMotionValue, useSpring, useTransform } from 'framer-motion';

// Magnetic button wrapper
function MagneticButton({ children, className, onClick, variant, size }: any) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 200, damping: 20 });
  const springY = useSpring(y, { stiffness: 200, damping: 20 });

  const handleMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    x.set((e.clientX - cx) * 0.18);
    y.set((e.clientY - cy) * 0.18);
  };
  const handleLeave = () => { x.set(0); y.set(0); };

  return (
    <motion.div ref={ref} onMouseMove={handleMove} onMouseLeave={handleLeave} style={{ x: springX, y: springY }}>
      <Button variant={variant} size={size} className={className} onClick={onClick}>
        {children}
      </Button>
    </motion.div>
  );
}

// Animated counter
function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 1400;
    const step = value / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= value) { setDisplay(value); clearInterval(timer); }
      else setDisplay(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [inView, value]);

  return <span ref={ref}>{display.toLocaleString()}{suffix}</span>;
}

// Cycling notification mock
const gigNotifications = [
  { title: 'Logo Design — ₦15,000', match: 94, category: 'Design', time: '2m ago' },
  { title: 'React Dev Needed — ₦45,000', match: 89, category: 'Tech', time: '5m ago' },
  { title: 'Content Writer — ₦8,000', match: 77, category: 'Writing', time: '9m ago' },
];

const container = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 28, filter: 'blur(6px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { type: 'spring', stiffness: 280, damping: 24 } },
};

const HeroSection = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifIndex, setNotifIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setNotifIndex(i => (i + 1) % gigNotifications.length), 3000);
    return () => clearInterval(t);
  }, []);

  const handleGetStarted = () => navigate(user ? '/dashboard' : '/auth');
  const handleBrowseGigs = () => navigate('/gigs');

  const features = [
    { icon: Brain,      title: 'Smart Match AI' },
    { icon: ShieldCheck, title: 'Squad Escrow'  },
    { icon: PiggyBank,  title: 'Ajo Vault'       },
  ];

  const notif = gigNotifications[notifIndex];

  return (
    <section className="relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* 3D Background */}
      <Hero3DBackground />

      {/* Gradient Mesh */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-mesh animate-mesh-slow opacity-50" />
        <div className="absolute -top-[25%] -right-[15%] w-[75%] h-[75%] rounded-full bg-gradient-to-br from-brand/15 to-sky-400/15 blur-[140px] opacity-60 animate-float" />
        <div className="absolute -bottom-[20%] -left-[10%] w-[55%] h-[55%] rounded-full bg-gradient-to-tr from-violet-500/10 to-brand/10 blur-[110px] opacity-50 animate-float" style={{ animationDelay: '2.5s' }} />
      </div>

      <div className="container relative z-10 mx-auto px-4 py-6">
        {/* Nav */}
        <nav className="flex items-center justify-between py-4">
          <motion.div className="flex items-center gap-3 group" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-brand-foreground shadow-brand transition-transform duration-300 group-hover:scale-105">
              <span className="text-xl font-extrabold">N</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight text-foreground">Nexora</span>
              <span className="text-[10px] text-muted-foreground font-semibold tracking-widest uppercase">The Intelligent Economy</span>
            </div>
          </motion.div>

          <motion.div className="hidden lg:flex items-center gap-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            {['How It Works', 'Categories', 'Why Trust Nexora'].map((label, i) => (
              <a key={label} href={`#${label.toLowerCase().replace(/ /g, '-')}`} className="text-muted-foreground hover:text-foreground transition-colors font-medium text-sm relative group">
                {label}
                <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-brand transition-all duration-300 group-hover:w-full" />
              </a>
            ))}
          </motion.div>

          <motion.div className="hidden sm:flex items-center gap-3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
            {loading ? null : user ? (
              <Button onClick={() => navigate('/dashboard')}>Dashboard</Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate('/auth')}>Log In</Button>
                <Button onClick={() => navigate('/auth')} className="shadow-brand">Get Started</Button>
              </>
            )}
          </motion.div>

          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="sm:hidden text-foreground"><Menu className="h-6 w-6" /></Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 bg-background border-border">
              <div className="flex flex-col gap-6 mt-8">
                <nav className="flex flex-col gap-2">
                  {['How It Works', 'Categories', 'Why Trust Nexora'].map(label => (
                    <a key={label} href={`#${label.toLowerCase().replace(/ /g,'-')}`} onClick={() => setMobileMenuOpen(false)} className="px-3 py-3 rounded-lg font-medium hover:bg-muted">{label}</a>
                  ))}
                </nav>
                <div className="flex flex-col gap-3">
                  {user ? (
                    <Button onClick={() => { navigate('/dashboard'); setMobileMenuOpen(false); }}>Dashboard</Button>
                  ) : (
                    <>
                      <Button variant="outline" onClick={() => { navigate('/auth'); setMobileMenuOpen(false); }}>Log In</Button>
                      <Button onClick={() => { navigate('/auth'); setMobileMenuOpen(false); }}>Get Started</Button>
                    </>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </nav>

        {/* Hero Content */}
        <div className="mt-14 md:mt-20 grid grid-cols-1 lg:grid-cols-2 gap-14 items-center max-w-7xl mx-auto">
          {/* Left — Text */}
          <motion.div className="text-left" variants={container} initial="hidden" animate="visible">
            <motion.div variants={item} className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-4 py-2 mb-6 border border-brand/20">
              <Sparkles className="h-4 w-4 text-brand" />
              <span className="text-sm font-semibold text-brand">Built for every Nigerian student freelancer</span>
            </motion.div>

            <motion.h1 variants={item} className="text-4xl md:text-5xl lg:text-[68px] font-extrabold tracking-tight text-foreground leading-[1.08] mb-6">
              Nigeria's Most<br />
              <span className="text-gradient-primary">Intelligent</span><br />
              Freelance Economy.
            </motion.h1>

            <motion.p variants={item} className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed font-medium max-w-xl">
              From FUNAAB to every campus. Turn your skills into real income — AI-matched gigs, Squad-secured escrow, and an Ajo Vault that builds your financial future.
            </motion.p>

            <motion.div variants={item} className="flex flex-col sm:flex-row items-center gap-4 mb-12">
              <MagneticButton size="xl" className="w-full sm:w-auto group text-base px-8 h-14 shadow-brand" onClick={handleGetStarted}>
                Start Earning Today
                <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </MagneticButton>
              <MagneticButton variant="secondary" size="xl" className="w-full sm:w-auto text-base px-8 h-14" onClick={handleBrowseGigs}>
                Explore Marketplace
              </MagneticButton>
            </motion.div>

            <motion.div variants={item} className="flex flex-wrap items-center gap-6 md:gap-8 text-foreground">
              {features.map(f => (
                <div key={f.title} className="flex items-center gap-2 group">
                  <div className="h-10 w-10 rounded-xl bg-brand/10 flex items-center justify-center group-hover:bg-brand/20 transition-colors">
                    <f.icon className="h-5 w-5 text-brand" />
                  </div>
                  <span className="text-sm font-semibold">{f.title}</span>
                </div>
              ))}
            </motion.div>

            {/* Social proof counters */}
            <motion.div variants={item} className="mt-10 grid grid-cols-3 gap-4 border-t border-border pt-8">
              {[
                { value: 2400, label: 'Active Students', suffix: '+' },
                { value: 8900, label: 'Gigs Matched',    suffix: '+' },
                { value: 12,   label: 'M₦ in Escrow',   suffix: 'M+' },
              ].map(stat => (
                <div key={stat.label}>
                  <p className="text-2xl font-extrabold text-foreground tabular-nums">
                    <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right — Animated mock */}
          <motion.div
            className="relative hidden lg:block"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <div className="relative w-full h-[580px]">
              {/* Main mock card */}
              <div className="absolute top-0 right-0 w-[88%] glass-premium rounded-3xl p-6 shadow-depth-xl z-20">
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm font-semibold text-foreground">AI Match Engine — Live</span>
                </div>
                {/* Live cycling notification */}
                <motion.div
                  key={notifIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                  className="rounded-2xl border border-border/40 bg-background/60 p-4 mb-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-brand">{notif.category}</span>
                    <span className="text-[11px] text-muted-foreground">{notif.time}</span>
                  </div>
                  <p className="font-bold text-foreground mb-2">{notif.title}</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-brand to-sky-400 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${notif.match}%` }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                      />
                    </div>
                    <span className="text-xs font-bold text-brand">{notif.match}% match</span>
                  </div>
                </motion.div>
                {/* Mock gig list */}
                {[
                  { cat: 'Design', price: '₦12,000', score: 82 },
                  { cat: 'Logistics', price: '₦5,000', score: 71 },
                ].map((g, i) => (
                  <div key={i} className="rounded-xl border border-border/20 bg-background/40 p-3 mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground">{g.cat}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">{g.score}% match</span>
                      <span className="text-xs font-bold text-brand">{g.price}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Wallet stat card */}
              <motion.div
                className="absolute bottom-12 left-0 w-[60%] glass-premium rounded-2xl p-5 shadow-depth-xl z-30"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              >
                <p className="text-xs text-muted-foreground mb-1">Wallet Balance</p>
                <p className="text-2xl font-extrabold text-foreground">₦87,500</p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  <span className="text-xs text-green-500 font-semibold">+₦12,000 this week</span>
                </div>
              </motion.div>

              {/* Trust badge */}
              <motion.div
                className="absolute top-[45%] -right-6 glass-strong p-4 rounded-2xl shadow-depth-xl z-40"
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                    <ShieldCheck className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Escrow Active</p>
                    <p className="text-xs text-muted-foreground">₦35,000 protected</p>
                  </div>
                </div>
              </motion.div>

              {/* Users badge */}
              <motion.div
                className="absolute bottom-0 right-6 glass p-3 rounded-xl shadow-depth-md z-30"
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
              >
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-brand" />
                  <span className="text-xs font-bold">2,400+ earners</span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;

import { useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Zap, Brain, Menu, Sparkles, TrendingUp, PiggyBank, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const HeroSection = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const handleGetStarted = () => navigate(user ? '/dashboard' : '/auth');
  const handleBrowseGigs = () => navigate('/gigs');

  return (
    <section className="relative min-h-screen overflow-hidden bg-gradient-hero">
      {/* Bright animated orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-accent/25 blur-[120px] animate-pulse-slow" />
        <div className="absolute top-1/4 -left-32 h-[400px] w-[400px] rounded-full bg-primary/30 blur-[100px] animate-float" />
        <div className="absolute bottom-1/3 right-1/4 h-[300px] w-[300px] rounded-full bg-accent/20 blur-[80px] animate-pulse-slow" style={{ animationDelay: '2s' }} />
        <div className="absolute inset-0 bg-gradient-mesh opacity-60" />
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }} />
      </div>

      <div className="container relative z-10 mx-auto px-4 py-6">
        {/* Nav */}
        <nav className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3 group">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 group-hover:bg-white/15 transition-all duration-300 shadow-glow">
              <span className="text-2xl font-extrabold bg-gradient-to-br from-white to-accent bg-clip-text text-transparent">N</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-white tracking-tight">Nexora</span>
              <span className="text-[10px] text-white/70 font-medium tracking-widest uppercase">Intelligent Freelance Economy</span>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-8">
            <a href="#how-it-works" className="text-white/80 hover:text-white transition-colors font-medium text-sm">How It Works</a>
            <a href="#categories" className="text-white/80 hover:text-white transition-colors font-medium text-sm">Categories</a>
            <a href="#trust" className="text-white/80 hover:text-white transition-colors font-medium text-sm">Why Trust Nexora</a>
          </div>

          <div className="hidden sm:flex items-center gap-3">
            {loading ? null : user ? (
              <Button variant="gold" size="sm" onClick={() => navigate('/dashboard')} className="min-h-[44px]">Dashboard</Button>
            ) : (
              <>
                <Button variant="hero-outline" size="sm" className="min-h-[44px]" onClick={() => navigate('/auth')}>Log In</Button>
                <Button variant="gold" size="sm" onClick={() => navigate('/auth')} className="min-h-[44px]">Get Started</Button>
              </>
            )}
          </div>

          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="sm:hidden min-h-[44px] min-w-[44px] text-white">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 bg-background">
              <div className="flex flex-col gap-6 mt-8">
                <nav className="flex flex-col gap-2">
                  <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="px-3 py-3 rounded-lg font-medium hover:bg-muted min-h-[44px] flex items-center">How It Works</a>
                  <a href="#categories" onClick={() => setMobileMenuOpen(false)} className="px-3 py-3 rounded-lg font-medium hover:bg-muted min-h-[44px] flex items-center">Categories</a>
                  <a href="#trust" onClick={() => setMobileMenuOpen(false)} className="px-3 py-3 rounded-lg font-medium hover:bg-muted min-h-[44px] flex items-center">Why Trust Nexora</a>
                </nav>
                <div className="flex flex-col gap-3">
                  {user ? (
                    <Button onClick={() => { navigate('/dashboard'); setMobileMenuOpen(false); }} className="min-h-[44px]">Dashboard</Button>
                  ) : (
                    <>
                      <Button variant="outline" onClick={() => { navigate('/auth'); setMobileMenuOpen(false); }} className="min-h-[44px]">Log In</Button>
                      <Button onClick={() => { navigate('/auth'); setMobileMenuOpen(false); }} className="min-h-[44px]">Get Started</Button>
                    </>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </nav>

        {/* Hero */}
        <div className="mt-16 md:mt-24 max-w-5xl mx-auto text-center">
          <div className={`inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 mb-8 backdrop-blur-md border border-white/15 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <Sparkles className="h-4 w-4 text-accent animate-pulse" />
            <span className="text-sm font-semibold text-white/95">🇳🇬 Built for every Nigerian hustler</span>
          </div>

          <h1 className={`text-4xl md:text-6xl lg:text-7xl xl:text-8xl font-extrabold text-white leading-[1.05] mb-8 transition-all duration-700 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <span className="block">Empowering Nigeria's</span>
            <span className="block mt-2">Informal Economy with</span>
            <span className="block mt-2">
              <span className="relative inline-block">
                <span className="text-gradient-gold">Intelligent Finance.</span>
                <svg className="absolute -bottom-2 left-0 w-full h-3 text-accent/50" viewBox="0 0 200 12" preserveAspectRatio="none">
                  <path d="M0,8 Q50,0 100,8 T200,8" stroke="currentColor" strokeWidth="3" fill="none" />
                </svg>
              </span>
            </span>
          </h1>

          <p className={`text-lg md:text-xl lg:text-2xl text-white/85 max-w-2xl mx-auto mb-12 leading-relaxed font-medium transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            AI-matched gigs. Squad-secured escrow. Auto-savings that build your credit identity.
            <span className="text-accent font-semibold"> The Intelligent Freelance Economy.</span>
          </p>

          <div className={`flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 transition-all duration-700 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <Button variant="gold-hero" size="xl" className="w-full sm:w-auto group min-h-[60px] text-lg" onClick={handleGetStarted}>
              Start Earning Today
              <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button variant="hero-outline" size="xl" className="w-full sm:w-auto min-h-[60px] text-lg" onClick={handleBrowseGigs}>
              Browse Gigs
            </Button>
          </div>

          <div className={`flex flex-wrap items-center justify-center gap-6 md:gap-10 text-white/90 transition-all duration-700 delay-400 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            {[
              { icon: Brain, title: 'Smart Match AI', sub: 'AI ranks gigs for you' },
              { icon: ShieldCheck, title: 'Squad Escrow', sub: '100% secured payouts' },
              { icon: PiggyBank, title: 'AjoSquad Vault', sub: 'Auto-save & micro-loans' },
            ].map((it) => (
              <div key={it.title} className="flex items-center gap-3 group">
                <div className="h-11 w-11 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors border border-white/10">
                  <it.icon className="h-5 w-5 text-accent" />
                </div>
                <div className="text-left">
                  <span className="block text-sm font-bold text-white">{it.title}</span>
                  <span className="block text-xs text-white/70">{it.sub}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Featured Gigs */}
        <div className="mt-20 md:mt-28 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto pb-12">
          {[
            { title: "Hire a Developer", price: "₦35,000", user: "Adebayo O.", rating: 4.9, category: "Tech", emoji: "💻" },
            { title: "Logo & Branding", price: "₦12,000", user: "Funke A.", rating: 4.8, category: "Design", emoji: "🎨" },
            { title: "Same-day Delivery", price: "₦2,500", user: "Chidi N.", rating: 5.0, category: "Logistics", emoji: "🛵" },
          ].map((gig, index) => (
            <div
              key={index}
              onClick={() => navigate('/gigs')}
              className={`glass-strong group rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-3 cursor-pointer ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
              style={{ transitionDelay: `${500 + index * 100}ms` }}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-2xl">{gig.emoji}</span>
                <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-primary/15 text-primary border border-primary/20">{gig.category}</span>
              </div>
              <h3 className="font-bold text-foreground text-xl mb-3 group-hover:text-primary transition-colors">{gig.title}</h3>
              <p className="text-3xl font-extrabold text-gradient-gold mb-4">{gig.price}</p>
              <div className="flex items-center justify-between text-sm text-muted-foreground pt-4 border-t border-border">
                <span className="font-medium">{gig.user}</span>
                <div className="flex items-center gap-1.5">
                  <Star className="h-4 w-4 fill-accent text-accent" />
                  <span className="font-bold text-foreground">{gig.rating}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;

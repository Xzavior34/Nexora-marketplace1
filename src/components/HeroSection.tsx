import { useNavigate } from 'react-router-dom';
import { Briefcase, ArrowRight, Users, Star, Zap, Lock, Menu, Sparkles, TrendingUp, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const HeroSection = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleGetStarted = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/auth');
    }
  };

  const handleBrowseGigs = () => {
    navigate('/gigs');
  };

  return (
    <section className="relative min-h-screen overflow-hidden bg-gradient-hero">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Floating orbs */}
        <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-gold/10 blur-[120px] animate-pulse-slow" />
        <div className="absolute top-1/4 -left-32 h-[400px] w-[400px] rounded-full bg-primary-foreground/8 blur-[100px] animate-float" />
        <div className="absolute bottom-1/3 right-1/4 h-[300px] w-[300px] rounded-full bg-gold/5 blur-[80px] animate-pulse-slow" style={{ animationDelay: '2s' }} />
        
        {/* Gradient mesh */}
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: `radial-gradient(at 40% 20%, hsl(42, 95%, 52%, 0.15) 0px, transparent 50%),
                           radial-gradient(at 80% 80%, hsl(145, 55%, 32%, 0.1) 0px, transparent 50%),
                           radial-gradient(at 10% 70%, hsl(42, 95%, 52%, 0.1) 0px, transparent 50%)`
        }} />
        
        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }} />
      </div>

      <div className="container relative z-10 mx-auto px-4 py-6">
        {/* Premium Navigation */}
        <nav className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3 group">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-foreground/15 backdrop-blur-md border border-primary-foreground/10 group-hover:bg-primary-foreground/20 transition-all duration-300">
              <Briefcase className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-primary-foreground tracking-tight">Nexora</span>
              <span className="text-[10px] text-primary-foreground/60 font-medium tracking-widest uppercase">Nigerian Marketplace</span>
            </div>
          </div>
          
          {/* Desktop Nav Links */}
          <div className="hidden lg:flex items-center gap-8">
            <a href="#how-it-works" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors font-medium text-sm relative group">
              How It Works
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gold group-hover:w-full transition-all duration-300" />
            </a>
            <a href="#categories" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors font-medium text-sm relative group">
              Categories
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gold group-hover:w-full transition-all duration-300" />
            </a>
            <a href="#trust" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors font-medium text-sm relative group">
              Why Trust Us
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gold group-hover:w-full transition-all duration-300" />
            </a>
          </div>

          {/* Desktop Auth Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            {loading ? null : user ? (
              <Button variant="gold" size="sm" onClick={() => navigate('/dashboard')} className="min-h-[44px]">
                Dashboard
              </Button>
            ) : (
              <>
                <Button 
                  variant="hero-outline" 
                  size="sm" 
                  className="min-h-[44px]"
                  onClick={() => navigate('/auth')}
                >
                  Log In
                </Button>
                <Button variant="gold" size="sm" onClick={() => navigate('/auth')} className="min-h-[44px]">
                  Get Started
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="sm:hidden min-h-[44px] min-w-[44px] text-primary-foreground"
              >
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 bg-background">
              <div className="flex flex-col gap-6 mt-8">
                <nav className="flex flex-col gap-2">
                  <a 
                    href="#how-it-works" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-3 rounded-lg font-medium text-foreground hover:bg-muted transition-colors min-h-[44px] flex items-center"
                  >
                    How It Works
                  </a>
                  <a 
                    href="#categories" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-3 rounded-lg font-medium text-foreground hover:bg-muted transition-colors min-h-[44px] flex items-center"
                  >
                    Categories
                  </a>
                  <a 
                    href="#trust" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-3 rounded-lg font-medium text-foreground hover:bg-muted transition-colors min-h-[44px] flex items-center"
                  >
                    Why Trust Us
                  </a>
                </nav>

                <div className="flex flex-col gap-3">
                  {user ? (
                    <Button onClick={() => { navigate('/dashboard'); setMobileMenuOpen(false); }} className="min-h-[44px]">
                      Dashboard
                    </Button>
                  ) : (
                    <>
                      <Button variant="outline" onClick={() => { navigate('/auth'); setMobileMenuOpen(false); }} className="min-h-[44px]">
                        Log In
                      </Button>
                      <Button onClick={() => { navigate('/auth'); setMobileMenuOpen(false); }} className="min-h-[44px]">
                        Get Started
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </nav>

        {/* Hero Content */}
        <div className="mt-16 md:mt-24 max-w-5xl mx-auto text-center">
          {/* Animated Badge */}
          <div 
            className={`inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-5 py-2.5 mb-8 backdrop-blur-md border border-primary-foreground/15 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          >
            <Sparkles className="h-4 w-4 text-gold animate-pulse" />
            <span className="text-sm font-semibold text-primary-foreground/90">🌍 Open to All Nigerians Nationwide</span>
          </div>
          
          {/* Main Headline with staggered animation */}
          <h1 
            className={`text-4xl md:text-6xl lg:text-7xl xl:text-8xl font-extrabold text-primary-foreground leading-[1.05] mb-8 transition-all duration-700 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
          >
            <span className="block">Turn Your Skills Into</span>
            <span className="block mt-2">
              <span className="relative inline-block">
                <span className="text-gradient-gold">Real Income</span>
                <svg className="absolute -bottom-2 left-0 w-full h-3 text-gold/40" viewBox="0 0 200 12" preserveAspectRatio="none">
                  <path d="M0,8 Q50,0 100,8 T200,8" stroke="currentColor" strokeWidth="3" fill="none" />
                </svg>
              </span>
            </span>
          </h1>
          
          <p 
            className={`text-lg md:text-xl lg:text-2xl text-primary-foreground/75 max-w-2xl mx-auto mb-12 leading-relaxed font-medium transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
          >
            The #1 marketplace where Nigerians post tasks, find gigs, and get paid securely. 
            <span className="text-gold font-semibold"> Instant payouts. Zero hassle.</span>
          </p>

          {/* CTA Buttons */}
          <div 
            className={`flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 transition-all duration-700 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
          >
            <Button variant="gold-hero" size="xl" className="w-full sm:w-auto group min-h-[60px] text-lg" onClick={handleGetStarted}>
              Start Earning Today
              <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button variant="hero-outline" size="xl" className="w-full sm:w-auto min-h-[60px] text-lg" onClick={handleBrowseGigs}>
              Browse Gigs
            </Button>
          </div>

          {/* Trust Indicators */}
          <div 
            className={`flex flex-wrap items-center justify-center gap-6 md:gap-10 text-primary-foreground/80 transition-all duration-700 delay-400 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
          >
            <div className="flex items-center gap-3 group">
              <div className="h-11 w-11 rounded-xl bg-primary-foreground/10 flex items-center justify-center group-hover:bg-primary-foreground/15 transition-colors">
                <Lock className="h-5 w-5 text-gold" />
              </div>
              <div className="text-left">
                <span className="block text-sm font-bold text-primary-foreground">Escrow Protected</span>
                <span className="block text-xs text-primary-foreground/60">Secure payments</span>
              </div>
            </div>
            <div className="flex items-center gap-3 group">
              <div className="h-11 w-11 rounded-xl bg-primary-foreground/10 flex items-center justify-center group-hover:bg-primary-foreground/15 transition-colors">
                <TrendingUp className="h-5 w-5 text-gold" />
              </div>
              <div className="text-left">
                <span className="block text-sm font-bold text-primary-foreground">10% Fee Only</span>
                <span className="block text-xs text-primary-foreground/60">On withdrawals</span>
              </div>
            </div>
            <div className="flex items-center gap-3 group">
              <div className="h-11 w-11 rounded-xl bg-primary-foreground/10 flex items-center justify-center group-hover:bg-primary-foreground/15 transition-colors">
                <Zap className="h-5 w-5 text-gold" />
              </div>
              <div className="text-left">
                <span className="block text-sm font-bold text-primary-foreground">Instant Payouts</span>
                <span className="block text-xs text-primary-foreground/60">Within 24 hours</span>
              </div>
            </div>
          </div>
        </div>

        {/* Featured Gig Cards */}
        <div className="mt-20 md:mt-28 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto pb-12">
          {[
            { title: "Assignment Help", price: "₦3,000", user: "Adebayo O.", rating: 4.9, category: "Academic", emoji: "📚" },
            { title: "Laundry Service", price: "₦2,500", user: "Funke A.", rating: 4.8, category: "Services", emoji: "🧺" },
            { title: "Food Delivery", price: "₦500", user: "Chidi N.", rating: 5.0, category: "Delivery", emoji: "🍕" },
          ].map((gig, index) => (
            <div
              key={index}
              onClick={() => navigate('/gigs')}
              className={`group bg-card/95 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-border/50 hover:shadow-2xl hover:border-primary/30 transition-all duration-500 hover:-translate-y-3 cursor-pointer ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
              style={{ transitionDelay: `${500 + index * 100}ms` }}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-2xl">{gig.emoji}</span>
                <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-primary/10 text-primary">{gig.category}</span>
              </div>
              <h3 className="font-bold text-card-foreground text-xl mb-3 group-hover:text-primary transition-colors">{gig.title}</h3>
              <p className="text-3xl font-extrabold text-primary mb-4">{gig.price}</p>
              <div className="flex items-center justify-between text-sm text-muted-foreground pt-4 border-t border-border">
                <div className="flex items-center gap-2">
                  <BadgeCheck className="h-4 w-4 text-primary" />
                  <span className="font-medium">{gig.user}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Star className="h-4 w-4 fill-gold text-gold" />
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

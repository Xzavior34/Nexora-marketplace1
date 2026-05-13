import { Briefcase, Mail, Instagram, Twitter, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

const Footer = () => {
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });

  return (
    <footer className="bg-foreground text-background relative overflow-hidden">
      {/* Animated mesh background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand/15 rounded-full blur-3xl animate-float" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
        <div className="absolute inset-0 bg-gradient-mesh opacity-10" />
      </div>

      <div ref={ref} className="container mx-auto px-4 relative z-10">
        {/* CTA Section */}
        <motion.div
          className="text-center py-20 border-b border-background/10"
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-background/10 text-background/80 text-sm font-medium mb-6 backdrop-blur-sm border border-background/10">
            <Sparkles className="h-4 w-4 text-amber-400" />
            Join 2,400+ Verified Professionals Already Earning
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-6 text-balance max-w-2xl mx-auto leading-tight">
            Ready to Turn Your Skills<br className="hidden md:block" /> into Real Income?
          </h2>
          <p className="text-background/70 max-w-lg mx-auto mb-10 text-lg leading-relaxed">
            AI-matched gigs. Squad-secured escrow. An Ajo Vault that grows with you.
          </p>
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
            <Button
              size="xl"
              className="min-h-[56px] group bg-brand hover:bg-brand/90 text-white shadow-brand"
              onClick={() => navigate('/auth')}
            >
              Get Started Free
              <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </motion.div>
        </motion.div>

        {/* Footer Links */}
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-10 py-16"
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand shadow-brand">
                <span className="text-xl font-extrabold text-white">N</span>
              </div>
              <div>
                <span className="text-xl font-bold block">Nexora</span>
                <span className="text-xs text-background/50 font-medium">The Intelligent Economy</span>
              </div>
            </div>
            <p className="text-background/60 text-sm leading-relaxed max-w-xs">
              Nigeria's National Economic Opportunity Platform — open to every professional, artisan, trader, and ambitious talent across the country.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-5 text-background/90">Platform</h4>
            <ul className="space-y-3 text-sm text-background/60">
              <li><a href="#how-it-works" className="hover:text-background transition-colors">How It Works</a></li>
              <li><a href="#categories"   className="hover:text-background transition-colors">Categories</a></li>
              <li><a href="/gigs"         className="hover:text-background transition-colors">Browse Gigs</a></li>
              <li><a href="/marketplace"  className="hover:text-background transition-colors">Marketplace</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-5 text-background/90">Legal</h4>
            <ul className="space-y-3 text-sm text-background/60">
              <li><a href="/terms"   className="hover:text-background transition-colors">Terms of Service</a></li>
              <li><a href="/privacy" className="hover:text-background transition-colors">Privacy Policy</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-5 text-background/90">Contact</h4>
            <ul className="space-y-3 text-sm text-background/60">
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <a href="mailto:support@nexora.ng" className="hover:text-background transition-colors">support@nexora.ng</a>
              </li>
              <li className="flex items-center gap-4 mt-5">
                <a href="#" className="h-10 w-10 rounded-full bg-background/10 flex items-center justify-center hover:bg-background/20 transition-colors">
                  <Instagram className="h-5 w-5" />
                </a>
                <a href="#" className="h-10 w-10 rounded-full bg-background/10 flex items-center justify-center hover:bg-background/20 transition-colors">
                  <Twitter className="h-5 w-5" />
                </a>
              </li>
            </ul>
          </div>
        </motion.div>

        {/* Bottom bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-background/40 py-8 border-t border-background/10">
          <p>© 2025 Nexora. Powering Nigeria's National Gig Economy.</p>
          <p className="text-xs">Built in Nigeria 🇳🇬 • For the world 🌍</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
import { Briefcase, Mail, Instagram, Twitter, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Footer = () => {
  const navigate = useNavigate();

  return (
    <footer className="bg-foreground text-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gold/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* CTA Section */}
        <div className="text-center py-20 border-b border-background/10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-background/10 text-background/80 text-sm font-medium mb-6 backdrop-blur-sm">
            <Sparkles className="h-4 w-4 text-gold" />
            Join 1000+ Students Already Earning
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-6 text-balance max-w-2xl mx-auto leading-tight">
            Ready to Start Your Campus Hustle?
          </h2>
          <p className="text-background/70 max-w-lg mx-auto mb-10 text-lg leading-relaxed">
            Turn your skills into real income. Post tasks, find gigs, and get paid securely.
          </p>
          <Button 
            variant="gold" 
            size="xl" 
            className="min-h-[56px] group btn-glow"
            onClick={() => navigate('/auth')}
          >
            Get Started Free
            <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>

        {/* Footer Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 py-16">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-hero shadow-lg">
                <Briefcase className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <span className="text-xl font-bold block">UniGig</span>
                <span className="text-xs text-background/50 font-medium">Student Marketplace</span>
              </div>
            </div>
            <p className="text-background/60 text-sm leading-relaxed max-w-xs">
              The borderless university student gig marketplace. Open to students worldwide.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-5 text-background/90">Platform</h4>
            <ul className="space-y-3 text-sm text-background/60">
              <li><a href="#how-it-works" className="hover:text-background transition-colors">How It Works</a></li>
              <li><a href="#categories" className="hover:text-background transition-colors">Categories</a></li>
              <li><a href="/gigs" className="hover:text-background transition-colors">Browse Gigs</a></li>
              <li><a href="/marketplace" className="hover:text-background transition-colors">Marketplace</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-5 text-background/90">Legal</h4>
            <ul className="space-y-3 text-sm text-background/60">
              <li><a href="/terms" className="hover:text-background transition-colors">Terms of Service</a></li>
              <li><a href="/privacy" className="hover:text-background transition-colors">Privacy Policy</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-5 text-background/90">Contact</h4>
            <ul className="space-y-3 text-sm text-background/60">
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <a href="mailto:support@unigig.site" className="hover:text-background transition-colors">
                  support@unigig.site
                </a>
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
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-background/50 py-8 border-t border-background/10">
          <p>© 2025 UniGig. Made with ❤️ by Students, for Students.</p>
          <p className="text-xs">Built in Nigeria 🇳🇬 • For the world 🌍</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
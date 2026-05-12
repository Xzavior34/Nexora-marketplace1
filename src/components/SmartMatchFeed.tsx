import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, MapPin, Clock, ChevronLeft, ChevronRight, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, useInView } from 'framer-motion';
import { AIOrb } from '@/components/ui/AIOrb';
import { TiltCard } from '@/components/ui/TiltCard';

interface Match {
  id: string;
  title: string;
  description: string;
  category: string;
  price_kobo: number;
  location: string | null;
  deadline: string | null;
  created_at: string;
  poster_id: string;
  poster_name: string | null;
  poster_avatar: string | null;
  poster_university: string | null;
  match_score: number;
}

const formatNaira = (kobo: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(kobo / 100);

function ScoreBar({ score }: { score: number }) {
  const pct = Math.min(99, Math.max(35, score));
  const color = pct >= 80 ? 'from-violet-500 to-indigo-500' : pct >= 50 ? 'from-sky-500 to-cyan-400' : 'from-amber-500 to-orange-400';
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">AI Match</span>
        <span className="text-xs font-bold text-foreground">{pct}%</span>
      </div>
      <div className="h-1 rounded-full bg-muted overflow-hidden">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

const container = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const cardVariant = {
  hidden: { opacity: 0, y: 30, scale: 0.92 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

export default function SmartMatchFeed({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: '-40px' });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { data, error } = await (supabase.rpc as any)('get_smart_matches', {
          _user_id: userId,
          _limit: 12,
        });
        if (cancelled) return;
        if (error) { console.error('SmartMatch RPC error:', error); setMatches([]); }
        else setMatches((data as Match[]) || []);
      } catch (e) {
        console.error('SmartMatch load failed:', e);
        if (!cancelled) setMatches([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (userId) load();
    return () => { cancelled = true; };
  }, [userId]);

  const scroll = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' });
  };

  // Show skeleton while loading, show nothing if no matches
  if (!loading && matches.length === 0) return null;

  return (
    <section ref={sectionRef} className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <motion.div
          className="flex items-center gap-3"
          initial={{ opacity: 0, x: -20 }}
          animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          {/* Featured AI orb */}
          <div className="relative flex-shrink-0">
            <AIOrb matchScore={85} className="w-12 h-12" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-foreground">Smart Matches</h2>
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-brand font-bold bg-brand/10 px-2 py-0.5 rounded-full border border-brand/20">
                <Sparkles className="h-3 w-3" />
                AI-ranked
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Personalised gigs ranked by your skill compatibility</p>
          </div>
        </motion.div>

        <div className="hidden sm:flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => scroll(-1)} aria-label="Previous">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => scroll(1)} aria-label="Next">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Scrollable card rail */}
      <motion.div
        ref={scrollerRef as any}
        className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory -mx-3 px-3 pb-3"
        variants={container}
        initial="hidden"
        animate={inView ? "visible" : "hidden"}
      >
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="snap-start shrink-0 w-[78%] sm:w-[44%] lg:w-[32%] h-48 rounded-2xl bg-muted/50 animate-pulse" />
          ))
          : matches.map((m) => (
            <TiltCard
              key={m.id}
              as="button"
              onClick={() => navigate(`/gigs/${m.id}`)}
              className="snap-start shrink-0 w-[78%] sm:w-[44%] lg:w-[32%] text-left glass-card rounded-2xl p-4 group"
              variants={cardVariant}
              intensity={10}
            >
              {/* Match badge + price */}
              <div className="flex items-center justify-between mb-3">
                <div className="relative inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-brand/20 bg-background/60 backdrop-blur-md shadow-sm overflow-hidden">
                  <AIOrb matchScore={m.match_score} className="w-4 h-4 shrink-0" />
                  <span className="relative text-[11px] font-bold text-foreground tracking-wide">
                    {Math.min(99, Math.max(35, m.match_score))}% Match
                  </span>
                </div>
                <span className="text-xs font-bold text-brand bg-brand/10 px-2 py-1 rounded-md">
                  {formatNaira(m.price_kobo)}
                </span>
              </div>

              <h3 className="font-semibold text-sm text-foreground line-clamp-2 mb-1 group-hover:text-brand transition-colors">
                {m.title}
              </h3>
              <p className="text-xs text-muted-foreground line-clamp-2">{m.description}</p>

              {/* Score bar */}
              <ScoreBar score={m.match_score} />

              {/* Meta */}
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-3">
                {m.location && (
                  <span className="inline-flex items-center gap-1 truncate">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">{m.location}</span>
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(m.created_at).toLocaleDateString()}
                </span>
              </div>
            </TiltCard>
          ))}
      </motion.div>
    </section>
  );
}

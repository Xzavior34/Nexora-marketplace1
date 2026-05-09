import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, MapPin, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
  }).format(kobo / 100);

export default function SmartMatchFeed({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { data, error } = await (supabase.rpc as any)('get_smart_matches', {
          _user_id: userId,
          _limit: 12,
        });
        if (cancelled) return;
        if (error) {
          console.error('SmartMatch RPC error:', error);
          setMatches([]);
        } else {
          setMatches((data as Match[]) || []);
        }
      } catch (e) {
        console.error('SmartMatch load failed:', e);
        if (!cancelled) setMatches([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (userId) load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const scroll = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' });
  };

  if (!loading && matches.length === 0) return null;

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center animate-pulse-glow">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <h2 className="text-base font-semibold text-foreground">Smart Matches</h2>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground hidden sm:inline">
            AI-ranked for you
          </span>
        </div>
        <div className="hidden sm:flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => scroll(-1)}
            aria-label="Previous matches"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => scroll(1)}
            aria-label="Next matches"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory -mx-3 px-3 pb-2"
      >
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="snap-start shrink-0 w-[78%] sm:w-[44%] lg:w-[32%] h-44 rounded-2xl bg-muted/50 animate-pulse"
              />
            ))
          : matches.map((m) => (
              <button
                key={m.id}
                onClick={() => navigate(`/gigs/${m.id}`)}
                className="snap-start shrink-0 w-[78%] sm:w-[44%] lg:w-[32%] text-left glass-card p-4 hover:ai-glow transition-all duration-300 group"
              >
                {/* Match badge */}
                <div className="flex items-center justify-between mb-3">
                  <div className="relative inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full overflow-hidden border border-primary/40 bg-primary/10">
                    <span className="absolute inset-0 ai-shimmer pointer-events-none" />
                    <Sparkles className="relative h-3 w-3 text-primary" />
                    <span className="relative text-[11px] font-bold text-primary tracking-wide">
                      {Math.min(99, Math.max(35, m.match_score))}% AI Match
                    </span>
                  </div>
                  <span className="text-xs font-bold text-accent">{formatNaira(m.price_kobo)}</span>
                </div>

                <h3 className="font-semibold text-sm text-foreground line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                  {m.title}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{m.description}</p>

                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
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
              </button>
            ))}
      </div>
    </section>
  );
}

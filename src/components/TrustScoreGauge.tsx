import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface Props {
  userId: string;
  /** Optional fallback inputs so we render instantly while RPC loads. */
  completedGigs?: number;
  averageRating?: number;
  isVerified?: boolean;
}

const MIN = 300;
const MAX = 850;

function tierFor(score: number) {
  if (score >= 780) return { label: 'Elite', color: 'text-accent' };
  if (score >= 700) return { label: 'Excellent', color: 'text-primary' };
  if (score >= 620) return { label: 'Good', color: 'text-primary/80' };
  if (score >= 500) return { label: 'Fair', color: 'text-muted-foreground' };
  return { label: 'Building', color: 'text-muted-foreground' };
}

export default function TrustScoreGauge({
  userId,
  completedGigs = 0,
  averageRating = 0,
  isVerified = false,
}: Props) {
  const [score, setScore] = useState<number | null>(null);
  const [animated, setAnimated] = useState(MIN);

  // Local fallback estimate while RPC loads
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { data, error } = await (supabase.rpc as any)('get_squad_trust_score', {
          _user_id: userId,
        });
        if (cancelled) return;
        if (!error && typeof data === 'number') {
          setScore(data);
        } else {
          // Fallback formula
          const fallback =
            300 +
            Math.min(300, completedGigs * 12) +
            Math.round(averageRating * 50) +
            (isVerified ? 50 : 0);
          setScore(Math.max(MIN, Math.min(MAX, fallback)));
        }
      } catch {
        const fallback =
          300 +
          Math.min(300, completedGigs * 12) +
          Math.round(averageRating * 50) +
          (isVerified ? 50 : 0);
        setScore(Math.max(MIN, Math.min(MAX, fallback)));
      }
    };
    if (userId) load();
    return () => {
      cancelled = true;
    };
  }, [userId, completedGigs, averageRating, isVerified]);

  // Animate score fill on load
  useEffect(() => {
    if (score == null) return;
    const start = performance.now();
    const dur = 1400;
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - k, 3);
      setAnimated(MIN + (score - MIN) * eased);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  const pct = (animated - MIN) / (MAX - MIN); // 0..1
  // Half-circle gauge: 180deg sweep, mapped onto a circle's circumference
  const r = 70;
  const c = Math.PI * r; // half-circle length
  const offset = c * (1 - pct);

  const t = tierFor(animated);

  return (
    <div className="glass-card p-5 relative overflow-hidden">
      {/* Mesh accent */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-mesh opacity-60" />
      <div className="relative">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center animate-pulse-glow">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground leading-tight">
                Squad Trust Score
              </h3>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Alternative Credit
              </p>
            </div>
          </div>
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="What is this score?"
                >
                  <Info className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-[240px] text-xs leading-relaxed">
                Squad Alternative Credit Data — built from completed gigs, rating, verification &
                streaks. Unlocks future micro-loans for the informal economy.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Gauge */}
        <div className="flex flex-col items-center pt-2">
          <svg viewBox="0 0 180 100" className="w-full max-w-[260px]">
            <defs>
              <linearGradient id="tsGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="hsl(var(--primary))" />
                <stop offset="50%" stopColor="hsl(var(--accent))" />
                <stop offset="100%" stopColor="hsl(var(--gold-glow))" />
              </linearGradient>
              <filter id="tsGlow">
                <feGaussianBlur stdDeviation="2.5" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Track */}
            <path
              d="M 20 90 A 70 70 0 0 1 160 90"
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="10"
              strokeLinecap="round"
            />
            {/* Fill */}
            <path
              d="M 20 90 A 70 70 0 0 1 160 90"
              fill="none"
              stroke="url(#tsGrad)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={offset}
              filter="url(#tsGlow)"
              style={{ transition: 'stroke-dashoffset 120ms linear' }}
            />
          </svg>

          <div className="-mt-10 text-center">
            <div className="text-4xl font-bold text-foreground tracking-tight tabular-nums">
              {Math.round(animated)}
            </div>
            <div className={`text-xs font-semibold ${t.color}`}>{t.label}</div>
          </div>

          <div className="mt-3 flex items-center justify-between w-full text-[10px] text-muted-foreground">
            <span>300</span>
            <span className="text-center">Tap info for how this is calculated</span>
            <span>850</span>
          </div>
        </div>
      </div>
    </div>
  );
}

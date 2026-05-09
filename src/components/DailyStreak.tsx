import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Flame, Gift, Lock, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const KEY_LAST = 'unigig_streak_last';
const KEY_COUNT = 'unigig_streak_count';
const KEY_CLAIMED = 'unigig_streak_claimed_milestones';

const MILESTONES = [3, 5, 10, 15, 20];

function todayISO() { return new Date().toISOString().slice(0, 10); }
function yesterdayISO() {
  const d = new Date(); d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function readClaimed(): number[] {
  try { return JSON.parse(localStorage.getItem(KEY_CLAIMED) || '[]'); } catch { return []; }
}

export function DailyStreak() {
  const navigate = useNavigate();
  const [streak, setStreak] = useState(0);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [claimed, setClaimed] = useState<number[]>([]);

  useEffect(() => {
    try {
      const last = localStorage.getItem(KEY_LAST);
      const raw = localStorage.getItem(KEY_COUNT);
      const parsed = parseInt(raw || '0', 10);
      const count = Number.isFinite(parsed) ? parsed : 0;
      if (last === todayISO()) { setStreak(count); setCheckedInToday(true); }
      else if (last === yesterdayISO()) setStreak(count);
      else setStreak(0);
      setClaimed(readClaimed());
    } catch (e) {
      console.warn('DailyStreak init failed; resetting state', e);
      setStreak(0);
      setCheckedInToday(false);
      setClaimed([]);
    }
  }, []);

  const checkIn = () => {
    if (checkedInToday) return;
    const last = localStorage.getItem(KEY_LAST);
    const prev = parseInt(localStorage.getItem(KEY_COUNT) || '0', 10) || 0;
    const next = last === yesterdayISO() ? prev + 1 : 1;
    localStorage.setItem(KEY_LAST, todayISO());
    localStorage.setItem(KEY_COUNT, String(next));
    setStreak(next);
    setCheckedInToday(true);
    if (MILESTONES.includes(next) && !claimed.includes(next)) {
      toast.success(`🎁 Day ${next} milestone unlocked! Claim your spin.`);
    } else {
      const upcoming = MILESTONES.find(m => m > next);
      toast.success(`🔥 Day ${next} streak! ${upcoming ? `${upcoming - next} day(s) to your next reward.` : 'You reached the final milestone!'}`);
    }
  };

  const claimMilestone = (m: number) => {
    if (streak < m || claimed.includes(m)) return;
    const next = [...claimed, m];
    localStorage.setItem(KEY_CLAIMED, JSON.stringify(next));
    setClaimed(next);
    toast.success(`🎟️ Spin ticket awarded for Day ${m}!`);
    setTimeout(() => navigate('/spin-to-win'), 500);
  };

  const nextMilestone = MILESTONES.find(m => m > streak) ?? MILESTONES[MILESTONES.length - 1];
  const daysToNext = Math.max(0, nextMilestone - streak);

  return (
    <Card className="overflow-hidden border-accent/30 bg-gradient-to-br from-accent/5 via-background to-primary/5">
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-10 w-10 shrink-0 rounded-full bg-accent/15 flex items-center justify-center">
              <Flame className="h-5 w-5 text-accent" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-foreground">Day {streak} streak</p>
              <p className="text-[11px] text-muted-foreground truncate">
                {streak >= MILESTONES[MILESTONES.length - 1]
                  ? 'All milestones reached 🎉'
                  : `${daysToNext} day${daysToNext === 1 ? '' : 's'} to next reward`}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={checkIn}
            disabled={checkedInToday}
            className="shrink-0 h-8 text-xs"
          >
            {checkedInToday ? 'Checked in' : 'Check in'}
          </Button>
        </div>

        {/* Roadmap timeline */}
        <div className="relative pt-1">
          {/* base track */}
          <div className="absolute left-0 right-0 top-[22px] h-1 rounded-full bg-muted" />
          {/* progress fill */}
          <div
            className="absolute left-0 top-[22px] h-1 rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
            style={{
              width: `${Math.min(100, (streak / MILESTONES[MILESTONES.length - 1]) * 100)}%`,
            }}
          />
          <div className="relative flex justify-between">
            {MILESTONES.map((m) => {
              const reached = streak >= m;
              const isClaimed = claimed.includes(m);
              const claimable = reached && !isClaimed;
              return (
                <button
                  key={m}
                  onClick={() => claimMilestone(m)}
                  disabled={!claimable}
                  className={`flex flex-col items-center gap-1.5 group ${claimable ? 'cursor-pointer' : 'cursor-default'}`}
                  aria-label={`Day ${m} milestone`}
                >
                  <div
                    className={`h-11 w-11 rounded-full flex items-center justify-center border-2 transition-all ${
                      isClaimed
                        ? 'bg-primary border-primary text-primary-foreground'
                        : claimable
                          ? 'bg-accent border-accent text-accent-foreground shadow-md animate-pulse'
                          : reached
                            ? 'bg-primary/15 border-primary/40 text-primary'
                            : 'bg-muted border-border text-muted-foreground'
                    }`}
                  >
                    {isClaimed ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : reached ? (
                      <Gift className="h-5 w-5" />
                    ) : (
                      <Lock className="h-4 w-4" />
                    )}
                  </div>
                  <span className={`text-[10px] font-semibold ${reached ? 'text-foreground' : 'text-muted-foreground'}`}>
                    Day {m}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <p className="text-[10px] text-center text-muted-foreground">
          Earn a spin ticket at Day 3, 5, 10, 15 & 20
        </p>
      </CardContent>
    </Card>
  );
}

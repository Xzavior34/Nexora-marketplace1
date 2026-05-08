import { Badge } from '@/components/ui/badge';
import { Sparkles, Award, ShieldCheck, Crown } from 'lucide-react';

export type Tier = 'newbie' | 'rising' | 'verified' | 'elite';

export function getTier(opts: { completed?: number | null; rating?: number | null; isVerified?: boolean | null }): Tier {
  const completed = opts.completed || 0;
  const rating = opts.rating || 0;
  if (completed >= 50 && rating >= 4.7) return 'elite';
  if (opts.isVerified && completed >= 10) return 'verified';
  if (completed >= 3) return 'rising';
  return 'newbie';
}

const META: Record<Tier, { label: string; icon: any; cls: string }> = {
  newbie:   { label: 'Newbie',         icon: Sparkles,    cls: 'bg-muted text-muted-foreground border-border' },
  rising:   { label: 'Rising Talent',  icon: Award,       cls: 'bg-blue-500/10 text-blue-700 border-blue-500/30' },
  verified: { label: 'Verified Pro',   icon: ShieldCheck, cls: 'bg-primary/10 text-primary border-primary/30' },
  elite:    { label: 'Elite',          icon: Crown,       cls: 'bg-accent/15 text-accent-foreground border-accent/40' },
};

export function TrustTierBadge({
  completed, rating, isVerified, className,
}: { completed?: number | null; rating?: number | null; isVerified?: boolean | null; className?: string }) {
  const tier = getTier({ completed, rating, isVerified });
  const { label, icon: Icon, cls } = META[tier];
  return (
    <Badge className={`gap-1 border ${cls} ${className || ''}`} variant="outline">
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

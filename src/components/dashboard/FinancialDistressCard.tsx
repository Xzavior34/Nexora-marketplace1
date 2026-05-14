import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Activity, AlertTriangle, ShieldCheck, Sparkles, TrendingDown,
  Loader2, Search, PiggyBank, Banknote, UserCog, ChevronDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Recommendation {
  type: 'find_gigs' | 'protect_savings' | 'flexible_loan' | 'improve_profile';
  title: string;
  action: string;
}
interface DistressResult {
  success: boolean;
  score: number;
  level: 'healthy' | 'watch' | 'elevated' | 'critical';
  reasons: string[];
  recommendations: Recommendation[];
  metrics?: Record<string, number>;
}

const ICONS: Record<Recommendation['type'], any> = {
  find_gigs: Search,
  protect_savings: PiggyBank,
  flexible_loan: Banknote,
  improve_profile: UserCog,
};

const LEVEL_META: Record<DistressResult['level'], { label: string; color: string; ring: string; icon: any }> = {
  healthy:   { label: 'All clear',          color: 'text-emerald-400', ring: 'ring-emerald-500/30', icon: ShieldCheck },
  watch:     { label: 'Watch',              color: 'text-sky-400',     ring: 'ring-sky-500/30',     icon: Activity },
  elevated:  { label: 'Elevated risk',      color: 'text-amber-400',   ring: 'ring-amber-500/40',   icon: TrendingDown },
  critical:  { label: 'Critical attention', color: 'text-rose-400',    ring: 'ring-rose-500/50',    icon: AlertTriangle },
};

interface Props { userId: string; onRequestLoan?: () => void; onTuneVault?: () => void; }

export default function FinancialDistressCard({ userId, onRequestLoan, onTuneVault }: Props) {
  const navigate = useNavigate();
  const [data, setData] = useState<DistressResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const run = async () => {
    setLoading(true);
    const { data: res, error } = await (supabase.rpc as any)('detect_financial_distress', { _user_id: userId });
    setLoading(false);
    if (error || !res?.success) {
      setData({ success: true, score: 0, level: 'healthy', reasons: [], recommendations: [] });
      return;
    }
    setData(res as DistressResult);
  };

  useEffect(() => { if (userId) run(); }, [userId]);

  if (!data && !loading) return null;

  const level = data?.level ?? 'healthy';
  const meta = LEVEL_META[level];
  const Icon = meta.icon;

  const handleAction = (r: Recommendation) => {
    if (r.type === 'flexible_loan' && onRequestLoan) return onRequestLoan();
    if (r.type === 'protect_savings' && onTuneVault) return onTuneVault();
    if (r.action.startsWith('/')) navigate(r.action);
  };

  return (
    <Card className={`glass-card border-white/10 relative overflow-hidden ring-1 ${meta.ring}`}>
      <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
      <CardHeader className="relative pb-2">
        <CardDescription className="flex items-center gap-2 text-xs">
          <Activity className="h-4 w-4 text-primary" /> AI Financial Wellness
          <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold text-primary">
            <Sparkles className="h-3 w-3" /> Nexora Insight
          </span>
        </CardDescription>
        <CardTitle className="text-lg flex items-center gap-2">
          <Icon className={`h-5 w-5 ${meta.color}`} />
          <span className={meta.color}>{meta.label}</span>
          {!loading && data && <span className="ml-auto text-sm font-bold text-foreground tabular-nums">{data.score}/100</span>}
        </CardTitle>
      </CardHeader>

      <CardContent className="relative space-y-3">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Scanning your financial signals…
          </div>
        ) : (
          <>
            <Progress value={data!.score} className="h-2" />

            {data!.reasons.length > 0 ? (
              <ul className="text-xs text-muted-foreground space-y-1">
                {data!.reasons.slice(0, 3).map((r, i) => (
                  <li key={i} className="flex gap-2">
                    <span className={`mt-1 h-1.5 w-1.5 rounded-full ${meta.color.replace('text-', 'bg-')}`} />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">
                Earnings, savings and gig activity all look stable. Keep the momentum going!
              </p>
            )}

            {data!.recommendations.length > 0 && (
              <div className="space-y-2 pt-1">
                {data!.recommendations.map((r, i) => {
                  const RIcon = ICONS[r.type] ?? Sparkles;
                  return (
                    <motion.button
                      key={i}
                      onClick={() => handleAction(r)}
                      whileHover={{ x: 2 }}
                      className="w-full flex items-center gap-3 rounded-lg border border-white/10 bg-background/40 p-2.5 text-left hover:border-primary/40 transition-colors"
                    >
                      <span className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                        <RIcon className="h-4 w-4 text-primary" />
                      </span>
                      <span className="text-xs font-medium text-foreground flex-1">{r.title}</span>
                    </motion.button>
                  );
                })}
              </div>
            )}

            <button
              onClick={() => setOpen((o) => !o)}
              className="w-full flex items-center justify-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors pt-1"
            >
              <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
              {open ? 'Hide signals' : 'Show signals'}
            </button>

            <AnimatePresence>
              {open && data?.metrics && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground pt-2">
                    <Metric label="Income drop" value={`${data.metrics.income_drop_pct ?? 0}%`} />
                    <Metric label="Work drop"   value={`${data.metrics.work_drop_pct ?? 0}%`} />
                    <Metric label="Escrow (30d)" value={data.metrics.escrow_30d ?? 0} />
                    <Metric label="Vault saves" value={data.metrics.vault_deposits_30d ?? 0} />
                    <Metric label="Reject rate" value={`${data.metrics.failure_rate_pct ?? 0}%`} />
                    <Metric label="Completed"   value={data.metrics.completed_30d ?? 0} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <Button variant="ghost" size="sm" onClick={run} className="w-full text-xs">
              <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Re-scan
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-white/5 bg-background/30 px-2 py-1.5">
      <p className="text-[9px] uppercase tracking-wider opacity-70">{label}</p>
      <p className="text-foreground font-bold tabular-nums">{value}</p>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, Loader2, ShieldCheck, Lock } from 'lucide-react';

interface Msg { content: string; sender_id: string; created_at?: string; }
interface Props { messages: Msg[]; taskTitle?: string; currentUserId: string; otherUserId: string; }

interface Agreement {
  risk_score: number;
  agreed_price_kobo: number;
  agreed_price_naira: number;
  deliverables: string;
  deadline: string | null;
  confidence: number;
  source: string;
}

export function SmartAgreementCard({ messages, taskTitle, currentUserId, otherUserId }: Props) {
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (messages.length < 4) return;
    let cancelled = false;
    const debounce = setTimeout(async () => {
      setLoading(true);
      try {
        const payload = messages.slice(-30).map(m => ({
          sender: m.sender_id === currentUserId ? 'client' : 'freelancer',
          content: m.content,
        }));
        const { data, error } = await supabase.functions.invoke('dispute-shield', {
          body: { messages: payload, task_title: taskTitle ?? 'Nexora Gig' },
        });
        if (!cancelled && !error && data) setAgreement(data as Agreement);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 1500);
    return () => { cancelled = true; clearTimeout(debounce); };
  }, [messages.length, currentUserId, taskTitle]);

  if (messages.length < 4) return null;

  return (
    <div className="glass-card rounded-xl border border-primary/30 bg-primary/5 px-3 py-2.5">
      <div className="flex items-center gap-2 mb-1.5">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-xs font-bold uppercase tracking-wide text-primary">AI Smart Agreement</span>
        {loading && <Loader2 className="h-3 w-3 animate-spin text-primary ml-auto" />}
        {agreement && !loading && (
          <span className="ml-auto text-[10px] text-muted-foreground">Confidence {agreement.confidence}%</span>
        )}
      </div>
      {agreement ? (
        <div className="grid grid-cols-3 gap-2 text-[11px]">
          <div>
            <p className="text-muted-foreground">Price</p>
            <p className="font-bold tabular-nums text-foreground">
              {agreement.agreed_price_naira ? `₦${agreement.agreed_price_naira.toLocaleString()}` : '—'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Deadline</p>
            <p className="font-medium text-foreground">{agreement.deadline ? new Date(agreement.deadline).toLocaleDateString() : '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Risk</p>
            <p className={`font-bold ${agreement.risk_score >= 50 ? 'text-red-400' : agreement.risk_score >= 25 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {agreement.risk_score}%
            </p>
          </div>
          <div className="col-span-3 flex items-start gap-1.5 mt-1 text-muted-foreground">
            <ShieldCheck className="h-3 w-3 mt-0.5 text-emerald-400 shrink-0" />
            <span className="leading-snug">{agreement.deliverables}</span>
          </div>
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Lock className="h-3 w-3" /> Locking terms as you chat…
        </p>
      )}
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { checkMessageSafety } from '@/lib/safety';
import { supabase } from '@/integrations/supabase/client';

interface Msg { content: string; sender_id: string; }
interface Props { messages: Msg[]; taskTitle?: string; }

// AI Risk Meter — heuristic-first for instant feedback, then enhanced by the
// Dispute Shield edge function on every 5th message. Goes red when AI risk > 50.
export function ChatRiskMeter({ messages, taskTitle }: Props) {
  const [aiRisk, setAiRisk] = useState<number | null>(null);
  const lastScannedCount = useRef(0);

  const heuristic = useMemo(() => {
    if (!messages.length) return 0;
    let unsafe = 0;
    for (const m of messages) {
      const r = checkMessageSafety(m.content || '');
      if (!r.safe) unsafe += 1;
    }
    const ratio = unsafe / Math.max(messages.length, 4);
    return Math.min(100, Math.round(ratio * 220 + (unsafe > 0 ? 25 : 0)));
  }, [messages]);

  // Fire dispute-shield every 5th new message (and on first 3+).
  useEffect(() => {
    const count = messages.length;
    if (count < 3) return;
    const shouldScan = count - lastScannedCount.current >= 5 || lastScannedCount.current === 0;
    if (!shouldScan) return;
    lastScannedCount.current = count;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.functions.invoke('dispute-shield', {
          body: { messages, task_title: taskTitle ?? '' },
        });
        if (cancelled) return;
        const r = Number((data as any)?.risk_score);
        if (Number.isFinite(r)) setAiRisk(r);
      } catch (e) {
        console.warn('[ChatRiskMeter] dispute-shield failed silently', e);
      }
    })();
    return () => { cancelled = true; };
  }, [messages, taskTitle]);

  const score = Math.max(heuristic, aiRisk ?? 0);
  const danger = score > 50;
  const warn = score >= 25 && score <= 50;
  const safe = score < 25;

  const label = danger ? 'High risk' : warn ? 'Caution' : 'Safe';
  const color = danger ? 'hsl(0 80% 60%)' : warn ? 'hsl(38 95% 60%)' : 'hsl(160 70% 50%)';

  return (
    <div
      className={`glass-card relative px-3 py-2.5 rounded-xl border ${
        danger ? 'border-red-500/50 shadow-[0_0_24px_hsl(0_80%_60%/0.45)]' : warn ? 'border-amber-500/40' : 'border-emerald-500/30'
      } transition-all`}
      style={danger ? { animation: 'pulse-glow 2s ease-in-out infinite' } : undefined}
    >
      <div className="flex items-center gap-3">
        {danger ? (
          <ShieldAlert className="h-5 w-5 text-red-400 shrink-0" />
        ) : (
          <ShieldCheck className="h-5 w-5 shrink-0" style={{ color }} />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color }}>
              AI Risk Meter · {label}
            </span>
            <span className="text-xs font-bold" style={{ color }}>{score}%</span>
          </div>
          <div className="mt-1.5 h-1.5 w-full bg-muted/40 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${score}%`, background: color, boxShadow: `0 0 12px ${color}` }}
            />
          </div>
          {danger && (
            <p className="mt-2 text-[11px] leading-snug text-red-300">
              ⚠️ AI Alert: Potential Scam Detected. Keep all payments in Squad Escrow — never share phone, WhatsApp, or pay off-platform.
            </p>
          )}
          {warn && !danger && (
            <p className="mt-2 text-[11px] leading-snug text-amber-300/90">
              Heads up: some messages look risky. Stay inside Squad Escrow for guaranteed payouts.
            </p>
          )}
          {safe && messages.length > 0 && (
            <p className="mt-1 text-[10px] text-muted-foreground">Conversation looks clean. AI is monitoring.</p>
          )}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Banknote, Lock, Sparkles, Loader2 } from 'lucide-react';

interface Props {
  userId: string;
  vaultBalance: number;
  onChanged: () => void;
}

export default function MicroLoanCard({ userId, vaultBalance, onChanged }: Props) {
  const [score, setScore] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase.rpc as any)('get_squad_trust_score', { _user_id: userId });
      if (typeof data === 'number') setScore(data);
    })();
  }, [userId, vaultBalance]);

  const eligible = (score ?? 0) >= 700 && vaultBalance >= 500000;
  const maxLoanKobo = Math.min((vaultBalance ?? 0) * 3, 5_000_000);
  const fmt = (kobo: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format((kobo ?? 0) / 100);

  const submit = async () => {
    const naira = Number(amount);
    if (!Number.isFinite(naira) || naira < 500) return toast.error('Minimum loan is N500');
    const kobo = Math.floor(naira * 100);
    setBusy(true);
    const { data, error } = await (supabase.rpc as any)('request_micro_loan', { p_amount_kobo: kobo });
    setBusy(false);
    if (error || !data?.success) return toast.error(data?.error || error?.message || 'Failed');
    toast.success('Micro-loan disbursed via Squad');
    setOpen(false); setAmount(''); onChanged();
  };

  return (
    <>
      <Card className={`glass-card border-white/10 relative overflow-hidden ${eligible ? 'animate-pulse-glow' : ''}`}>
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-2 text-xs">
            <Banknote className="h-4 w-4 text-primary" /> Nexora Micro-Loan
            <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold text-primary">
              <Sparkles className="h-3 w-3" /> Squad-powered
            </span>
          </CardDescription>
          <CardTitle className="text-lg">
            {eligible ? `Up to ${fmt(maxLoanKobo)} unlocked` : 'Locked'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-xs text-muted-foreground">
            Trust Score: <span className="font-bold text-foreground">{score ?? '...'}</span> /850 ·
            Vault: <span className="font-bold text-foreground">{fmt(vaultBalance)}</span>
          </div>
          {eligible ? (
            <Button onClick={() => setOpen(true)} className="w-full">
              <Banknote className="h-4 w-4 mr-2" /> Request Micro-Loan
            </Button>
          ) : (
            <div className="flex items-start gap-2 rounded-lg border border-white/10 bg-background/40 p-3 text-xs text-muted-foreground">
              <Lock className="h-4 w-4 shrink-0 mt-0.5" />
              <p>
                Build vault savings to N5,000+ and a Trust Score of 700+ to unlock instant micro-credit. Every consistent
                Ajo deposit and clean-completed gig grows your eligibility.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Request Micro-Loan</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Max available: {fmt(maxLoanKobo)}</p>
            <Input type="number" min={500} placeholder="Amount in N" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <Button onClick={submit} disabled={busy} className="w-full">
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Disburse via Squad
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

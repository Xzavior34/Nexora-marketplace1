import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Banknote, Lock, Sparkles, Loader2, ScanLine } from 'lucide-react';

interface Props {
  userId: string;
  vaultBalance: number;
  onChanged: () => void;
}

export default function MicroLoanCard({ userId, vaultBalance, onChanged }: Props) {
  const [score, setScore] = useState<number | null>(null);
  const [completedGigs, setCompletedGigs] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [maxLoanKobo, setMaxLoanKobo] = useState(0);
  const [scanReason, setScanReason] = useState('Run the credit scan to check your eligibility.');
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);

  const runScan = async (silent = false) => {
    if (!silent) setScanning(true);
    const { data, error } = await (supabase.rpc as any)('quick_ai_credit_scan', { _user_id: userId });
    if (!silent) setScanning(false);
    if (error || !data?.success) {
      setScore(0);
      setScanReason(data?.error || error?.message || 'Credit scan failed.');
      return;
    }
    setScore(Number(data.score) || 0);
    setCompletedGigs(Number(data.completed_gigs) || 0);
    setAverageRating(Number(data.average_rating) || 0);
    setMaxLoanKobo(Number(data.max_loan_kobo) || 0);
    setScanReason(data.reason || 'Scan completed.');
  };

  useEffect(() => { runScan(true); }, [userId, vaultBalance]);

  const eligible = (score ?? 0) >= 32 && completedGigs >= 3 && averageRating >= 4;
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
    toast.success('Loan created and credited to your wallet');
    setOpen(false); setAmount(''); onChanged();
    runScan(true);
  };

  return (
    <>
      <Card className={`glass-card border-white/10 relative overflow-hidden ${eligible ? 'animate-pulse-glow' : ''}`}>
        <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-xs">
             <Banknote className="h-4 w-4 text-primary" /> Quick AI Credit Scan
            <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold text-primary">
              <Sparkles className="h-3 w-3" /> Squad-powered
            </span>
          </CardDescription>
          <CardTitle className="text-lg">
             {eligible ? `Up to ${fmt(maxLoanKobo)} unlocked` : 'Scan required'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-xs text-muted-foreground">
            Score: <span className="font-bold text-foreground">{score ?? '...'}</span>/100 ·
            Completed: <span className="font-bold text-foreground">{completedGigs}</span> ·
            Rating: <span className="font-bold text-foreground">{averageRating.toFixed(1)}</span>
          </div>
          <p className="text-xs text-muted-foreground">{scanReason}</p>
          <Button variant="outline" onClick={() => runScan(false)} disabled={scanning} className="w-full">
            {scanning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ScanLine className="h-4 w-4 mr-2" />}
            Quick AI Credit Scan
          </Button>
          {eligible ? (
            <Button onClick={() => setOpen(true)} className="w-full">
              <Banknote className="h-4 w-4 mr-2" /> Request Loan
            </Button>
          ) : (
            <div className="flex items-start gap-2 rounded-lg border border-white/10 bg-background/40 p-3 text-xs text-muted-foreground">
              <Lock className="h-4 w-4 shrink-0 mt-0.5" />
              <p>
                 Complete at least 3 gigs and keep a 4.0+ average rating to unlock demo credit.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Request Loan</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Max available: {fmt(maxLoanKobo)}</p>
            <Input type="number" min={500} placeholder="Amount in N" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <Button onClick={submit} disabled={busy} className="w-full">
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Credit Wallet
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

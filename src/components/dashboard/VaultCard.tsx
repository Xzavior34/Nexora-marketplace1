import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { PiggyBank, Sparkles, ArrowDownToLine, ArrowUpFromLine, Loader2 } from 'lucide-react';

interface VaultCardProps {
  userId: string;
  vaultBalance: number;
  autoSavePercentage: number;
  walletBalance: number;
  onChanged: () => void;
}

export default function VaultCard({ userId, vaultBalance, autoSavePercentage, walletBalance, onChanged }: VaultCardProps) {
  const [autoOn, setAutoOn] = useState((autoSavePercentage ?? 0) > 0);
  const [pct, setPct] = useState(autoSavePercentage > 0 ? autoSavePercentage : 5);
  const [savingPct, setSavingPct] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setAutoOn((autoSavePercentage ?? 0) > 0);
    setPct(autoSavePercentage > 0 ? autoSavePercentage : 5);
  }, [autoSavePercentage]);

  const formatNaira = (kobo: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format((kobo ?? 0) / 100);

  const persistPercentage = async (newPct: number) => {
    setSavingPct(true);
    const { error } = await supabase.from('profiles').update({ auto_save_percentage: newPct } as any).eq('id', userId);
    setSavingPct(false);
    if (error) {
      toast.error('Could not update auto-save');
      return;
    }
    toast.success(newPct === 0 ? 'Auto-save off' : `Auto-saving ${newPct}% per gig`);
    onChanged();
  };

  const handleToggle = async (on: boolean) => {
    setAutoOn(on);
    await persistPercentage(on ? (pct || 5) : 0);
  };

  const handlePctChange = (v: number[]) => setPct(v[0]);
  const handlePctCommit = async (v: number[]) => {
    if (autoOn) await persistPercentage(v[0]);
  };

  const submitDeposit = async () => {
    const naira = Number(amount);
    if (!Number.isFinite(naira) || naira < 50) return toast.error('Minimum deposit is N50');
    const kobo = Math.floor(naira * 100);
    if (kobo > walletBalance) return toast.error('Not enough wallet balance');
    setBusy(true);
    const { data, error } = await (supabase.rpc as any)('vault_deposit', { p_amount_kobo: kobo });
    setBusy(false);
    if (error || !data?.success) return toast.error(data?.error || error?.message || 'Failed');
    toast.success('Vault deposit complete');
    setAmount(''); setShowDeposit(false); onChanged();
  };

  const submitWithdraw = async () => {
    const naira = Number(amount);
    if (!Number.isFinite(naira) || naira < 50) return toast.error('Minimum is N50');
    const kobo = Math.floor(naira * 100);
    if (kobo > vaultBalance) return toast.error('Not enough vault balance');
    setBusy(true);
    const { data, error } = await (supabase.rpc as any)('vault_withdraw', { p_amount_kobo: kobo });
    setBusy(false);
    if (error || !data?.success) return toast.error(data?.error || error?.message || 'Failed');
    toast.success('Moved to wallet');
    setAmount(''); setShowWithdraw(false); onChanged();
  };

  return (
    <>
      <Card className="glass-card border-white/10 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-accent/20 blur-3xl" />
        <CardHeader className="relative pb-2">
          <CardDescription className="flex items-center gap-2 text-xs text-muted-foreground">
            <PiggyBank className="h-4 w-4 text-accent" /> AjoSquad Vault
            <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold text-accent">
              <Sparkles className="h-3 w-3" /> Powered by Squad
            </span>
          </CardDescription>
          <CardTitle className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {formatNaira(vaultBalance)}
          </CardTitle>
        </CardHeader>
        <CardContent className="relative space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-background/40 p-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold">Auto-Save on every payout</p>
              <p className="text-xs text-muted-foreground">
                Skim {autoOn ? `${pct}%` : '0%'} of each completed gig into your vault automatically.
              </p>
            </div>
            <Switch checked={autoOn} onCheckedChange={handleToggle} disabled={savingPct} />
          </div>

          {autoOn && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Auto-save percentage</span>
                <span className="font-bold text-foreground">{pct}%</span>
              </div>
              <Slider value={[pct]} onValueChange={handlePctChange} onValueCommit={handlePctCommit} min={1} max={50} step={1} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowDeposit(true)} className="text-xs">
              <ArrowDownToLine className="h-4 w-4 mr-1" /> Add to Vault
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowWithdraw(true)} className="text-xs">
              <ArrowUpFromLine className="h-4 w-4 mr-1" /> Withdraw
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDeposit} onOpenChange={setShowDeposit}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add to AjoSquad Vault</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Wallet balance: {formatNaira(walletBalance)}</p>
            <Input type="number" min={50} placeholder="Amount in N" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <Button onClick={submitDeposit} disabled={busy} className="w-full">
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Move to Vault
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showWithdraw} onOpenChange={setShowWithdraw}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Withdraw from Vault</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Vault balance: {formatNaira(vaultBalance)}</p>
            <Input type="number" min={50} placeholder="Amount in N" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <Button onClick={submitWithdraw} disabled={busy} className="w-full">
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Move to Wallet
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

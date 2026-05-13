import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowDownLeft, Loader2, Wallet, Banknote } from 'lucide-react';

interface DepositModalProps {
  open: boolean;
  onClose: () => void;
}

export default function DepositModal({ open, onClose }: DepositModalProps) {
  const { profile: authProfile } = useAuth();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [provisioning, setProvisioning] = useState(false);

  const provisionDedicatedAccount = async () => {
    setProvisioning(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User authorization required.");

      // Retrieve core identifying parameters cleanly
      const { data: profile, error: profErr } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('id', user.id)
        .single();

      if (profErr) throw new Error("Failed to read user parameter state.");

      const [firstName, ...lastNameParts] = (profile?.full_name || 'Nexora User').trim().split(/\s+/);
      const lastName = lastNameParts.join(' ') || 'User';

      const t = toast.loading("Provisioning permanent Squad funding channel...");

      // Execute pure Edge Function invocation. This request executes over a standard 
      // persistent HTTP transport, completely bypassing dropped UI WebSocket lifecycle scopes.
      const { data, error } = await supabase.functions.invoke('squad-virtual-account', {
        body: {
          first_name: firstName || 'Nexora',
          last_name: lastName || 'User',
          phone: profile?.phone || '08000000000'
        }
      });

      toast.dismiss(t);

      const accountNumber = data?.data?.account_number || data?.account_number;
      const rawBankName = data?.data?.bank_name || data?.bank_name || data?.data?.bank || 'Squad Virtual Bank';
      if (error || !accountNumber) {
        throw new Error(data?.error || data?.message || "Upstream banking configuration failed.");
      }

      // Persist real static parameters explicitly back to the user profiles table
      const { error: syncErr } = await supabase
        .from('profiles')
        .update({
          virtual_account_number: String(accountNumber).trim(),
          virtual_bank_name: String(rawBankName).trim()
        } as any)
        .eq('id', user.id);

      if (syncErr) throw syncErr;

      toast.success("Dedicated funding account linked successfully!");
      // Force direct window state bypass to re-render fresh data stores cleanly
      setTimeout(() => window.location.reload(), 600);
    } catch (err: any) {
      toast.error(err.message || "Failed to establish dedicated banking infrastructure.");
    } finally {
      setProvisioning(false);
    }
  };

  const handleDeposit = async () => {
    const naira = Number(amount);
    if (!Number.isFinite(naira) || naira < 100) {
      toast.error('Minimum deposit is ₦100');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('squad-topup-initialize', {
        body: { amount_kobo: Math.floor(naira * 100) },
      });

      if (error) throw error;

      if (data?.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        throw new Error('No payment URL received');
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to start deposit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Deposit
          </DialogTitle>
          <DialogDescription>
            Fund your wallet so you can pay for gigs faster.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Amount (₦)</Label>
            <Input
              type="number"
              min={100}
              placeholder="1000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Minimum: ₦100</p>
          </div>

          <Button className="w-full" onClick={handleDeposit} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowDownLeft className="h-4 w-4 mr-2" />}
            Continue to payment
          </Button>

          <div className="flex items-center justify-center gap-2 pt-2">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Powered by</span>
            <span className="text-sm font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Squad
            </span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

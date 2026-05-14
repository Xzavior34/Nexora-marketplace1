import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, AlertCircle, Wallet } from 'lucide-react';
import { mapSquadError } from '@/lib/squadErrors';

interface Bank {
  name: string;
  code: string;
}

const FALLBACK_BANKS: Bank[] = [
  { name: 'Access Bank', code: '044' },
  { name: 'Guaranty Trust Bank (GTB)', code: '058' },
  { name: 'Zenith Bank', code: '057' },
  { name: 'United Bank for Africa (UBA)', code: '033' },
  { name: 'First Bank of Nigeria', code: '011' },
  { name: 'Fidelity Bank', code: '070' },
  { name: 'Sterling Bank', code: '030' },
  { name: 'Union Bank of Nigeria', code: '032' },
  { name: 'Wema Bank', code: '035' },
  { name: 'OPay Digital Services', code: '999992' },
  { name: 'PalmPay', code: '999991' },
];

interface Profile {
  id: string;
  bank_name: string | null;
  account_number: string | null;
  account_name: string | null;
  recipient_code: string | null;
}

interface WithdrawModalProps {
  open: boolean;
  onClose: () => void;
  balance: number;
  profile: Profile;
  onSuccess: () => void;
}

export default function WithdrawModal({ open, onClose, balance, profile, onSuccess }: WithdrawModalProps) {
  const [step, setStep] = useState<'bank' | 'amount' | 'confirm' | 'success'>('bank');
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [selectedBank, setSelectedBank] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [verifyingAccount, setVerifyingAccount] = useState(false);
  const [accountVerified, setAccountVerified] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');

  // Load saved bank details ONCE per modal open (prevents focus jump back to 'amount')
  const autoAdvancedRef = useRef(false);
  useEffect(() => {
    if (!open) { autoAdvancedRef.current = false; return; }
    if (autoAdvancedRef.current) return;
    if (profile.bank_name && profile.account_number && profile.account_name && banks.length > 0) {
      const savedBank = banks.find(b =>
        b.name.toLowerCase() === profile.bank_name?.toLowerCase() ||
        b.name.toLowerCase().includes(profile.bank_name?.toLowerCase() || '')
      );
      if (savedBank) setSelectedBank(savedBank.code);
      setAccountName(profile.account_name);
      setAccountNumber(profile.account_number);
      setAccountVerified(true);
      setStep('amount');
      autoAdvancedRef.current = true;
    }
  }, [open, profile.bank_name, profile.account_number, profile.account_name, banks]);

  // Fetch banks
  useEffect(() => {
    if (open && banks.length === 0) {
      fetchBanks();
    }
  }, [open]);

  const fetchBanks = async () => {
    setLoadingBanks(true);
    try {
      const { data, error } = await supabase.functions.invoke('squad-banks');
      if (error || !data?.banks?.length) {
        setBanks(FALLBACK_BANKS);
      } else {
        setBanks(data.banks);
      }
    } catch (err) {
      setBanks(FALLBACK_BANKS);
    } finally {
      setLoadingBanks(false);
    }
  };

  const verifyBankAccount = async () => {
    if (!selectedBank || accountNumber.length !== 10) {
      toast.error('Please select a bank and enter a valid 10-digit account number');
      return;
    }

    setVerifyingAccount(true);
    setAccountName('');
    setAccountVerified(false);

    try {
      const { data, error } = await supabase.functions.invoke('squad-account-lookup', {
        body: { account_number: accountNumber.trim(), bank_code: selectedBank.trim() },
      });

      const isSuccess = data?.success || data?.status === 'success' || data?.status === 200;

      if (error || !isSuccess) {
        toast.error(data?.message || data?.error || 'Could not verify account');
        return;
      }

      const resolvedName = data.data?.account_name || data?.account_name || '';
      setAccountName(resolvedName);
      setAccountVerified(true);
      toast.success('Account verified!');

      // Persist the pre-validated account details immediately to the database ledger
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const bankName = banks.find(b => b.code === selectedBank)?.name || '';
        await supabase
          .from('profiles')
          .update({
            account_number: accountNumber.trim(),
            bank_name: bankName,
            account_name: resolvedName,
          })
          .eq('id', user.id);
      }
    } catch (err) {
      toast.error('Account verification failed');
    } finally {
      setVerifyingAccount(false);
    }
  };

  const handleProceedToAmount = () => {
    if (!accountVerified) {
      toast.error('Please verify your account first');
      return;
    }
    setStep('amount');
  };

  const handleProceedToConfirm = () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount < 100) {
      toast.error('Minimum withdrawal is ₦100');
      return;
    }
    if (amount * 100 > balance) {
      toast.error('Insufficient balance');
      return;
    }
    setStep('confirm');
  };

  const handleWithdraw = async () => {
    setIsSubmitting(true);
    try {
      const bankName = banks.find(b => b.code === selectedBank)?.name || profile.bank_name || '';

      const { error: updateError } = await supabase.from('profiles').update({
        bank_name: bankName,
        account_number: accountNumber,
        account_name: accountName,
        recipient_code: null,
      }).eq('id', profile.id);

      if (updateError) {
        console.error('Failed to save bank details:', updateError);
        throw new Error('Failed to save bank details');
      }

      // Stripe-tier manual withdrawal flow via real-time Postgres RPC
      const { data, error } = await supabase.rpc('initiate_manual_withdrawal', {
        p_amount_kobo: Math.round(parseFloat(withdrawAmount) * 100),
        p_bank_name: bankName,
        p_account_number: accountNumber,
        p_account_name: accountName,
      });

      if (error) {
        console.error('Withdrawal error:', error);
        throw new Error(error.message || 'Withdrawal failed');
      }

      const result = data as { success: boolean; error?: string; new_balance?: number };
      if (!result?.success) {
        toast.error(result?.error || 'Withdrawal failed');
        return;
      }

      toast.success('Withdrawal initiated. Your payout is queued for secure manual processing.');

      // Silently trigger Ambassador check in the background
      void supabase.rpc('process_ambassador_reward', {
        p_user_id: profile.id,
        p_amount_kobo: parseFloat(withdrawAmount) * 100
      }).then(({ error }) => { if (error) console.error(error); });

      setStep('success');
      onSuccess();
    } catch (err: any) {
      console.error('Withdrawal error:', err);
      toast.error(err.message || 'Withdrawal failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatNaira = (kobo: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(kobo / 100);
  };

  const handleClose = () => {
    setStep('bank');
    setWithdrawAmount('');
    if (!profile.bank_name) {
      setSelectedBank('');
      setAccountNumber('');
      setAccountName('');
      setAccountVerified(false);
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {step === 'bank' && (
          <>
            <DialogHeader>
              <DialogTitle>Bank Details</DialogTitle>
              <DialogDescription>
                Enter your bank account for withdrawal
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Select Bank</Label>
                <Select value={selectedBank} onValueChange={(val) => {
                  setSelectedBank(val || '');
                  setAccountVerified(false);
                  setAccountName('');
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingBanks ? "Loading banks..." : "Select a bank"} />
                  </SelectTrigger>
                  <SelectContent>
                    {banks.map((bank) => (
                      <SelectItem key={bank.code} value={bank.code}>
                        {bank.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Account Number</Label>
                <Input
                  type="text"
                  maxLength={10}
                  placeholder="0123456789"
                  value={accountNumber}
                  onChange={(e) => {
                    const val = e.target.value || '';
                    setAccountNumber(val.replace(/\D/g, ''));
                    setAccountVerified(false);
                    setAccountName('');
                  }}
                />
              </div>

              {accountName && (
                <div className="flex items-center gap-2 p-3 bg-secondary rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <span className="font-medium text-foreground">{accountName}</span>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={verifyBankAccount}
                  disabled={verifyingAccount || !selectedBank || accountNumber.length !== 10}
                  className="flex-1"
                >
                  {verifyingAccount ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Verify Account
                </Button>
                <Button
                  onClick={handleProceedToAmount}
                  disabled={!accountVerified}
                  className="flex-1"
                >
                  Continue
                </Button>
              </div>
            </div>
          </>
        )}

        {step === 'amount' && (
          <>
            <DialogHeader>
              <DialogTitle>Withdrawal Amount</DialogTitle>
              <DialogDescription>
                Available: {formatNaira(balance)}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Amount (₦)</Label>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value || '')}
                  min={100}
                  max={balance / 100}
                />
                <p className="text-xs text-muted-foreground">Minimum: ₦100</p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep('bank')} className="flex-1">
                  Back
                </Button>
                <Button onClick={handleProceedToConfirm} className="flex-1">
                  Continue
                </Button>
              </div>
            </div>
          </>
        )}

        {step === 'confirm' && (
          <>
            <DialogHeader>
              <DialogTitle>Confirm Withdrawal</DialogTitle>
              <DialogDescription>
                Review your withdrawal details
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-secondary rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Withdrawal Amount</span>
                  <span className="font-bold text-foreground">₦{parseFloat(withdrawAmount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-destructive">
                  <span>Service Fee (10%)</span>
                  <span>-₦{(parseFloat(withdrawAmount) * 0.10).toLocaleString()}</span>
                </div>
                <hr className="border-border" />
                <div className="flex justify-between font-bold">
                  <span className="text-foreground">You Will Receive</span>
                  <span className="text-primary">₦{(parseFloat(withdrawAmount) * 0.90).toLocaleString()}</span>
                </div>
                <hr className="border-border my-2" />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bank</span>
                  <span className="text-foreground">{banks.find(b => b.code === selectedBank)?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Account</span>
                  <span className="text-foreground">{accountNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name</span>
                  <span className="text-foreground">{accountName}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep('amount')} className="flex-1">
                  Back
                </Button>
                <Button
                  onClick={handleWithdraw}
                  disabled={isSubmitting}
                  className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Withdraw
                </Button>
              </div>

              <div className="flex items-center justify-center gap-2 pt-1">
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
          </>
        )}

        {step === 'success' && (
          <>
            <DialogHeader className="text-center">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <DialogTitle>Withdrawal Successful!</DialogTitle>
              <DialogDescription>
                Your withdrawal of ₦{(parseFloat(withdrawAmount) * 0.90).toLocaleString()} has been sent to your bank account.
                Funds typically arrive within a few minutes.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

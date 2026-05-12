import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { ArrowLeft, ShieldCheck, ShieldAlert, Loader2, CheckCircle2, XCircle, Sparkles, Banknote } from 'lucide-react';

interface Request {
  id: string;
  user_id: string;
  amount_kobo: number;
  bank_name: string;
  account_number: string;
  account_name: string;
  status: string;
  created_at: string;
  profile?: { full_name: string | null; email: string | null; is_verified: boolean | null };
}

interface Audit {
  verdict: 'pass' | 'alert';
  label: string;
  confidence: number;
  reasoning?: string;
}

const ADMIN_EMAIL = 'unigig60@gmail.com';

export default function AdminWithdrawals() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<Request[]>([]);
  const [audits, setAudits] = useState<Record<string, Audit | 'loading'>>({});
  const [processing, setProcessing] = useState<string | null>(null);

  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL;

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    if (!isAdmin) { navigate('/dashboard'); return; }
    void fetchRequests();
    const channel = supabase
      .channel('admin-withdrawals')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawal_requests' }, () => fetchRequests())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [user, isAdmin]);

  const fetchRequests = async () => {
    setLoading(true);
    const { data: reqs, error } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (error) {
      toast.error('Failed to load requests');
      setLoading(false);
      return;
    }
    const userIds = Array.from(new Set((reqs ?? []).map(r => r.user_id)));
    let profilesMap: Record<string, any> = {};
    if (userIds.length) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, full_name, email, is_verified')
        .in('id', userIds);
      profilesMap = Object.fromEntries((profs ?? []).map(p => [p.id, p]));
    }
    setRequests((reqs ?? []).map(r => ({ ...r, profile: profilesMap[r.user_id] })));
    setLoading(false);
  };

  const runAudit = async (req: Request) => {
    setAudits(prev => ({ ...prev, [req.id]: 'loading' }));
    try {
      const { data, error } = await supabase.functions.invoke('withdrawal-audit', {
        body: { audit_user_id: req.user_id },
      });
      if (error) throw error;
      setAudits(prev => ({ ...prev, [req.id]: data as Audit }));
    } catch (err: any) {
      toast.error('AI audit failed');
      setAudits(prev => { const n = { ...prev }; delete n[req.id]; return n; });
    }
  };

  const handleAction = async (req: Request, action: 'approve' | 'reject') => {
    setProcessing(req.id);
    try {
      const { data, error } = await supabase.rpc('admin_process_withdrawal', {
        p_request_id: req.id,
        p_action: action,
      });
      if (error) throw error;
      const r = data as { success: boolean; error?: string };
      if (!r.success) { toast.error(r.error || 'Action failed'); return; }
      toast.success(action === 'approve' ? 'Payout approved' : 'Payout rejected & refunded');
      setRequests(prev => prev.filter(x => x.id !== req.id));
    } catch (err: any) {
      toast.error(err.message || 'Action failed');
    } finally {
      setProcessing(null);
    }
  };

  const formatNaira = (kobo: number) => new Intl.NumberFormat('en-NG', {
    style: 'currency', currency: 'NGN', minimumFractionDigits: 0,
  }).format(kobo / 100);

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-6">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-background/80 backdrop-blur-xl">
        <div className="container max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin')} className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Banknote className="h-5 w-5 text-primary" />
              Manual Payout Desk
            </h1>
            <p className="text-xs text-muted-foreground">AI-audited withdrawals · Squad-grade compliance</p>
          </div>
          <Badge className="rounded-full px-3 py-1 bg-primary/15 text-primary border border-primary/30">
            {requests.length} pending
          </Badge>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto px-4 py-6 space-y-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 w-full rounded-2xl" />)}
          </div>
        ) : requests.length === 0 ? (
          <Card className="glass-card p-12 text-center">
            <ShieldCheck className="h-12 w-12 mx-auto text-emerald-400 mb-3" />
            <h2 className="text-lg font-semibold">Queue Clear</h2>
            <p className="text-sm text-muted-foreground mt-1">No pending payouts. The AI Auditor is standing by.</p>
          </Card>
        ) : requests.map(req => {
          const audit = audits[req.id];
          const auditLoaded = audit && audit !== 'loading';
          const passed = auditLoaded && (audit as Audit).verdict === 'pass';
          return (
            <Card key={req.id} className="glass-card p-5 border border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.25)]">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h3 className="font-semibold text-base truncate">
                      {req.profile?.full_name || 'Unknown user'}
                    </h3>
                    {req.profile?.is_verified && (
                      <Badge className="rounded-full px-2 py-0.5 text-[10px] bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
                        Verified
                      </Badge>
                    )}
                    <Badge className="rounded-full px-2 py-0.5 text-[10px] bg-amber-500/15 text-amber-300 border-amber-500/30">
                      Pending
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{req.profile?.email}</p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Amount</p>
                      <p className="text-lg font-bold tabular-nums text-primary">{formatNaira(req.amount_kobo)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Bank</p>
                      <p className="text-sm font-medium truncate">{req.bank_name}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Account</p>
                      <p className="text-sm font-mono">{req.account_number}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Name</p>
                      <p className="text-sm font-medium truncate">{req.account_name}</p>
                    </div>
                  </div>
                </div>

                <div className="md:w-72 shrink-0 flex flex-col gap-2">
                  {audit === 'loading' ? (
                    <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span className="text-xs">AI auditing behavior…</span>
                    </div>
                  ) : auditLoaded ? (
                    <div className={`rounded-xl p-3 border ${passed ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-red-500/40 bg-red-500/5'}`}>
                      <div className="flex items-center gap-2">
                        {passed ? <ShieldCheck className="h-4 w-4 text-emerald-400" /> : <ShieldAlert className="h-4 w-4 text-red-400" />}
                        <span className={`text-xs font-bold ${passed ? 'text-emerald-300' : 'text-red-300'}`}>
                          {(audit as Audit).label}
                        </span>
                      </div>
                      {(audit as Audit).reasoning && (
                        <p className="text-[11px] text-muted-foreground mt-1.5 leading-snug">
                          {(audit as Audit).reasoning}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-1.5">
                        Confidence: <span className="font-semibold">{(audit as Audit).confidence}%</span>
                      </p>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => runAudit(req)} className="border-primary/40 hover:bg-primary/10">
                      <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Run AI Fraud Audit
                    </Button>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleAction(req, 'approve')}
                      disabled={processing === req.id}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white"
                    >
                      {processing === req.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleAction(req, 'reject')}
                      disabled={processing === req.id}
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </main>
    </div>
  );
}

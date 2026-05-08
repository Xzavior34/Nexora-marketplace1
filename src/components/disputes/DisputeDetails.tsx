import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ShieldAlert, User, Briefcase, CheckCircle, XCircle, Loader2, Scale, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Dispute {
  id: string;
  task_id: string;
  reporter_id: string;
  reported_id: string;
  reason: string;
  status: string;
  type: string;
  admin_notes: string | null;
  created_at: string;
  task?: any;
  reporter?: any;
  reported?: any;
  appeals?: any[]; 
}

interface DisputeDetailsProps {
  dispute: Dispute;
  onResolve: () => Promise<any>; 
}

export function DisputeDetails({ dispute, onResolve }: DisputeDetailsProps) {
  const [resolving, setResolving] = useState<string | null>(null);

  const handleResolve = async (resolution: 'worker' | 'poster') => {
    setResolving(resolution);
    try {
      // Direct call to the SQL Database Function
      // This bypasses the Edge Function to avoid "non-2xx" errors
      const { error } = await supabase.rpc('admin_settle_dispute_v2', {
        p_dispute_id: dispute.id,
        p_resolution: resolution
      });

      if (error) throw error;

      toast.success(`Funds ${resolution === 'worker' ? 'paid to worker' : 'refunded to poster'}!`);
      
      // Refresh the Admin Dashboard UI
      await onResolve();

    } catch (err: any) {
      console.error('Settlement Error:', err);
      toast.error("Settlement failed: " + err.message);
    } finally {
      setResolving(null);
    }
  };

  const formatNaira = (kobo: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(kobo / 100);
  };

  const isResolved = dispute.status.startsWith('resolved');
  const appeal = dispute.appeals && dispute.appeals.length > 0 ? dispute.appeals[0] : null;

  return (
    <Card className="overflow-hidden border-none shadow-xl rounded-2xl bg-card">
      <CardHeader className="bg-slate-900 text-white p-4 sm:p-6">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
              <ShieldAlert className="h-6 w-6 text-amber-400" />
            </div>
            <CardTitle className="text-lg font-bold tracking-tight break-words">
              Dispute: {dispute.task?.title || 'Unknown Gig'}
            </CardTitle>
          </div>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardDescription className="text-slate-400 text-xs">
              Case ID: {dispute.id.slice(0, 8).toUpperCase()} • Filed {format(new Date(dispute.created_at), 'PPP')}
            </CardDescription>
            <Badge 
              variant="outline" 
              className={`capitalize px-3 py-1 text-xs font-semibold border-2 ${
                dispute.status === 'pending' ? 'border-amber-500 text-amber-400' : 
                dispute.status === 'appealed' ? 'border-blue-500 text-blue-400' :
                'border-green-500 text-green-400'
              }`}
            >
              {dispute.status.replace('_', ' ')}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 sm:p-6 space-y-6">
        <div className="grid grid-cols-1 gap-6">
          {/* Worker Report */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-muted-foreground">
              <User className="h-4 w-4" /> Worker's Statement
            </div>
            <div className="p-4 bg-muted/50 rounded-xl border">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-8 w-8 bg-background rounded-full flex items-center justify-center border font-bold text-sm">
                  {dispute.reporter?.full_name?.charAt(0) || 'W'}
                </div>
                <p className="font-bold text-sm">{dispute.reporter?.full_name || 'Worker'}</p>
              </div>
              <p className="text-sm text-muted-foreground italic leading-relaxed">"{dispute.reason}"</p>
            </div>
          </div>

          {/* Poster Appeal */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-blue-600">
              <Scale className="h-4 w-4" /> Poster's Appeal
            </div>
            {appeal ? (
              <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-8 w-8 bg-background rounded-full flex items-center justify-center border font-bold text-sm text-blue-600">
                    {dispute.reported?.full_name?.charAt(0) || 'P'}
                  </div>
                  <p className="font-bold text-sm">{dispute.reported?.full_name || 'Poster'}</p>
                </div>
                <p className="text-sm italic leading-relaxed">"{appeal.reason}"</p>
              </div>
            ) : (
              <div className="bg-muted/30 border-2 border-dashed p-6 rounded-xl flex flex-col items-center text-muted-foreground">
                <Clock className="h-6 w-6 mb-2 opacity-30" />
                <p className="text-sm italic">Waiting for poster to appeal...</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-muted/50 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 border">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-background rounded-xl flex items-center justify-center border shrink-0">
              <Briefcase className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Escrow Amount</p>
              <p className="text-2xl font-black">{formatNaira(dispute.task?.price_kobo || 0)}</p>
            </div>
          </div>

          {!isResolved ? (
            <div className="flex gap-2 w-full sm:w-auto">
              <Button 
                variant="outline" 
                className="flex-1 sm:flex-none h-11 px-4 border-2 font-bold rounded-xl text-sm border-green-500 text-green-600 hover:bg-green-50"
                onClick={() => handleResolve('worker')}
                disabled={!!resolving}
              >
                {resolving === 'worker' ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                Pay Worker
              </Button>
              <Button 
                variant="destructive" 
                className="flex-1 sm:flex-none h-11 px-4 font-bold rounded-xl text-sm"
                onClick={() => handleResolve('poster')}
                disabled={!!resolving}
              >
                {resolving === 'poster' ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <XCircle className="h-4 w-4 mr-1" />}
                Refund Poster
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-green-100 dark:bg-green-950/30 px-4 py-3 rounded-xl border border-green-200">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-bold text-green-900 dark:text-green-400 text-sm">Resolved</p>
                <p className="text-xs text-green-700 dark:text-green-500">
                  {dispute.status.includes('worker') ? 'Released to worker' : 'Refunded to poster'}
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, AlertTriangle, ShieldAlert, MessageSquareText } from 'lucide-react';

interface ReportScamModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  workerId: string;
  posterId: string;
  taskTitle: string;
  onSuccess?: () => void;
}

export function ReportScamModal({ 
  open, onOpenChange, taskId, workerId, posterId, taskTitle, onSuccess 
}: ReportScamModalProps) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error('Please provide a reason for the report');
      return;
    }

    setLoading(true);
    try {
      const { error: disputeError } = await (supabase.from('disputes' as any) as any).insert({
        task_id: taskId,
        reporter_id: workerId,
        reported_id: posterId,
        reason: reason.trim(),
        status: 'pending',
        type: 'scam_report'
      });

      if (disputeError) throw disputeError;

      // If gig was cancelled (refunded), freeze the poster's funds
      const { data: taskData } = await supabase.from('tasks').select('status').eq('id', taskId).single();
      if (taskData?.status === 'cancelled') {
        await (supabase.rpc as any)('freeze_poster_funds', {
          p_task_id: taskId,
          p_reporter_id: workerId,
          p_poster_id: posterId,
        });
      } else {
        await supabase.from('tasks').update({ status: 'disputed' as any }).eq('id', taskId);
        await supabase.from('escrow_transactions').update({ status: 'disputed' as any }).eq('task_id', taskId);
      }

      await supabase.from('notifications').insert({
        user_id: posterId,
        title: 'Reported for Scam',
        body: `You have been reported regarding the gig: "${taskTitle}". You can file an appeal in the gig details.`,
        data: { taskId, type: 'scam_report' },
      });

      toast.success('Report filed successfully. The admin has been notified.');
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      console.error('Report error:', err);
      toast.error('Failed to file report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-none shadow-2xl rounded-2xl flex flex-col max-h-[90vh]">
        <div className="bg-gradient-to-br from-red-600 to-red-700 p-6 text-white shrink-0">
          <DialogHeader className="space-y-2">
            <div className="h-12 w-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-1">
              <ShieldAlert className="h-6 w-6 text-white" />
            </div>
            <DialogTitle className="text-2xl font-bold tracking-tight">Report Scam</DialogTitle>
            <DialogDescription className="text-red-100 text-sm leading-relaxed">
              Reporting the poster of <span className="font-semibold text-white">"{taskTitle}"</span>. This will freeze the gig funds.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-5 bg-background overflow-y-auto flex-1">
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4 rounded-xl flex gap-3 items-start">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900 dark:text-amber-400 text-sm">Escrow Protection</p>
              <p className="text-xs text-amber-800 dark:text-amber-500">Funds remain locked until an admin reviews both sides.</p>
            </div>
          </div>

          <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl flex gap-3 items-start">
            <MessageSquareText className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground text-sm">Chat history attached</p>
              <p className="text-xs text-muted-foreground">Your full conversation with the other party is automatically attached for admin review — you don't need to copy anything.</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Reason for dispute</label>
            <Textarea
              placeholder="Explain clearly what happened..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="resize-none text-base p-3 rounded-xl"
            />
          </div>

          <div className="flex gap-3 pt-2 pb-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 h-12 rounded-xl">Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={handleSubmit} 
              disabled={loading || !reason.trim()} 
              className="flex-1 h-12 rounded-xl"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              File Report
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
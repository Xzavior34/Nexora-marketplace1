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
import { Loader2, Scale, Info } from 'lucide-react';

interface AppealModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disputeId: string;
  taskId: string;
  posterId: string;
  taskTitle: string;
  onSuccess?: () => void;
}

export function AppealModal({ 
  open, onOpenChange, disputeId, taskId, posterId, taskTitle, onSuccess 
}: AppealModalProps) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error('Please provide a reason for your appeal');
      return;
    }

    setLoading(true);
    try {
      const { error: appealError } = await (supabase.from('appeals' as any) as any).insert({
        dispute_id: disputeId,
        poster_id: posterId,
        reason: reason.trim(),
      });

      if (appealError) {
        console.warn('Appeal insert error:', appealError);
      }

      await (supabase.from('disputes' as any) as any).update({ status: 'appealed' }).eq('id', disputeId);

      toast.success('Appeal filed successfully. The admin will review both sides.');
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      console.error('Appeal error:', err);
      toast.error('Failed to file appeal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-none shadow-2xl rounded-2xl max-h-[90vh] flex flex-col">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 text-white shrink-0">
          <DialogHeader className="space-y-2">
            <div className="h-12 w-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-1">
              <Scale className="h-6 w-6 text-white" />
            </div>
            <DialogTitle className="text-2xl font-bold tracking-tight">File an Appeal</DialogTitle>
            <DialogDescription className="text-slate-300 text-sm leading-relaxed">
              You've been reported regarding <span className="font-semibold text-white">"{taskTitle}"</span>. Explain your side.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-6 bg-background overflow-y-auto flex-1">
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-4 rounded-xl flex gap-3 items-start">
            <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800 dark:text-blue-300">The admin will review your explanation alongside the worker's report.</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Your Explanation</label>
            <Textarea
              placeholder="Explain why you cancelled or why the report is incorrect..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={5}
              className="resize-none text-base p-3 rounded-xl"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 h-12 rounded-xl">Cancel</Button>
            <Button 
              onClick={handleSubmit} 
              disabled={loading || !reason.trim()} 
              className="flex-1 h-12 rounded-xl"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Submit Appeal
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
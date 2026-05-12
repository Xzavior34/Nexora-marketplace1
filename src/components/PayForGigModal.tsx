import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, CreditCard, Shield, AlertCircle } from 'lucide-react';

interface PayForGigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: {
    id: string;
    title: string;
    price_kobo: number;
    assignee_id: string;
  };
}

export function PayForGigModal({ open, onOpenChange, task }: PayForGigModalProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const platformFee = Math.floor(task.price_kobo * 0.2);
  const workerReceives = task.price_kobo - platformFee;

  const handlePay = async () => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('paystack-initialize', {
        body: {
          taskId: task.id,
          assigneeId: task.assignee_id,
        },
      });

      if (error) throw error;

      if (data?.authorization_url) {
        // Redirect to Squad
        window.location.href = data.authorization_url;
      } else {
        throw new Error('No payment URL received');
      }
    } catch (err) {
      console.error('Payment error:', err);
      toast.error('Failed to initialize payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatNaira = (kobo: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(kobo / 100);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Pay for Gig
          </DialogTitle>
          <DialogDescription>
            Secure payment via Squad. Funds held in escrow until work is completed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <h4 className="font-medium truncate">{task.title}</h4>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gig Price</span>
                <span className="font-medium">{formatNaira(task.price_kobo)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Platform Fee (20%)</span>
                <span className="font-medium">{formatNaira(platformFee)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between">
                <span className="text-muted-foreground">Worker Receives</span>
                <span className="font-medium text-primary">{formatNaira(workerReceives)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 text-sm text-muted-foreground bg-secondary/50 rounded-lg p-3">
            <Shield className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
            <p>
              Your payment is held securely in escrow. Funds are only released when you confirm the work is complete.
            </p>
          </div>

          <div className="flex items-start gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/20 rounded-lg p-3">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <p>
              You will be redirected to Squad to complete payment securely.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handlePay} disabled={loading} className="flex-1">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <CreditCard className="h-4 w-4 mr-2" />
            )}
            Pay {formatNaira(task.price_kobo)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

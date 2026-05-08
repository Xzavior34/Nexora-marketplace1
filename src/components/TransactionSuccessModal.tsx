import { useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  amount?: string;
  message?: string;
}

export function TransactionSuccessModal({ open, onClose, amount, message }: Props) {
  useEffect(() => {
    if (open) {
      const timer = setTimeout(onClose, 5000);
      return () => clearTimeout(timer);
    }
  }, [open, onClose]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm text-center">
        <div className="py-6 space-y-4">
          <div className="mx-auto h-20 w-20 rounded-full bg-green-500/10 flex items-center justify-center animate-in zoom-in-50 duration-500">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Transaction Successful!</h2>
          {amount && (
            <p className="text-3xl font-bold text-primary">{amount}</p>
          )}
          <p className="text-muted-foreground">
            {message || 'Your payment has been processed successfully.'}
          </p>
          <Button onClick={onClose} className="w-full">Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

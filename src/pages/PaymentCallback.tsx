import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function PaymentCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyPayment = async () => {
      const reference = searchParams.get('reference');
      const trxref = searchParams.get('trxref');
      
      const ref = reference || trxref;
      
      if (!ref) {
        setStatus('failed');
        setMessage('No payment reference found');
        return;
      }

      // The webhook handles the actual verification.
      // We just check the status in the database (escrow OR wallet topup).
      try {
        const { data: topup } = await (supabase as any)
          .from('wallet_topups')
          .select('*')
          .eq('squad_reference', ref)
          .maybeSingle();

        if (topup) {
          if (topup.status === 'success') {
            setStatus('success');
            setMessage(`Deposit confirmed! Your wallet has been funded with ₦${((topup.amount_kobo || 0) / 100).toLocaleString()} via Squad.`);
          } else {
            // Poll for status update
            setStatus('success');
            setMessage('Deposit is being processed. Please wait...');
            
            const pollInterval = setInterval(async () => {
              const { data: updated } = await (supabase as any)
                .from('wallet_topups')
                .select('status, amount_kobo')
                .eq('squad_reference', ref)
                .single();
              
              if (updated?.status === 'success') {
                clearInterval(pollInterval);
                setMessage(`Deposit confirmed! Your wallet has been funded with ₦${((updated.amount_kobo || 0) / 100).toLocaleString()} via Squad.`);
              }
            }, 3000);
            
            // Clear after 60 seconds
            setTimeout(() => clearInterval(pollInterval), 60000);
          }
          return;
        }

        const { data: escrow, error } = await (supabase as any)
          .from('escrow_transactions')
          .select('*, tasks!escrow_transactions_task_id_fkey(title)')
          .eq('squad_reference', ref)
          .single();

        if (error || !escrow) {
          // Payment might still be processing
          setStatus('success');
          setMessage('Payment is being processed. You will be notified once confirmed.');
          return;
        }

        const taskTitle = (escrow as any).tasks?.title ?? 'your gig';

        if (escrow.status === 'held') {
          setStatus('success');
          setMessage(`Payment confirmed! The worker can now start on "${taskTitle}".`);
        } else if (escrow.status === 'pending') {
          setStatus('success');
          setMessage('Payment is being processed. Please wait a moment...');
          // Poll for status update
          const interval = setInterval(async () => {
            const { data: updated } = await (supabase as any)
              .from('escrow_transactions')
              .select('status')
              .eq('id', escrow.id)
              .single();

            if (updated?.status === 'held') {
              clearInterval(interval);
              setMessage('Payment confirmed! The worker can now start.');
            }
          }, 2000);

          // Clear after 30 seconds
          setTimeout(() => clearInterval(interval), 30000);
        } else {
          setStatus('failed');
          setMessage('Payment could not be verified. Please contact support.');
        }
      } catch (err) {
        console.error('Verification error:', err);
        setStatus('success');
        setMessage('Payment submitted. You will be notified once confirmed.');
      }
    };

    verifyPayment();
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-secondary/20 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="py-12 text-center space-y-6">
          {status === 'loading' && (
            <>
              <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto" />
              <div>
                <h2 className="text-xl font-semibold">Processing Payment</h2>
                <p className="text-muted-foreground mt-2">Please wait while we verify your payment...</p>
              </div>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mx-auto">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-green-600">Payment Successful!</h2>
                <p className="text-muted-foreground mt-2">{message}</p>
              </div>
            </>
          )}

          {status === 'failed' && (
            <>
              <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto">
                <XCircle className="h-10 w-10 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-red-600">Payment Failed</h2>
                <p className="text-muted-foreground mt-2">{message}</p>
              </div>
            </>
          )}

          <div className="flex gap-3 justify-center pt-4">
            <Button variant="outline" onClick={() => navigate('/gigs')}>
              Browse Gigs
            </Button>
            <Button onClick={() => navigate('/dashboard')}>
              Go to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

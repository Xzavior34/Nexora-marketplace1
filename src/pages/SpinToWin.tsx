import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { SpinWheel } from '@/components/promotions/SpinWheel';
import { PrizeDialog } from '@/components/promotions/PrizeDialog';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Sparkles, Gift, Ticket } from 'lucide-react';
import { toast } from 'sonner';

export default function SpinToWin() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();

  const [isSpinning, setIsSpinning] = useState(false);
  const [showPrize, setShowPrize] = useState(false);
  const [wonAmount, setWonAmount] = useState(0);
  const [tickets, setTickets] = useState(0);
  const [loading, setLoading] = useState(true);

  // Set this to true if you ever want to lock the page again
  const MAINTENANCE_LOCK = false; 

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchTickets();
  }, [user]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('spin_tickets')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      setTickets(data?.spin_tickets || 0);
    } catch (err) {
      console.error('Error checking spin status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleWin = async (amount: number) => {
    if (MAINTENANCE_LOCK) return;

    setWonAmount(amount);
    
    // The ticket was already securely deducted by Supabase in the SpinWheel component.
    // We just update the UI state here to drop by 1 instantly.
    setTickets(prev => Math.max(0, prev - 1));

    if (user && amount > 0) {
      try {
        const newBalance = (profile?.wallet_balance || 0) + (amount * 100);

        const { error: updateError } = await supabase
          .from('profiles')
          .update({ wallet_balance: newBalance })
          .eq('id', user.id);

        if (updateError) throw updateError;

        await supabase.from('wallet_transactions').insert({
          user_id: user.id,
          type: 'deposit',
          amount_kobo: amount * 100,
          balance_after_kobo: newBalance,
          description: `Won ₦${amount} from Spin to Win ticket!`,
        });

        await supabase.from('notifications').insert({
          user_id: user.id,
          title: 'Prize Claimed!',
          body: `₦${amount} has been added to your wallet. Congratulations!`,
          data: { type: 'promo_win', amount },
        });

        await refreshProfile();
        toast.success(`₦${amount} added to your wallet!`);
      } catch (err) {
        console.error('Error claiming prize:', err);
        toast.error('Failed to process winnings. Please contact support.');
      }
    } else if (amount === 0) {
      toast.info("Aww, no win this time! Earn another ticket to try again.");
    }

    setTimeout(() => {
      setShowPrize(true);
    }, 500);
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Sparkles className="w-12 h-12 text-primary animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background pb-20">
      <SEOHead
        title="Spin to Win! | Nexora Rewards"
        description="Hire a worker and stand a chance to win up to 10k Naira!"
      />

      <header className="p-4 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Promotions</h1>
      </header>

      <main className="container max-w-2xl mx-auto px-4 py-8 space-y-8 text-center">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-bold animate-bounce">
            <Gift className="w-4 h-4" />
            SPECIAL PROMOTION
          </div>
          <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-foreground">
            SPIN & WIN <span className="text-primary">₦10,000!</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            {MAINTENANCE_LOCK 
              ? "The Spin Wheel is currently undergoing maintenance. Check back soon!" 
              : "Thanks for hiring on Nexora! Use your Spin Tickets below. Good luck!"}
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full border-2 border-primary/20 bg-background shadow-sm">
          <Ticket className="text-primary w-6 h-6" />
          <span className="text-xl font-bold">{tickets} Tickets Available</span>
        </div>

        {tickets <= 0 || MAINTENANCE_LOCK ? (
          <div className="bg-card border-2 border-dashed border-muted p-12 rounded-3xl space-y-6 mt-8">
            <div className="mx-auto w-20 h-20 bg-muted rounded-full flex items-center justify-center text-muted-foreground">
              <Ticket className="w-10 h-10 opacity-50" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold">
                {MAINTENANCE_LOCK ? "Temporarily Unavailable" : "Out of Tickets!"}
              </h3>
              <p className="text-muted-foreground">
                {MAINTENANCE_LOCK 
                   ? "We are currently updating our prizes. Please hold onto your tickets!"
                   : "You need a Spin Ticket to play. You earn 1 free ticket every time you successfully hire a worker!"}
              </p>
            </div>
            {!MAINTENANCE_LOCK && (
                <Button onClick={() => navigate('/gigs')} className="w-full h-14 text-lg font-bold rounded-xl">
                    FIND WORKERS TO HIRE
                </Button>
            )}
          </div>
        ) : (
          <div className="mt-8">
            <SpinWheel
              onWin={handleWin}
              isSpinning={isSpinning} 
              setIsSpinning={setIsSpinning}
              userId={user.id} 
            />
          </div>
        )}
        
        <div className="pt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
          <div className="p-6 bg-card rounded-2xl border border-border shadow-sm">
            <h4 className="font-bold mb-2 flex items-center gap-2">
              <Ticket className="w-4 h-4 text-primary" />
              How to get tickets
            </h4>
            <p className="text-sm text-muted-foreground">
              Every time you hire a worker for your gig and place the funds in Escrow, you are rewarded with 1 Spin Ticket.
            </p>
          </div>
          <div className="p-6 bg-card rounded-2xl border border-border shadow-sm">
            <h4 className="font-bold mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Instant Payout
            </h4>
            <p className="text-sm text-muted-foreground">
              Winnings are automatically added to your Nexora wallet.
            </p>
          </div>
        </div>
      </main>

      <PrizeDialog
        open={showPrize}
        onClose={() => setShowPrize(false)}
        amount={wonAmount}
      />
    </div>
  );
}

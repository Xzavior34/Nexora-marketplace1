import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { SEOHead } from '@/components/SEOHead';
import { NotificationBell } from '@/components/NotificationBell';
import { SavedGigs } from '@/components/SavedGigs';
import { OnboardingTutorial } from '@/components/OnboardingTutorial';
import { AmbassadorBadge } from '@/components/AmbassadorBadge';
import {
  Wallet, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle2, Plus, User, Briefcase, RefreshCw, Shield, Gift,
} from 'lucide-react';
import WithdrawModal from '@/components/dashboard/WithdrawModal';
import DepositModal from '@/components/dashboard/DepositModal';
import TransactionList from '@/components/dashboard/TransactionList';
import ActiveGigs from '@/components/dashboard/ActiveGigs';
import { DailyStreak } from '@/components/DailyStreak';
import { TrustTierBadge } from '@/components/TrustTier';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import SmartMatchFeed from '@/components/SmartMatchFeed';
import VaultCard from '@/components/dashboard/VaultCard';
import MicroLoanCard from '@/components/dashboard/MicroLoanCard';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, profile, loading, signOut, refreshProfile } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);
  const [stats, setStats] = useState({ active: 0, completed: 0 });
  const [totalActiveGigs, setTotalActiveGigs] = useState(0);
  const [postedGigsCount, setPostedGigsCount] = useState<number | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  // Check onboarding status
  useEffect(() => {
    if (user && profile) {
      const checkOnboarding = async () => {
        const { data } = await supabase.from('profiles').select('has_completed_onboarding').eq('id', user.id).single();
        if (data && !(data as any).has_completed_onboarding) {
          setShowOnboarding(true);
        }
      };
      checkOnboarding();
    }
  }, [user, profile]);

  const handleOnboardingComplete = async () => {
    setShowOnboarding(false);
  };

  // Process pending referrals silently in the background after Google Auth
  useEffect(() => {
    const processPendingReferral = async () => {
      if (!user || !profile) return;
      
      const savedRef = localStorage.getItem('unigig_pending_ref');
      
      // If we have a saved ref code, and the user hasn't been referred by someone else yet
      if (savedRef && !(profile as any).referred_by) {
        try {
          const { error } = await (supabase.rpc as any)('apply_referral_code', { 
            new_user_id: user.id, 
            ref_code: savedRef 
          });
          
          if (!error) {
            console.log("Google Auth Referral linked successfully!");
            refreshProfile(); // Refresh the UI to show the update
          } else {
            console.error("Referral link failed:", error);
          }
        } finally {
          // Always clear the storage so it only runs once
          localStorage.removeItem('unigig_pending_ref');
        }
      } else if (savedRef) {
        // Clear it if they already have a referrer anyway
        localStorage.removeItem('unigig_pending_ref');
      }
    };

    processPendingReferral();
  }, [user, profile, refreshProfile]);

  useEffect(() => {
    if (user) { fetchStats(); fetchTotalActiveGigs(); }
  }, [user]);

  const fetchStats = async () => {
    if (!user) return;
    const { count: activeCount } = await supabase.from('tasks').select('*', { count: 'exact', head: true }).or(`poster_id.eq.${user.id},assignee_id.eq.${user.id}`).in('status', ['open', 'assigned', 'in_progress']);
    const { count: completedCount } = await supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('assignee_id', user.id).eq('status', 'completed');
    const { count: postedCount } = await supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('poster_id', user.id);
    
    setStats({ active: activeCount || 0, completed: completedCount || 0 });
    setPostedGigsCount(postedCount || 0);
  };

  const fetchTotalActiveGigs = async () => {
    const { count } = await supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'open');
    setTotalActiveGigs(count || 0);
  };

  // Realtime: refresh dashboard stats when this user's tasks change
  // (wallet balance is kept fresh globally by useAuth's realtime subscription)
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`dashboard-tasks-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `poster_id=eq.${user.id}` },
        () => { fetchStats(); fetchTotalActiveGigs(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `assignee_id=eq.${user.id}` },
        () => { fetchStats(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `status=eq.open` },
        () => { fetchTotalActiveGigs(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshProfile();
    await fetchStats();
    toast.success('Dashboard refreshed');
    setIsRefreshing(false);
  };

  const formatNaira = (kobo: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(kobo / 100);

  if (loading || !profile) {
    return <div className="min-h-screen bg-background"><div className="container max-w-4xl py-8 space-y-6"><Skeleton className="h-12 w-48" /><Skeleton className="h-40 w-full" /><div className="grid grid-cols-2 gap-4"><Skeleton className="h-24" /><Skeleton className="h-24" /></div><Skeleton className="h-64 w-full" /></div></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Dashboard | Nexora" description="Manage your gigs, Vault and wallet — the Intelligent Freelance Economy" canonical="https://unigig.site/dashboard" />
      
      {showOnboarding && <OnboardingTutorial onComplete={handleOnboardingComplete} />}

      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container max-w-4xl px-4 py-3 flex items-center justify-between gap-2">
          {/* NEW: Added flex and gap to align the name and the badge perfectly */}
          <div className="min-w-0 flex-1 flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold text-foreground truncate">Hello, {profile.full_name?.split(' ')[0] || 'there'}! 👋</h1>
            {/* VIP Ambassador Badge */}
            {(profile as any).is_ambassador && <AmbassadorBadge />}
            <TrustTierBadge
              completed={(profile as any).completed_gigs}
              rating={(profile as any).average_rating}
              isVerified={(profile as any).is_verified}
              className="hidden xs:inline-flex"
            />
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <NotificationBell />
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 hidden md:flex" onClick={() => navigate('/profile')}>
              <User className="h-4 w-4" />
            </Button>
            {profile.email === 'unigig60@gmail.com' && (
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate('/admin')}>
                <Shield className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container max-w-4xl px-3 sm:px-4 py-3 sm:py-4 space-y-3 sm:space-y-4 pb-24 overflow-x-hidden w-full">
        <ErrorBoundary fallbackTitle="Dashboard hiccup">
        
        
        {/* GAMIFICATION BANNER: Only shows if they haven't posted a gig yet */}
        {postedGigsCount === 0 && (
          <Card 
            className="bg-gradient-to-r from-amber-500 to-orange-600 text-white border-none shadow-lg cursor-pointer hover:scale-[1.02] transition-transform"
            onClick={() => navigate('/post-gig')}
          >
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Gift className="h-5 w-5" /> Win up to ₦10,000!
                </h3>
                <p className="text-sm text-white/90">
                  Post your first gig or purchase a product in marketplace to unlock a free spin on the reward wheel.
                </p>
              </div>
              <Button variant="secondary" className="bg-white text-orange-600 hover:bg-slate-50 shrink-0 font-bold hidden sm:flex">
                Post Gig
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Wallet */}
        <Card className="bg-gradient-hero text-primary-foreground overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary-foreground/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <CardHeader className="relative pb-2">
            <CardDescription className="text-primary-foreground/70 flex items-center gap-2 text-xs"><Wallet className="h-4 w-4" />Wallet Balance</CardDescription>
            <CardTitle className="text-2xl sm:text-4xl font-bold">{formatNaira(profile.wallet_balance)}</CardTitle>
          </CardHeader>
          <CardContent className="relative pt-0">
            <div className="grid grid-cols-3 gap-2">
              <Button onClick={() => setShowWithdraw(true)} className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-gold text-xs h-10 px-2" disabled={profile.wallet_balance === 0}>
                <ArrowUpRight className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Withdraw</span>
              </Button>
              <Button variant="secondary" className="bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground border-0 text-xs h-10 px-2" onClick={() => setShowDeposit(true)}>
                <ArrowDownLeft className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Deposit</span>
              </Button>
              <Button variant="secondary" className="bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground border-0 text-xs h-10 px-2" onClick={() => navigate('/gigs')}>
                <Briefcase className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Find Gigs</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <Card className="cursor-pointer hover:shadow-md" onClick={() => navigate('/gigs')}>
            <CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">My Active</p><p className="text-xl font-bold text-foreground">{stats.active}</p></CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md" onClick={() => navigate('/gigs')}>
            <CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Live Gigs</p><p className="text-xl font-bold text-primary">{totalActiveGigs}</p></CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md" onClick={() => navigate('/profile')}>
            <CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Done</p><p className="text-xl font-bold text-foreground">{stats.completed}</p></CardContent>
          </Card>
        </div>

        {user?.id && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <VaultCard
              userId={user.id}
              vaultBalance={(profile as any).vault_balance ?? 0}
              autoSavePercentage={(profile as any).auto_save_percentage ?? 5}
              walletBalance={profile.wallet_balance}
              onChanged={refreshProfile}
            />
            <MicroLoanCard
              userId={user.id}
              vaultBalance={(profile as any).vault_balance ?? 0}
              onChanged={refreshProfile}
            />
          </div>
        )}

        <DailyStreak />

        {user?.id && <SmartMatchFeed userId={user.id} />}

        <ActiveGigs userId={user?.id || ''} />
        <section className="space-y-2"><h2 className="text-base font-semibold text-foreground">Saved gigs</h2><SavedGigs /></section>

        <Card className="cursor-pointer hover:shadow-md border-primary/20" onClick={() => navigate('/referrals')}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><Gift className="h-5 w-5 text-primary" /></div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground">Refer & Earn ₦5,000</p>
              <p className="text-xs text-muted-foreground">Invite 20 friends, earn when 10 complete gigs</p>
            </div>
          </CardContent>
        </Card>

        <TransactionList userId={user?.id || ''} />

        <Button size="lg" className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-40 hidden md:flex" onClick={() => navigate('/post-gig')}>
          <Plus className="h-6 w-6" />
        </Button>
        </ErrorBoundary>
      </main>

      <WithdrawModal open={showWithdraw} onClose={() => setShowWithdraw(false)} balance={profile.wallet_balance} profile={profile} onSuccess={refreshProfile} />
      <DepositModal open={showDeposit} onClose={() => setShowDeposit(false)} />
    </div>
  );
}

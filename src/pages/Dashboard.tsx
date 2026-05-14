import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { SEOHead } from '@/components/SEOHead';
import { NotificationBell } from '@/components/NotificationBell';
import { SavedGigs } from '@/components/SavedGigs';
import { OnboardingTutorial } from '@/components/OnboardingTutorial';
import { AmbassadorBadge } from '@/components/AmbassadorBadge';
import {
  Wallet, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle2, Plus, User,
  Briefcase, RefreshCw, Shield, Gift, TrendingUp,
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
import FinancialDistressCard from '@/components/dashboard/FinancialDistressCard';
import { motion, useInView } from 'framer-motion';
import { TiltCard } from '@/components/ui/TiltCard';

/* ─── Animated Number ───────────────────────── */
function AnimatedNumber({ value, format }: { value: number; format: (v: number) => string }) {
  const [displayed, setDisplayed] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    if (value === prev.current) return;
    const diff = value - prev.current;
    const steps = 30;
    const step = diff / steps;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(Math.round(prev.current + step * i));
      if (i >= steps) { setDisplayed(value); prev.current = value; clearInterval(id); }
    }, 20);
    return () => clearInterval(id);
  }, [value]);

  return <>{format(displayed)}</>;
}

/* ─── Bento stat pill ───────────────────────── */
function StatCard({ label, value, icon: Icon, accent, onClick }: {
  label: string; value: string | number; icon: any; accent: string; onClick?: () => void;
}) {
  return (
    <TiltCard
      as="div"
      className={`glass-card rounded-2xl p-4 cursor-pointer flex flex-col gap-2 h-full ${onClick ? 'hover:border-brand/30' : ''}`}
      intensity={8}
      onClick={onClick}
    >
      <div className={`h-9 w-9 rounded-xl ${accent} flex items-center justify-center`}>
        <Icon className="h-4 w-4 text-white" />
      </div>
      <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </TiltCard>
  );
}

const pageVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const sectionVariant = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 280, damping: 26 } },
};

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

  const mainRef = useRef<HTMLElement>(null);
  const mainInView = useInView(mainRef, { once: true });

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user && profile) {
      const checkOnboarding = async () => {
        const { data } = await supabase.from('profiles').select('has_completed_onboarding').eq('id', user.id).single();
        if (data && !(data as any).has_completed_onboarding) setShowOnboarding(true);
      };
      checkOnboarding();
    }
  }, [user, profile]);

  useEffect(() => {
    const processPendingReferral = async () => {
      if (!user || !profile) return;
      const savedRef = localStorage.getItem('unigig_pending_ref');
      if (savedRef && !(profile as any).referred_by) {
        try {
          const { error } = await (supabase.rpc as any)('apply_referral_code', { new_user_id: user.id, ref_code: savedRef });
          if (!error) { console.log("Referral linked!"); refreshProfile(); }
        } finally { localStorage.removeItem('unigig_pending_ref'); }
      } else if (savedRef) {
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

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`dashboard-tasks-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `poster_id=eq.${user.id}` }, () => { fetchStats(); fetchTotalActiveGigs(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `assignee_id=eq.${user.id}` }, () => { fetchStats(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `status=eq.open` }, () => { fetchTotalActiveGigs(); })
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

  const formatNaira = (kobo: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(kobo / 100);

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-5xl py-8 space-y-4">
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-44 w-full rounded-2xl" />
          <div className="grid grid-cols-3 gap-3"><Skeleton className="h-24 rounded-2xl" /><Skeleton className="h-24 rounded-2xl" /><Skeleton className="h-24 rounded-2xl" /></div>
          <Skeleton className="h-56 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Dashboard | Nexora" description="Manage your gigs, Ajo Vault, and wallet on Nigeria's National Economic Opportunity Platform" canonical="https://unigig.site/dashboard" />

      {showOnboarding && <OnboardingTutorial onComplete={() => setShowOnboarding(false)} />}

      {/* Sticky header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/60">
        <div className="container max-w-5xl px-4 py-3 flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1 flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold text-foreground truncate">
              Hello, {profile.full_name?.split(' ')[0] || 'there'}! 👋
            </h1>
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
            <Button variant="ghost" size="icon" className="h-9 w-9 group" onClick={handleRefresh} disabled={isRefreshing}>
              <motion.div whileHover={{ rotate: 180 }} transition={{ type: 'spring', stiffness: 200, damping: 10 }}>
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </motion.div>
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

      <main ref={mainRef} className="container max-w-5xl px-3 sm:px-4 py-4 pb-28 overflow-x-hidden w-full">
        <ErrorBoundary fallbackTitle="Dashboard hiccup">
          <motion.div className="space-y-4" variants={pageVariants} initial="hidden" animate="visible">

            {/* Gamification banner */}
            {postedGigsCount === 0 && (
              <motion.div variants={sectionVariant}>
                <TiltCard
                  as="div"
                  className="rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-depth-lg cursor-pointer"
                  intensity={5}
                  onClick={() => navigate('/post-gig')}
                >
                  <div className="p-4 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="font-bold text-lg flex items-center gap-2"><Gift className="h-5 w-5" /> Win up to ₦10,000!</h3>
                      <p className="text-sm text-white/90">Post your first gig to unlock a free spin on the reward wheel.</p>
                    </div>
                    <Button variant="secondary" className="bg-white text-orange-600 hover:bg-slate-50 shrink-0 font-bold hidden sm:flex">Post Gig</Button>
                  </div>
                </TiltCard>
              </motion.div>
            )}

            {/* ── Wallet Card ── */}
            <motion.div variants={sectionVariant}>
              <TiltCard
                as="div"
                className="rounded-3xl bg-gradient-hero text-primary-foreground overflow-hidden relative shadow-brand"
                intensity={6}
                sheenOpacity={0.08}
              >
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary-foreground/10 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary-foreground/5 rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />

                <div className="relative p-6">
                  <div className="flex items-center gap-2 text-primary-foreground/70 text-xs mb-2">
                    <Wallet className="h-4 w-4" />
                    Wallet Balance
                  </div>
                  <p className="text-3xl sm:text-4xl font-extrabold mb-6 tabular-nums">
                    <AnimatedNumber value={profile.wallet_balance} format={formatNaira} />
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      onClick={() => setShowWithdraw(true)}
                      className="bg-white/20 hover:bg-white/30 text-white border border-white/20 text-xs h-10 px-2 backdrop-blur-sm"
                      disabled={profile.wallet_balance === 0}
                    >
                      <ArrowUpRight className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Withdraw</span>
                    </Button>
                    <Button
                      variant="secondary"
                      className="bg-white/20 hover:bg-white/30 text-white border border-white/20 text-xs h-10 px-2 backdrop-blur-sm"
                      onClick={() => setShowDeposit(true)}
                    >
                      <ArrowDownLeft className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Deposit</span>
                    </Button>
                    <Button
                      variant="secondary"
                      className="bg-white/20 hover:bg-white/30 text-white border border-white/20 text-xs h-10 px-2 backdrop-blur-sm"
                      onClick={() => navigate('/gigs')}
                    >
                      <Briefcase className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Find Gigs</span>
                    </Button>
                  </div>
                </div>
              </TiltCard>
            </motion.div>

            {/* ── Stats Bento Row ── */}
            <motion.div variants={sectionVariant} className="grid grid-cols-3 gap-3">
              <StatCard label="My Active" value={stats.active}      icon={Briefcase}    accent="bg-violet-500"  onClick={() => navigate('/gigs')} />
              <StatCard label="Live Gigs" value={totalActiveGigs}   icon={TrendingUp}   accent="bg-sky-500"     onClick={() => navigate('/gigs')} />
              <StatCard label="Completed" value={stats.completed}   icon={CheckCircle2} accent="bg-emerald-500" onClick={() => navigate('/profile')} />
            </motion.div>

            {/* ── Vault + MicroLoan Row ── */}
            {user?.id && (
              <motion.div variants={sectionVariant} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ErrorBoundary fallbackTitle="Vault unavailable">
                  <VaultCard
                    userId={user.id}
                    vaultBalance={(profile as any).vault_balance ?? 0}
                    autoSavePercentage={(profile as any).auto_save_percentage ?? 5}
                    walletBalance={profile.wallet_balance}
                    onChanged={refreshProfile}
                  />
                </ErrorBoundary>
                <ErrorBoundary fallbackTitle="Loan card unavailable">
                  <MicroLoanCard
                    userId={user.id}
                    vaultBalance={(profile as any).vault_balance ?? 0}
                    onChanged={refreshProfile}
                  />
                </ErrorBoundary>
              </motion.div>
            )}

            {/* ── AI Financial Distress Detection ── */}
            {user?.id && (
              <motion.div variants={sectionVariant}>
                <ErrorBoundary fallbackTitle="Wellness check paused">
                  <FinancialDistressCard userId={user.id} />
                </ErrorBoundary>
              </motion.div>
            )}

            {/* ── Daily Streak ── */}
            <motion.div variants={sectionVariant}>
              <ErrorBoundary fallbackTitle="Streak unavailable">
                <DailyStreak />
              </ErrorBoundary>
            </motion.div>

            {/* ── AI Smart Match Feed (hero placement) ── */}
            <motion.div variants={sectionVariant}>
              <ErrorBoundary fallbackTitle="Smart matches paused">
                {user?.id && <SmartMatchFeed userId={user.id} />}
              </ErrorBoundary>
            </motion.div>

            {/* ── Active Gigs ── */}
            <motion.div variants={sectionVariant}>
              <ErrorBoundary fallbackTitle="Active gigs unavailable">
                <ActiveGigs userId={user?.id || ''} />
              </ErrorBoundary>
            </motion.div>

            {/* ── Saved Gigs ── */}
            <motion.div variants={sectionVariant}>
              <section className="space-y-2">
                <h2 className="text-base font-semibold text-foreground">Saved gigs</h2>
                <ErrorBoundary fallbackTitle="Saved gigs unavailable">
                  <SavedGigs />
                </ErrorBoundary>
              </section>
            </motion.div>

            {/* ── Refer & Earn ── */}
            <motion.div variants={sectionVariant}>
              <TiltCard
                as="div"
                className="glass-card rounded-2xl cursor-pointer"
                intensity={6}
                onClick={() => navigate('/referrals')}
              >
                <div className="p-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-brand/10 flex items-center justify-center shrink-0">
                    <Gift className="h-5 w-5 text-brand" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground">Refer & Earn ₦5,000</p>
                    <p className="text-xs text-muted-foreground">Invite friends, earn when they complete gigs</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              </TiltCard>
            </motion.div>

            {/* ── Transactions ── */}
            <motion.div variants={sectionVariant}>
              <TransactionList userId={user?.id || ''} />
            </motion.div>

          </motion.div>
        </ErrorBoundary>
      </main>

      {/* FAB */}
      <motion.div
        className="fixed bottom-8 right-6 z-40 hidden md:block"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.96 }}
      >
        <Button size="lg" className="h-14 w-14 rounded-full shadow-brand" onClick={() => navigate('/post-gig')}>
          <Plus className="h-6 w-6" />
        </Button>
      </motion.div>

      <WithdrawModal open={showWithdraw} onClose={() => setShowWithdraw(false)} balance={profile.wallet_balance} profile={profile} onSuccess={refreshProfile} />
      <DepositModal open={showDeposit} onClose={() => setShowDeposit(false)} />
    </div>
  );
}

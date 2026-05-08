import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Medal, Crown, ArrowLeft, Gift, TrendingUp, Star, Timer } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth'; 

const ADMIN_EMAIL = 'unigig60@gmail.com';

interface LeaderboardEntry {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  university: string | null;
  count: number;
  reviews: number;
}

interface MonthlyWinner {
  doer_name: string;
  poster_name: string;
}

export default function Leaderboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('doers');
  const [doers, setDoers] = useState<LeaderboardEntry[]>([]);
  const [posters, setPosters] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  
  // States for Countdown and Winners
  const [timeRemaining, setTimeRemaining] = useState('');
  const [isGracePeriod, setIsGracePeriod] = useState(false);
  const [archivedWinners, setArchivedWinners] = useState<MonthlyWinner | null>(null);

  // Countdown Timer Logic
  useEffect(() => {
    const calculateTime = () => {
      const now = new Date();
      const dayOfMonth = now.getDate();
      
      const grace = dayOfMonth <= 2;
      setIsGracePeriod(grace);

      if (grace) {
        // Countdown to the 3rd of the month
        const target = new Date(now.getFullYear(), now.getMonth(), 3, 0, 0, 0);
        const diff = target.getTime() - now.getTime();
        setTimeRemaining(formatTime(diff));
      } else {
        // Countdown to the last day of the current month
        const nextMonth = now.getMonth() + 1;
        const target = new Date(now.getFullYear(), nextMonth, 0, 23, 59, 59);
        const diff = target.getTime() - now.getTime();
        setTimeRemaining(formatTime(diff));
      }
    };

    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchLeaderboardData();
    if (isGracePeriod) {
      fetchMonthlyWinners();
    }
  }, [isGracePeriod]);

  const formatTime = (ms: number) => {
    if (ms < 0) return "0d 0h 0m 0s";
    const d = Math.floor(ms / (1000 * 60 * 60 * 24));
    const h = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((ms % (1000 * 60)) / 1000);
    return `${d}d ${h}h ${m}m ${s}s`;
  };

  // Fetch archived winners instead of relying on live arrays that get wiped
  const fetchMonthlyWinners = async () => {
    try {
      const { data, error } = await supabase
        .from('monthly_winners')
        .select('doer_name, poster_name')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error; 
      
      if (data) {
        setArchivedWinners(data);
      }
    } catch (err) {
      console.error('Error fetching monthly winners:', err);
    }
  };

  const fetchLeaderboardData = async () => {
    setLoading(true);
    try {
      const { data: doerData, error: doerError } = await supabase
        .from('leaderboard_stats')
        .select('*')
        .order('total_doer_gigs', { ascending: false })
        .limit(20);

      if (doerError) throw doerError;

      const processedDoers = (doerData || []).map(d => ({
        id: d.id,
        full_name: d.full_name,
        avatar_url: d.avatar_url,
        university: d.university,
        count: Number(d.total_doer_gigs) || 0,
        reviews: Number(d.total_reviews) || 0
      }));
      setDoers(processedDoers);

      const { data: posterData, error: posterError } = await supabase
        .from('leaderboard_stats')
        .select('*')
        .order('total_posted_gigs', { ascending: false })
        .limit(20);

      if (posterError) throw posterError;

      const processedPosters = (posterData || []).map(p => ({
        id: p.id,
        full_name: p.full_name,
        avatar_url: p.avatar_url,
        university: p.university,
        count: Number(p.total_posted_gigs) || 0,
        reviews: Number(p.total_reviews) || 0
      }));
      setPosters(processedPosters);

    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setDoers([]);
      setPosters([]);
    } finally {
      setLoading(false);
    }
  };

  const renderRankIcon = (rank: number) => {
    switch (rank) {
      case 0: return <Crown className="h-6 w-6 text-yellow-500 fill-yellow-500 drop-shadow-sm shrink-0" />;
      case 1: return <Medal className="h-6 w-6 text-slate-400 fill-slate-400 drop-shadow-sm shrink-0" />;
      case 2: return <Medal className="h-6 w-6 text-amber-600 fill-amber-600 drop-shadow-sm shrink-0" />;
      default: return <span className="font-bold text-muted-foreground w-6 text-center shrink-0">{rank + 1}</span>;
    }
  };

  const renderUserPosition = (entries: LeaderboardEntry[], label: string) => {
    if (!user) return null; 
    
    const index = entries.findIndex(e => e.id === user.id);
    const userEntry = index !== -1 ? entries[index] : null;

    if (!userEntry) {
      return (
        <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-between shadow-sm">
          <span className="text-sm font-bold text-primary">Your Position</span>
          <span className="text-xs text-muted-foreground font-medium">Complete more gigs to reach the Top 20!</span>
        </div>
      );
    }

    return (
      <div className="mb-6 space-y-2">
        <div className="text-xs font-bold text-primary uppercase tracking-widest pl-1">Your Position</div>
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center p-3 sm:p-4 rounded-xl border-2 border-primary bg-card shadow-md gap-3 sm:gap-4 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
          
          <div className="flex items-center justify-center w-6 sm:w-8 z-10">
            {renderRankIcon(index)}
          </div>

          <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border-2 border-primary/20 shadow-sm shrink-0 z-10">
            <AvatarImage src={userEntry.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary font-bold">
              {userEntry.full_name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0 z-10">
            <p className="font-bold text-foreground text-sm sm:text-base truncate">You ({userEntry.full_name})</p>
            <div className="flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground mt-0.5">
              <span className="truncate max-w-[120px] sm:max-w-none">{userEntry.university || 'Student'}</span>
              {userEntry.reviews > 0 && (
                <span className="flex items-center text-amber-500 font-medium whitespace-nowrap">
                  • <Star className="h-3 w-3 fill-amber-500 ml-1 mr-0.5" /> {userEntry.reviews}
                </span>
              )}
            </div>
          </div>

          <div className="text-right shrink-0 z-10">
            <p className="text-lg sm:text-xl font-black text-primary leading-none">{userEntry.count}</p>
            <p className="text-[9px] sm:text-[10px] uppercase font-bold text-muted-foreground tracking-wider mt-1">{label}</p>
          </div>
        </motion.div>
      </div>
    );
  };

  const renderList = (entries: LeaderboardEntry[], label: string) => {
    if (entries.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No data available yet. Start {label === 'Gigs Done' ? 'doing' : 'posting'} gigs to appear here!
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {entries.map((entry, index) => (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            key={entry.id}
            className={cn(
              "flex items-center p-3 sm:p-4 rounded-xl border transition-all hover:shadow-md gap-3 sm:gap-4",
              index === 0 ? "bg-gradient-to-r from-yellow-500/10 to-transparent border-yellow-500/30 shadow-sm" : "bg-card border-border hover:border-primary/30",
              entry.id === user?.id ? "border-primary/50 bg-primary/5" : ""
            )}
          >
            <div className="flex items-center justify-center w-6 sm:w-8">
              {renderRankIcon(index)}
            </div>

            <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border-2 border-background shadow-sm shrink-0">
              <AvatarImage src={entry.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                {entry.full_name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <p className="font-bold text-foreground text-sm sm:text-base truncate">
                {entry.full_name || 'Anonymous'} {entry.id === user?.id && "(You)"}
              </p>
              <div className="flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                <span className="truncate max-w-[120px] sm:max-w-none">{entry.university || 'Student'}</span>
                {entry.reviews > 0 && (
                  <span className="flex items-center text-amber-500 font-medium whitespace-nowrap">
                    • <Star className="h-3 w-3 fill-amber-500 ml-1 mr-0.5" /> {entry.reviews}
                  </span>
                )}
              </div>
            </div>

            <div className="text-right shrink-0">
              <p className="text-lg sm:text-xl font-black text-primary leading-none">{entry.count}</p>
              <p className="text-[9px] sm:text-[10px] uppercase font-bold text-muted-foreground tracking-wider mt-1">{label}</p>
            </div>
          </motion.div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-6">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container max-w-2xl mx-auto p-3 sm:p-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full hover:bg-primary/10 hover:text-primary shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2 truncate">
              <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500 shrink-0" />
              <span className="truncate">Campus Leaderboard</span>
            </h1>
          </div>
          
          {user?.email?.toLowerCase() === ADMIN_EMAIL && (
            <Button variant="outline" size="sm" onClick={() => navigate('/admin')} className="text-[10px] sm:text-xs bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 h-8 px-2 sm:px-3">
              Admin Hub
            </Button>
          )}
        </div>
      </header>

      <main className="container max-w-2xl mx-auto p-3 sm:p-4 space-y-4 sm:space-y-6">
        
        <Card className="bg-gradient-to-br from-primary to-emerald-800 text-white border-none shadow-xl overflow-hidden relative rounded-2xl">
          <div className="absolute top-0 right-0 w-32 h-32 sm:w-40 sm:h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
          <div className="absolute bottom-0 left-0 w-24 h-24 sm:w-32 sm:h-32 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-xl" />
          
          <CardContent className="p-4 sm:p-6 relative z-10">
            {isGracePeriod ? (
              <div className="text-center py-2">
                <Trophy className="h-10 w-10 sm:h-12 sm:w-12 text-yellow-300 mx-auto mb-3 drop-shadow-md" />
                <Badge className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold border-none shadow-sm text-[10px] sm:text-xs mb-3">MONTHLY WINNERS!</Badge>
                
                <h2 className="text-xl sm:text-2xl font-black mb-1 drop-shadow-sm">
                  Congratulations to the Top Users!
                </h2>
                
                <div className="flex flex-col gap-1 text-sm sm:text-base font-bold text-yellow-100 my-3 bg-black/20 p-3 rounded-xl inline-block mx-auto">
                  <p>Highest Doer: <span className="text-white">{archivedWinners?.doer_name || doers[0]?.full_name || 'Tallying results...'}</span></p>
                  <p>Highest Poster: <span className="text-white">{archivedWinners?.poster_name || posters[0]?.full_name || 'Tallying results...'}</span></p>
                </div>
                
                <p className="text-primary-foreground/90 text-xs sm:text-sm mb-4">
                  They have won the ₦50,000 cash prize for this month!
                </p>
                
                <div className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white/90 bg-white/10 px-3 py-1.5 rounded-full border border-white/20">
                  <Timer className="h-3 w-3 sm:h-4 sm:w-4" />
                  New Leaderboard in: {timeRemaining}
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <div className="h-8 w-8 sm:h-10 sm:w-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center shadow-inner shrink-0">
                    <Gift className="h-4 w-4 sm:h-6 sm:w-6 text-yellow-300" />
                  </div>
                  <Badge className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold border-none shadow-sm text-[10px] sm:text-xs">MONTHLY REWARD</Badge>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black mb-1 sm:mb-2 tracking-tight drop-shadow-sm">WIN ₦50,000!</h2>
                <p className="text-primary-foreground/90 text-xs sm:text-sm leading-relaxed max-w-[250px] sm:max-w-xs">
                  The top user on each leaderboard at the end of the month receives a ₦50k cash prize!
                </p>
                <div className="mt-4 sm:mt-6 flex flex-wrap items-center gap-2 sm:gap-4">
                  <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-yellow-300 bg-black/20 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full">
                    <Timer className="h-3 w-3 sm:h-4 sm:w-4" />
                    Ends in {timeRemaining}
                  </div>
                  <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white/80">
                    <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
                    Updated daily
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4 sm:mb-6 bg-muted/50 p-1 rounded-xl h-auto">
            <TabsTrigger value="doers" className="font-bold rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm py-2 sm:py-2.5 text-xs sm:text-sm">Gig Doers</TabsTrigger>
            <TabsTrigger value="posters" className="font-bold rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm py-2 sm:py-2.5 text-xs sm:text-sm">Gig Posters</TabsTrigger>
          </TabsList>

          <TabsContent value="doers" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            {!loading && renderUserPosition(doers, 'Gigs Done')}

            <div className="mb-3 sm:mb-4 flex items-center justify-between px-1 sm:px-2">
              <h3 className="text-xs sm:text-sm font-bold text-muted-foreground uppercase tracking-widest">Top Earners</h3>
              <span className="text-[10px] sm:text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">Based on completed gigs</span>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 sm:h-20 w-full bg-muted animate-pulse rounded-xl" />)}
              </div>
            ) : renderList(doers, 'Gigs Done')}
          </TabsContent>

          <TabsContent value="posters" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            {!loading && renderUserPosition(posters, 'Gigs Posted')}

            <div className="mb-3 sm:mb-4 flex items-center justify-between px-1 sm:px-2">
              <h3 className="text-xs sm:text-sm font-bold text-muted-foreground uppercase tracking-widest">Top Employers</h3>
              <span className="text-[10px] sm:text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">Based on gigs posted</span>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 sm:h-20 w-full bg-muted animate-pulse rounded-xl" />)}
              </div>
            ) : renderList(posters, 'Gigs Posted')}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
  }

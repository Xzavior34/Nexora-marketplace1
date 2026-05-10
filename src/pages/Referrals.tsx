import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { ArrowLeft, Copy, Gift, Users, CheckCircle2, Share2, Sparkles } from 'lucide-react';

export default function Referrals() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  // Existing states
  const [referralCode, setReferralCode] = useState('');
  const [completedReferrals, setCompletedReferrals] = useState(0);
  const [totalReferred, setTotalReferred] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [loading, setLoading] = useState(true);

  // New Ambassador states
  const [isAmbassador, setIsAmbassador] = useState(false);
  const [hasEditedCode, setHasEditedCode] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => { if (!authLoading && !user) navigate('/auth'); }, [user, authLoading, navigate]);
  useEffect(() => { if (user) fetchReferralData(); }, [user]);

  const fetchReferralData = async () => {
    if (!user) return;

    // Updated to also fetch ambassador and edit status
    const { data: profile } = await supabase
      .from('profiles')
      .select('referral_code, is_ambassador, has_edited_referral')
      .eq('id', user.id)
      .single() as { data: any };
      
    if (profile) {
      if (profile.referral_code) setReferralCode(profile.referral_code);
      setIsAmbassador(profile.is_ambassador || false);
      setHasEditedCode(profile.has_edited_referral || false);
    }

    const { count: refCount } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('referred_by', user.id);
    setTotalReferred(refCount || 0);

    const { data: referredUsers } = await supabase.from('profiles').select('id').eq('referred_by', user.id);
    if (referredUsers && referredUsers.length > 0) {
      const ids = referredUsers.map(u => u.id);
      const { data: completedTasks } = await supabase.from('tasks').select('assignee_id').in('assignee_id', ids).eq('status', 'completed');
      const uniqueCompleted = new Set(completedTasks?.map(t => t.assignee_id) || []);
      setCompletedReferrals(uniqueCompleted.size);
    }

    const { data: rewards } = await supabase.from('wallet_transactions').select('amount_kobo').eq('user_id', user.id).like('description', 'Referral milestone%');
    setTotalEarned(rewards?.reduce((sum, r) => sum + r.amount_kobo, 0) || 0);
    setLoading(false);
  };

  const copyReferralLink = () => {
    navigator.clipboard.writeText(`https://unigig.site/auth?ref=${referralCode}`);
    toast.success('Referral link copied!');
  };

  const shareReferralLink = () => {
    const link = `https://unigig.site/auth?ref=${referralCode}`;
    if (navigator.share) {
      navigator.share({ title: 'Join Nexora!', text: 'Sign up on Nexora and start earning!', url: link });
    } else { copyReferralLink(); }
  };

  // Logic to handle custom ambassador code update
  const handleUpdateCode = async () => {
    if (!newCode.trim() || newCode.includes(' ')) {
      toast.error("Code cannot be empty or contain spaces");
      return;
    }
    
    setIsUpdating(true);
    const formattedCode = newCode.trim().toUpperCase();

    const { error } = await supabase
      .from('profiles')
      .update({ 
        referral_code: formattedCode, 
        has_edited_referral: true 
      })
      .eq('id', user!.id);

    if (error) {
      if (error.code === '23505') {
        toast.error("This name is already taken! Try another one.");
      } else {
        toast.error("Failed to update code.");
      }
    } else {
      toast.success("VIP Code Updated!");
      setReferralCode(formattedCode); // Update the UI code instantly
      setHasEditedCode(true); // Hide the edit box instantly
    }
    setIsUpdating(false);
  };

  // New milestone: 20 total referred, 10 completed
  const referredProgress = Math.min(totalReferred, 20);
  const completedProgress = Math.min(completedReferrals, 10);
  const referredPercent = (referredProgress / 20) * 100;
  const completedPercent = (completedProgress / 10) * 100;

  if (authLoading || loading) {
    return <div className="min-h-screen bg-background"><div className="container max-w-2xl py-8 space-y-6"><Skeleton className="h-12 w-48" /><Skeleton className="h-40 w-full" /><Skeleton className="h-64 w-full" /></div></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container max-w-2xl py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Refer & Earn</h1>
            <p className="text-sm text-muted-foreground">Invite 20 friends, earn ₦5,000 when 10 complete gigs</p>
          </div>
        </div>
      </header>

      <main className="container max-w-2xl py-6 space-y-6">
        {/* Referral Code */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Gift className="h-5 w-5 text-primary" />Your Referral Code</CardTitle>
            <CardDescription>Share your code with friends. When they sign up and complete gigs, you earn rewards!</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-muted rounded-lg px-4 py-3 font-mono text-lg font-bold text-foreground tracking-wider text-center">{referralCode}</div>
              <Button variant="outline" size="icon" onClick={copyReferralLink}><Copy className="h-4 w-4" /></Button>
              <Button size="icon" onClick={shareReferralLink}><Share2 className="h-4 w-4" /></Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">unigig.site/auth?ref={referralCode}</p>
          </CardContent>
        </Card>

        {/* Ambassador One-Time Code Edit */}
        {isAmbassador && !hasEditedCode && (
          <Card className="border-amber-500 bg-gradient-to-br from-amber-500/10 to-background shadow-sm">
            <CardContent className="pt-6">
              <h3 className="font-bold text-amber-700 mb-2 flex items-center gap-2">
                <Sparkles className="h-5 w-5" /> 
                VIP Perk: Custom Referral Code
              </h3>
              <p className="text-sm text-amber-700/80 mb-4">
                You can change your default code to a memorable name (e.g., PHILIP). <strong>You can only do this once!</strong>
              </p>
              <div className="flex gap-2">
                <Input 
                  placeholder="ENTER_NAME" 
                  value={newCode} 
                  onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                  className="uppercase border-amber-300 focus-visible:ring-amber-500"
                />
                <Button 
                  onClick={handleUpdateCode} 
                  disabled={isUpdating || !newCode}
                  className="bg-amber-500 hover:bg-amber-600 text-white"
                >
                  {isUpdating ? "Saving..." : "Lock in Code"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card><CardContent className="pt-4 pb-4 text-center"><Users className="h-5 w-5 mx-auto text-primary mb-1" /><p className="text-2xl font-bold text-foreground">{totalReferred}</p><p className="text-xs text-muted-foreground">Referred</p></CardContent></Card>
          <Card><CardContent className="pt-4 pb-4 text-center"><CheckCircle2 className="h-5 w-5 mx-auto text-primary mb-1" /><p className="text-2xl font-bold text-foreground">{completedReferrals}</p><p className="text-xs text-muted-foreground">Completed</p></CardContent></Card>
          <Card><CardContent className="pt-4 pb-4 text-center"><Gift className="h-5 w-5 mx-auto text-primary mb-1" /><p className="text-2xl font-bold text-primary">₦{(totalEarned / 100).toLocaleString()}</p><p className="text-xs text-muted-foreground">Earned</p></CardContent></Card>
        </div>

        {/* Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Progress to Next Reward</CardTitle>
            <CardDescription>You need 20 referrals AND 10 of them must complete a gig</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <div className="flex justify-between text-sm"><span>Invites: {totalReferred}/20</span><span>{referredProgress >= 20 ? '✅' : `${20 - referredProgress} more`}</span></div>
              <Progress value={referredPercent} className="h-3" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm"><span>Completed gigs: {completedReferrals}/10</span><span>{completedProgress >= 10 ? '✅' : `${10 - completedProgress} more`}</span></div>
              <Progress value={completedPercent} className="h-3" />
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Next reward</p>
              <p className="text-2xl font-bold text-primary">₦5,000</p>
            </div>
          </CardContent>
        </Card>

        {/* How it Works */}
        <Card>
          <CardHeader><CardTitle>How It Works</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { step: '1', title: 'Share Your Code', desc: 'Send your referral link to friends' },
                { step: '2', title: 'They Sign Up', desc: 'Your friend creates an account using your code' },
                { step: '3', title: 'You Hit 20 Referrals', desc: 'Get 20 friends to join Nexora' },
                { step: '4', title: '10 Complete Gigs', desc: 'When 10 of them finish gigs, you get ₦5,000!' },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-4">
                  <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">{item.step}</div>
                  <div><p className="font-medium text-foreground">{item.title}</p><p className="text-sm text-muted-foreground">{item.desc}</p></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

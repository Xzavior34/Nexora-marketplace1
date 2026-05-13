import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { TaskChat } from '@/components/TaskChat';
import { PayForGigModal } from '@/components/PayForGigModal';
import { DeleteGigButton } from '@/components/gigs/DeleteGigButton';
import { ReviewModal } from '@/components/ReviewModal';
import { UserRating } from '@/components/UserRating';
import { ReportScamModal } from '@/components/disputes/ReportScamModal';
import { AppealModal } from '@/components/disputes/AppealModal';
import { MilestoneTracker } from '@/components/gigs/MilestoneTracker';
import { GigCardSkeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  Wallet, 
  User, 
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  CreditCard,
  Star,
  Bookmark,
  BookmarkCheck,
  ShieldAlert,
  Scale
} from 'lucide-react';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Task {
  id: string;
  title: string;
  description: string;
  category: string;
  price_kobo: number;
  status: string;
  location: string | null;
  deadline: string | null;
  attachment_url: string | null;
  created_at: string;
  poster_id: string;
  assignee_id: string | null;
  poster?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  assignee?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface EscrowTransaction {
  id: string;
  status: string;
  amount_kobo: number;
  platform_fee_kobo: number;
}

interface TaskApplication {
  id: string;
  applicant_id: string;
  status: string;
  created_at: string;
  applicant?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export default function GigDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [task, setTask] = useState<Task | null>(null);
  const [escrow, setEscrow] = useState<EscrowTransaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [savingGig, setSavingGig] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);

  // Dispute States
  const [showReportModal, setShowReportModal] = useState(false);
  const [showAppealModal, setShowAppealModal] = useState(false);
  const [disputeId, setDisputeId] = useState<string | null>(null);

  const [applications, setApplications] = useState<TaskApplication[]>([]);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [myApplicationId, setMyApplicationId] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchTask();
      subscribeToUpdates();
    }
  }, [id]);

  useEffect(() => {
    if (user && id) {
      checkSavedStatus();
      checkReviewStatus();
    }
  }, [user, id]);

  useEffect(() => {
    if (user && id) {
      fetchApplications();
    }
  }, [user, id, task?.assignee_id]);

  const checkSavedStatus = async () => {
    if (!user || !id) return;
    const { data } = await supabase
      .from('saved_gigs')
      .select('id')
      .eq('user_id', user.id)
      .eq('task_id', id)
      .maybeSingle();
    setIsSaved(!!data);
  };

  const checkReviewStatus = async () => {
    if (!user || !id) return;
    const { data } = await supabase
      .from('reviews')
      .select('id')
      .eq('task_id', id)
      .eq('reviewer_id', user.id)
      .maybeSingle();
    setHasReviewed(!!data);
  };

  const handleToggleSave = async () => {
    if (!user || !id) {
      toast.error('Please sign in to save gigs');
      return;
    }

    setSavingGig(true);
    try {
      if (isSaved) {
        await supabase
          .from('saved_gigs')
          .delete()
          .eq('user_id', user.id)
          .eq('task_id', id);
        setIsSaved(false);
        toast.success('Removed from saved gigs');
      } else {
        await supabase
          .from('saved_gigs')
          .insert({ user_id: user.id, task_id: id });
        setIsSaved(true);
        toast.success('Saved for later');
      }
    } catch (err) {
      toast.error('Failed to update saved gigs');
    } finally {
      setSavingGig(false);
    }
  };

  const fetchApplications = async () => {
    if (!user || !id) return;

    const { data, error } = await supabase
      .from('task_applications')
      .select('id, applicant_id, status, created_at, applicant:profiles(id, full_name, avatar_url)')
      .eq('task_id', id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const apps = data as unknown as TaskApplication[];
      setApplications(apps);

      const mine = apps.find((a) => a.applicant_id === user.id);
      setMyApplicationId(mine?.id || null);

      if (!selectedApplicationId && apps.length > 0) {
        setSelectedApplicationId(apps[0].id);
      }
    }
  };

  const subscribeToUpdates = () => {
    const channel = supabase
      .channel(`task-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `id=eq.${id}` },
        () => fetchTask()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'escrow_transactions', filter: `task_id=eq.${id}` },
        () => fetchTask()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'task_applications', filter: `task_id=eq.${id}` },
        () => fetchApplications()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchTask = async () => {
    try {
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', id)
        .single();

      if (taskError) throw taskError;

      const { data: posterData } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('id', taskData.poster_id)
        .single();

      let assigneeData = null;
      if (taskData.assignee_id) {
        const { data: aData } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .eq('id', taskData.assignee_id)
          .single();
        assigneeData = aData;
      }

      const { data: escrowData } = await supabase
        .from('escrow_transactions')
        .select('*')
        .eq('task_id', id)
        .maybeSingle();

      setTask({
        ...taskData,
        poster: posterData,
        assignee: assigneeData,
      });
      setEscrow(escrowData || null);

      if (taskData.status === 'disputed') {
        const { data: disputeData } = await supabase
          .from('disputes')
          .select('id')
          .eq('task_id', id)
          .maybeSingle();
        if (disputeData) setDisputeId(disputeData.id);
      }

      if (user) {
        fetchApplications();
      }
    } catch (err) {
      console.error('Error fetching task:', err);
      toast.error('Failed to load gig details');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!user || !task) return;

    setActionLoading(true);
    try {
      const { data: existing } = await supabase
        .from('task_applications')
        .select('id')
        .eq('task_id', task.id)
        .eq('applicant_id', user.id)
        .maybeSingle();

      if (existing?.id) {
        setMyApplicationId(existing.id);
        toast.success('Chat opened');
        setActionLoading(false);
        return;
      }

      const { data: created, error } = await supabase
        .from('task_applications')
        .insert({ task_id: task.id, applicant_id: user.id })
        .select('id')
        .maybeSingle();

      if (error) {
        if (error.code === '23505') {
          const { data: dup } = await supabase
            .from('task_applications')
            .select('id')
            .eq('task_id', task.id)
            .eq('applicant_id', user.id)
            .maybeSingle();
          if (dup) setMyApplicationId(dup.id);
          toast.info('You have already applied for this gig.');
          setActionLoading(false);
          return;
        }
        throw error;
      }

      if (created?.id) {
        setMyApplicationId(created.id);
      } else {
        fetchApplications();
      }
      
      toast.success('Success! Your application has been submitted.');

      const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', user.id)
        .single();

      if (profile) {
        supabase.functions.invoke('send-brevo-verification', {
          body: { email: profile.email, fullName: profile.full_name, listId: 8 },
        }).catch(console.error);

        await supabase.from('notifications').insert({
          user_id: task.poster_id,
          title: 'New Application',
          body: `${profile?.full_name || 'Someone'} applied to your gig: ${task.title}`,
          data: { taskId: task.id },
        });

        supabase.functions.invoke('send-push-notification', {
          body: {
            userId: task.poster_id,
            title: 'New Application',
            body: `Someone wants to chat about: ${task.title}`,
            data: { taskId: task.id },
          },
        }).catch(console.error);
      }

    } catch (err) {
      console.error('Error applying:', err);
      toast.error('Failed to submit application');
    } finally {
      setActionLoading(false);
    }
  };

  const handleHire = async (assigneeId: string, applicationId: string | null) => {
    if (!user || !task) return;
    
    setActionLoading(true);
    const toastId = toast.loading("Processing hire and escrow...");

    try {
      // Try the new atomic live escrow first (payer/payee schema)
      let res: any = null;
      const { data: liveResult, error: liveErr } = await supabase.rpc('live_hire_and_lock_escrow' as any, {
        p_payee_id: assigneeId,
        p_task_id: task.id,
        p_amount_kobo: task.price_kobo,
      });
      if (!liveErr && (liveResult as any)?.success) {
        // mark accepted application if present
        if (applicationId) {
          await supabase.from('task_applications').update({ status: 'accepted' }).eq('id', applicationId);
        }
        res = liveResult;
      } else {
        const { data: legacy, error: rpcErr } = await supabase.rpc('hire_and_escrow', {
          p_task_id: task.id,
          p_poster_id: user.id,
          p_assignee_id: assigneeId,
          p_application_id: applicationId,
        });
        if (rpcErr) throw rpcErr;
        res = legacy as any;
      }
      
      if (res.success) {
        // Silently award ticket - DB already does this, but we keep rpc for sync
        try { await supabase.rpc('add_spin_ticket', { p_user_id: user.id }); } catch { /* noop */ }

        supabase.functions.invoke('send-push-notification', { 
          body: { 
            userId: assigneeId, 
            title: "You've been hired!", 
            body: `You were hired for: ${task.title}`, 
            data: { taskId: task.id } 
          } 
        }).catch(() => {});

        try {
          await supabase.from('notifications').insert({
            user_id: user.id,
            title: 'Free Spin Unlocked!',
            body: 'Congratulations! You earned 1 Spin Ticket for hiring.',
            data: { type: 'free_spin', taskId: task.id },
          });
        } catch { /* noop */ }

        toast.success("Hired successfully! Redirecting to rewards...", { id: toastId });

        // Redirect after a short delay for DB consistency
        setTimeout(() => {
          navigate(`/spin-to-win?taskId=${task.id}`);
        }, 800);

      } else {
        toast.error(res.error || 'Hiring could not be completed.', { id: toastId });
      }
      
    } catch (e: any) { 
      console.error("Hire error:", e);
      // Safety Check: Refresh status to see if hire worked despite error
      const { data: checkTask } = await supabase.from('tasks').select('status').eq('id', task.id).single();
      
      if (checkTask?.status === 'assigned' || checkTask?.status === 'in_progress') {
        toast.success("Hire confirmed! Redirecting...", { id: toastId });
        navigate(`/spin-to-win?taskId=${task.id}`);
      } else {
        toast.error('Failed to complete hiring. Please check your balance.', { id: toastId }); 
      }
    } finally { 
      setActionLoading(false); 
    }
  };

  const handleStartWork = async () => {
    if (!task) return;
    
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: 'in_progress' })
        .eq('id', task.id);

      if (error) throw error;

      await supabase.functions.invoke('send-push-notification', {
        body: {
          userId: task.poster_id,
          title: 'Work Started',
          body: `The worker has started working on: ${task.title}`,
          data: { taskId: task.id },
        },
      });

      toast.success('Work started! Good luck!');
      fetchTask();
    } catch (err) {
      console.error('Error starting work:', err);
      toast.error('Failed to start work');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmCompletion = async () => {
    if (!escrow) {
      toast.error('No escrow found for this task');
      return;
    }

    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('paystack-release-escrow', {
        body: { escrowId: escrow.id, action: 'release' }
      });

      if (error) throw error;

      toast.success(`Payment released! Worker received ₦${(data.worker_amount_kobo / 100).toLocaleString()}`);
      
      if (task?.assignee_id) {
        supabase.from('profiles').select('referred_by').eq('id', task.assignee_id).single().then(({ data: assigneeProfile }) => {
          if ((assigneeProfile as any)?.referred_by) {
            supabase.rpc('check_referral_milestone', { p_referrer_id: (assigneeProfile as any).referred_by });
            (supabase.rpc as any)('ambassador_first_gig_bonus', { p_worker_id: task!.assignee_id, p_gig_price_kobo: task!.price_kobo });
          }
        });
      }
      
      fetchTask();
    } catch (err) {
      console.error('Error releasing escrow:', err);
      toast.error('Failed to release payment');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeclineWork = async () => {
    if (!escrow) {
      toast.error('No escrow found for this task');
      return;
    }

    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('paystack-release-escrow', {
        body: { escrowId: escrow.id, action: 'decline' }
      });

      if (error) throw error;

      toast.success('Work declined. Payment refunded to your wallet.');
      fetchTask();
    } catch (err) {
      console.error('Error declining work:', err);
      toast.error('Failed to decline work');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkAsDone = async () => {
    if (!task) return;

    setActionLoading(true);
    try {
      localStorage.setItem(`task_${task.id}_submitted`, 'true');
      
      await supabase.functions.invoke('send-push-notification', {
        body: {
          userId: task.poster_id,
          title: 'Work Completed!',
          body: `The worker has completed "${task.title}". Please review and release payment.`,
          data: { taskId: task.id },
        },
      });

      await supabase.from('notifications').insert({
        user_id: task.poster_id,
        title: 'Work Completed',
        body: `The worker has marked "${task.title}" as done. Please review the work and release payment if satisfied.`,
        data: { taskId: task.id },
      });

      toast.success('Work submitted! The client has been notified to review and release payment.');
      fetchTask();
    } catch (err) {
      console.error('Error marking as done:', err);
      toast.error('Failed to notify client');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelTask = async () => {
    if (!task || !user) return;

    setActionLoading(true);
    try {
      const { data: result, error: rpcErr } = await supabase.rpc('cancel_and_refund_escrow', {
        p_task_id: task.id,
        p_user_id: user.id,
      });

      if (rpcErr) throw rpcErr;

      const res = result as any;
      if (!res.success) {
        toast.error(res.error || 'Failed to cancel task');
        return;
      }

      toast.success(res.refunded ? `Task cancelled. ₦${(res.refund_amount / 100).toLocaleString()} refunded.` : 'Task cancelled');
      navigate('/gigs');
    } catch (err) {
      console.error('Error cancelling:', err);
      toast.error('Failed to cancel task');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      open: 'bg-green-500/10 text-green-600 border-green-500/20',
      assigned: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      in_progress: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
      completed: 'bg-primary/10 text-primary border-primary/20',
      cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
      disputed: 'bg-red-500/10 text-red-600 border-red-500/20', 
    };
    return colors[status] || 'bg-muted text-muted-foreground';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
          <GigCardSkeleton />
          <GigCardSkeleton />
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <AlertCircle className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Gig not found</h2>
        <Button onClick={() => navigate('/gigs')}>Browse Gigs</Button>
      </div>
    );
  }

  const isPoster = user?.id === task.poster_id;
  const isAssignee = user?.id === task.assignee_id;
  const canApply = !isPoster && task.status === 'open' && user && !myApplicationId;
  const canStartWork = isAssignee && task.status === 'assigned';
  const canMarkAsDone = isAssignee && task.status === 'in_progress' && escrow?.status === 'held';
  const canConfirmCompletion = isPoster && task.status === 'in_progress' && escrow?.status === 'held';
  const needsPayment = isPoster && task.assignee_id && !escrow;
  const canReview = task.status === 'completed' && (isPoster || isAssignee) && !hasReviewed;
  const workerEarnings = escrow ? (escrow.amount_kobo - escrow.platform_fee_kobo) / 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-semibold truncate">Gig Details</h1>
          </div>
          <div className="flex items-center gap-2">
            {user && isPoster && task.status === 'open' && (
              <DeleteGigButton gigId={task.id} gigTitle={task.title} onDeleted={() => navigate('/gigs')} variant="icon" />
            )}
            {user && !isPoster && (
              <Button variant="ghost" size="icon" onClick={handleToggleSave} disabled={savingGig}>
                {isSaved ? <BookmarkCheck className="h-5 w-5 text-primary" /> : <Bookmark className="h-5 w-5" />}
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-3xl space-y-6">
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline">{task.category}</Badge>
                  <Badge className={getStatusColor(task.status)}>{task.status.replace('_', ' ')}</Badge>
                </div>
                <CardTitle className="text-2xl">{task.title}</CardTitle>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">₦{((task.price_kobo || 0) / 100).toLocaleString()}</p>
                {escrow && isAssignee && <p className="text-sm text-muted-foreground">You earn: ₦{workerEarnings.toLocaleString()}</p>}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Milestone progress tracker — Phase 2 */}
            <div className="rounded-2xl bg-secondary/50 border border-border/60 px-3 py-4">
              <MilestoneTracker status={task.status} />
            </div>
            <p className="text-muted-foreground whitespace-pre-wrap">{task.description}</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {task.location && <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-4 w-4" /><span>{task.location}</span></div>}
              {task.deadline && <div className="flex items-center gap-2 text-muted-foreground"><Calendar className="h-4 w-4" /><span>Due: {format(new Date(task.deadline), 'MMM d, yyyy')}</span></div>}
              <div className="flex items-center gap-2 text-muted-foreground"><Clock className="h-4 w-4" /><span>Posted: {format(new Date(task.created_at), 'MMM d, yyyy')}</span></div>
            </div>
            {task.attachment_url && (
              <div><p className="text-sm font-medium mb-2">Attachment</p><a href={task.attachment_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm">View attachment</a></div>
            )}
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => task.poster?.id && navigate(`/profile/${task.poster.id}`)}>
          <CardHeader className="pb-3"><CardTitle className="text-lg flex items-center justify-between">Posted By<span className="text-xs font-normal text-primary">View Profile →</span></CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12"><AvatarImage src={task.poster?.avatar_url || undefined} /><AvatarFallback>{task.poster?.full_name?.charAt(0) || 'U'}</AvatarFallback></Avatar>
              <div><p className="font-medium">{task.poster?.full_name || 'Anonymous'}</p></div>
            </div>
          </CardContent>
        </Card>

        {task.assignee && (
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => task.assignee?.id && navigate(`/profile/${task.assignee.id}`)}>
            <CardHeader className="pb-3"><CardTitle className="text-lg flex items-center justify-between"><span className="flex items-center gap-2"><User className="h-5 w-5" />Assigned To</span><span className="text-xs font-normal text-primary">View Profile →</span></CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12"><AvatarImage src={task.assignee?.avatar_url || undefined} /><AvatarFallback>{task.assignee?.full_name?.charAt(0) || 'U'}</AvatarFallback></Avatar>
                <div><p className="font-medium">{task.assignee?.full_name || 'Anonymous'}</p></div>
              </div>
            </CardContent>
          </Card>
        )}

        {isPoster && !task.assignee_id && applications.length > 0 && (
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-lg">Interested users</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {applications.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-9 w-9"><AvatarImage src={a.applicant?.avatar_url || undefined} /><AvatarFallback>{a.applicant?.full_name?.charAt(0) || 'U'}</AvatarFallback></Avatar>
                    <div className="min-w-0"><p className="font-medium truncate">{a.applicant?.full_name || 'Anonymous'}</p></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant={selectedApplicationId === a.id ? 'default' : 'secondary'} onClick={() => setSelectedApplicationId(a.id)}>Chat</Button>
                    <Button 
                      size="sm" 
                      onClick={() => handleHire(a.applicant_id, a.id)} 
                      disabled={actionLoading}
                    >
                      Hire
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {escrow && (
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-lg flex items-center gap-2"><Wallet className="h-5 w-5" />Payment Status</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between"><span className="text-muted-foreground">Escrow Status</span><Badge className={getStatusColor(escrow.status)}>{escrow.status}</Badge></div>
                <Separator />
                <div className="flex items-center justify-between"><span className="text-muted-foreground">Total Amount</span><span className="font-medium">₦{((escrow.amount_kobo || 0) / 100).toLocaleString()}</span></div>
                <div className="flex items-center justify-between"><span className="text-muted-foreground">Platform Fee (10%)</span><span className="font-medium">₦{((escrow.platform_fee_kobo || 0) / 100).toLocaleString()}</span></div>
                <div className="flex items-center justify-between text-primary"><span className="font-medium">Worker Receives</span><span className="font-bold">₦{workerEarnings.toLocaleString()}</span></div>
              </div>
            </CardContent>
          </Card>
        )}

        {(task.assignee_id && (isPoster || isAssignee)) && <TaskChat taskId={task.id} posterId={task.poster_id} participantId={task.assignee_id} applicationId={null} />}
        {!task.assignee_id && user && (isPoster || !!myApplicationId) && <TaskChat taskId={task.id} posterId={task.poster_id} participantId={isPoster ? (applications.find((a) => a.id === selectedApplicationId)?.applicant_id || '') : user.id} applicationId={isPoster ? selectedApplicationId : myApplicationId} />}

        <div className="flex flex-col gap-3 pb-8">
          {canApply && <Button size="lg" className="w-full" onClick={handleApply} disabled={actionLoading}>{actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Message poster</Button>}
          {!isPoster && !!myApplicationId && !task.assignee_id && <Button size="lg" variant="secondary" className="w-full" onClick={() => toast.message('Scroll up to the chat to continue.')}>Continue chat</Button>}
          {canStartWork && <Button size="lg" className="w-full" onClick={handleStartWork} disabled={actionLoading}>{actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Start Working</Button>}
          {canMarkAsDone && <Button size="lg" className="w-full" onClick={handleMarkAsDone} disabled={actionLoading}>{actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}Mark as Done</Button>}
          {canConfirmCompletion && (
            <div className="flex flex-col gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild><Button size="lg" className="w-full" disabled={actionLoading}><CheckCircle className="h-4 w-4 mr-2" />Confirm & Release Payment</Button></AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader><AlertDialogTitle>Confirm Work Completion</AlertDialogTitle><AlertDialogDescription>This will release ₦{workerEarnings.toLocaleString()} to the worker. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                  <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleConfirmCompletion}>{actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Release Payment</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <AlertDialog>
                <AlertDialogTrigger asChild><Button size="lg" variant="destructive" className="w-full" disabled={actionLoading}>Decline & Refund</Button></AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader><AlertDialogTitle>Decline Work?</AlertDialogTitle><AlertDialogDescription>This will refund the full amount to your wallet and cancel the task.</AlertDialogDescription></AlertDialogHeader>
                  <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeclineWork} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Decline & Refund</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
          {task.status === 'completed' && <div className="flex flex-col items-center gap-3 py-4"><div className="flex items-center gap-2 text-primary"><CheckCircle className="h-6 w-6" /><span className="font-semibold">Task Completed!</span></div>{canReview && <Button variant="outline" onClick={() => setShowReviewModal(true)}><Star className="h-4 w-4 mr-2" />Leave a Review</Button>}</div>}
          
          {/* DISPUTE BUTTONS */}
          {isAssignee && ['in_progress', 'cancelled', 'completed'].includes(task.status) && (
            <Button variant="outline" className="w-full border-red-200 text-red-600 hover:bg-red-50" onClick={() => setShowReportModal(true)} disabled={actionLoading}><ShieldAlert className="h-4 w-4 mr-2" />Report Issue / Scam</Button>
          )}

          {isPoster && task.status === 'disputed' && disputeId && (
            <Button variant="destructive" size="lg" className="w-full" onClick={() => setShowAppealModal(true)} disabled={actionLoading}><Scale className="h-4 w-4 mr-2" />File Defense Appeal</Button>
          )}

          {needsPayment && task.assignee_id && (
            <Button size="lg" className="w-full" onClick={() => handleHire(task.assignee_id!, null)} disabled={actionLoading}>{actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CreditCard className="h-4 w-4 mr-2" />}Complete Payment (Escrow)</Button>
          )}
          {(isPoster || isAssignee) && ['open', 'assigned', 'in_progress'].includes(task.status) && !(task.status === 'in_progress' && escrow?.status === 'held' && isPoster) && (
            <AlertDialog>
              <AlertDialogTrigger asChild><Button variant="destructive" size="lg" className="w-full">Cancel Task</Button></AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Cancel this task?</AlertDialogTitle><AlertDialogDescription>{escrow?.status === 'held' ? `Refunds ₦${((escrow.amount_kobo || 0) / 100).toLocaleString()}` : 'Removes task from marketplace.'}</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>Keep Task</AlertDialogCancel><AlertDialogAction onClick={handleCancelTask}>{actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Cancel Task</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {!user && <Button size="lg" className="w-full" onClick={() => navigate('/auth')}>Sign In to Apply</Button>}
        </div>
      </main>

      {task.assignee_id && <PayForGigModal open={showPayModal} onOpenChange={setShowPayModal} task={{ id: task.id, title: task.title, price_kobo: task.price_kobo, assignee_id: task.assignee_id }} />}
      {canReview && task.assignee && <ReviewModal open={showReviewModal} onOpenChange={setShowReviewModal} taskId={task.id} revieweeId={isPoster ? task.assignee_id! : task.poster_id} revieweeName={isPoster ? (task.assignee?.full_name || 'Worker') : (task.poster?.full_name || 'Poster')} onSuccess={() => setHasReviewed(true)} />}
      
      {task.assignee_id && <ReportScamModal open={showReportModal} onOpenChange={setShowReportModal} taskId={task.id} workerId={task.assignee_id} posterId={task.poster_id} taskTitle={task.title} onSuccess={fetchTask} />}
      {task.status === 'disputed' && disputeId && <AppealModal open={showAppealModal} onOpenChange={setShowAppealModal} disputeId={disputeId} taskId={task.id} posterId={task.poster_id} taskTitle={task.title} onSuccess={fetchTask} />}
    </div>
  );
}

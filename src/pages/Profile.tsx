import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserRating } from '@/components/UserRating';
import { TrustTierBadge } from '@/components/TrustTier';
import TrustScoreGauge from '@/components/TrustScoreGauge';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Loader2,
  Camera,
  User,
  Mail,
  Phone,
  CheckCircle2,
  Clock,
  Briefcase,
  LogOut,
  Star,
  Search,
  GraduationCap,
} from 'lucide-react';
import { format } from 'date-fns';

interface HistoryTask {
  id: string;
  title: string;
  price_kobo: number;
  category: string;
  status: string;
  created_at: string;
  poster_id: string;
  assignee_id: string | null;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  task_id: string;
  reviewer?: {
    full_name: string | null;
    avatar_url: string | null;
  };
  task?: {
    title: string;
  };
}

interface PastUser {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  university: string | null;
  email?: string;
}

export default function Profile() {
  const navigate = useNavigate();
  const { user, profile, loading, signOut, refreshProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  
  // Gig history
  const [historyTasks, setHistoryTasks] = useState<HistoryTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  
  // Reviews
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  
  // Past users search
  const [pastUsers, setPastUsers] = useState<PastUser[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    bio: '',
    skills: [] as string[],
    intro_video_url: '',
  });
  const [skillInput, setSkillInput] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (profile) {
      // Fetch full profile with bio/skills
      supabase.from('profiles').select('bio, skills, intro_video_url').eq('id', profile.id).single().then(({ data }) => {
        setForm({
          full_name: profile.full_name || '',
          phone: profile.phone || '',
          bio: (data as any)?.bio || '',
          skills: (data as any)?.skills || [],
          intro_video_url: (data as any)?.intro_video_url || '',
        });
      });
    }
  }, [profile]);

  useEffect(() => {
    if (user) {
      fetchHistoryTasks();
      fetchReviews();
      fetchPastUsers();
    }
  }, [user]);

  const fetchHistoryTasks = async () => {
    if (!user) return;

    // Fetch ALL gigs (posted + worked on) — not just completed as assignee
    const { data, error } = await supabase
      .from('tasks')
      .select('id, title, price_kobo, category, status, created_at, poster_id, assignee_id')
      .or(`poster_id.eq.${user.id},assignee_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setHistoryTasks(data);
    }
    setLoadingTasks(false);
  };

  const fetchReviews = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('reviews')
      .select(`
        id, rating, comment, created_at, task_id,
        reviewer:profiles!reviews_reviewer_id_fkey(full_name, avatar_url),
        task:tasks!reviews_task_id_fkey(title)
      `)
      .eq('reviewee_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setReviews(data as unknown as Review[]);
    }
    setLoadingReviews(false);
  };

  const fetchPastUsers = async () => {
    if (!user) return;

    // Get unique user IDs from tasks where this user was involved
    const { data: tasks } = await supabase
      .from('tasks')
      .select('poster_id, assignee_id')
      .or(`poster_id.eq.${user.id},assignee_id.eq.${user.id}`)
      .not('assignee_id', 'is', null);

    if (!tasks) {
      setLoadingUsers(false);
      return;
    }

    const userIds = new Set<string>();
    for (const task of tasks) {
      if (task.poster_id !== user.id) userIds.add(task.poster_id);
      if (task.assignee_id && task.assignee_id !== user.id) userIds.add(task.assignee_id);
    }

    if (userIds.size === 0) {
      setLoadingUsers(false);
      return;
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, university')
      .in('id', Array.from(userIds));

    if (profiles) {
      setPastUsers(profiles);
    }
    setLoadingUsers(false);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
    if (!ALLOWED.includes(file.type)) {
      toast.error('Only JPG, PNG or WebP images are allowed');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      // Always normalize the extension; never trust the user-supplied filename
      const safeExt = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
      const fileName = `${user.id}/avatar.${safeExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      await refreshProfile();
      toast.success('Avatar updated!');
    } catch (err) {
      toast.error('Failed to upload avatar');
      console.error(err);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: form.full_name,
          phone: form.phone,
          bio: form.bio || null,
          skills: form.skills.length > 0 ? form.skills : null,
          intro_video_url: form.intro_video_url?.trim() || null,
        } as any)
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
      setIsEditing(false);
      toast.success('Profile updated!');
    } catch (err) {
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const formatNaira = (kobo: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(kobo / 100);
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-2xl py-8 space-y-6">
          <Skeleton className="h-12 w-32" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  const completedAsWorker = historyTasks.filter(t => t.assignee_id === user?.id && t.status === 'completed');
  const totalEarnings = completedAsWorker.reduce((sum, t) => sum + t.price_kobo * 0.90, 0);
  const averageRating = reviews.length > 0 
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
    : 0;

  const filteredPastUsers = pastUsers.filter(u =>
    !userSearchQuery || 
    u.full_name?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    u.university?.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  const getStatusLabel = (task: HistoryTask) => {
    if (task.poster_id === user?.id) return 'Posted';
    return 'Worked';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      open: 'bg-green-500/10 text-green-600',
      assigned: 'bg-blue-500/10 text-blue-600',
      in_progress: 'bg-yellow-500/10 text-yellow-600',
      completed: 'bg-primary/10 text-primary',
      cancelled: 'bg-destructive/10 text-destructive',
    };
    return colors[status] || 'bg-muted text-muted-foreground';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container max-w-2xl py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold text-foreground">Profile</h1>
          </div>
          <Button variant="ghost" size="icon" onClick={handleSignOut}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="container max-w-2xl py-6 space-y-6">
        {/* Avatar & Name */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                    {profile.full_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={handleAvatarClick}
                  disabled={isUploadingAvatar}
                  className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors"
                >
                  {isUploadingAvatar ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
              <h2 className="text-xl font-bold text-foreground">
                {profile.full_name || 'University Student'}
              </h2>
              <p className="text-muted-foreground">{profile.email}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap justify-center">
                {profile.is_verified && (
                  <Badge className="bg-primary/10 text-primary border-0">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                )}
                <TrustTierBadge
                  completed={(profile as any).completed_gigs}
                  rating={averageRating}
                  isVerified={profile.is_verified}
                />
                {averageRating > 0 && (
                  <div className="flex items-center gap-1">
                    <UserRating rating={averageRating} />
                    <span className="text-xs text-muted-foreground">({reviews.length})</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold text-primary">{completedAsWorker.length}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold text-foreground">{historyTasks.length}</p>
              <p className="text-xs text-muted-foreground">Total Gigs</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold text-accent-foreground">{formatNaira(totalEarnings)}</p>
              <p className="text-xs text-muted-foreground">Earned</p>
            </CardContent>
          </Card>
        </div>

        {/* Profile Details */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Profile Details</CardTitle>
              {!isEditing && (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4" />
                Full Name
              </Label>
              {isEditing ? (
                <Input
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  placeholder="Your full name"
                />
              ) : (
                <p className="text-foreground font-medium">{profile.full_name || 'Not set'}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <p className="text-foreground font-medium">{profile.email}</p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" />
                Phone Number
              </Label>
              {isEditing ? (
                <Input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="e.g., 08012345678"
                />
              ) : (
                <p className="text-foreground font-medium">{profile.phone || 'Not set'}</p>
              )}
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">Bio</Label>
              {isEditing ? (
                <Textarea
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  placeholder="Tell people what you do..."
                  rows={3}
                />
              ) : (
                <p className="text-foreground font-medium">{form.bio || 'Not set'}</p>
              )}
            </div>

            {/* Skills */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">Skills</Label>
              {isEditing ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      placeholder="Type a skill and press Enter"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const skill = skillInput.trim();
                          if (skill && !form.skills.includes(skill)) {
                            setForm({ ...form, skills: [...form.skills, skill] });
                          }
                          setSkillInput('');
                        }
                      }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {form.skills.map((skill, i) => (
                      <Badge key={i} variant="secondary" className="cursor-pointer" onClick={() => {
                        setForm({ ...form, skills: form.skills.filter((_, idx) => idx !== i) });
                      }}>
                        {skill} ✕
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {form.skills.length > 0 ? form.skills.map((skill, i) => (
                    <Badge key={i} variant="secondary">{skill}</Badge>
                  )) : <p className="text-foreground font-medium">Not set</p>}
                </div>
              )}
            </div>

            {/* Intro video URL (15s preview shown on public profile) */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">Intro video URL <span className="text-xs">(15s, MP4 link)</span></Label>
              {isEditing ? (
                <Input
                  type="url"
                  value={form.intro_video_url}
                  onChange={(e) => setForm({ ...form, intro_video_url: e.target.value })}
                  placeholder="https://…/intro.mp4"
                />
              ) : form.intro_video_url ? (
                <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                  <video src={form.intro_video_url} controls playsInline className="h-full w-full object-cover" />
                </div>
              ) : (
                <p className="text-foreground font-medium">Not set</p>
              )}
            </div>

            {isEditing && (
              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsEditing(false)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaving} className="flex-1">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs: History, Reviews, People */}
        <Tabs defaultValue="history" className="space-y-4">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="history">
              <Briefcase className="h-4 w-4 mr-1" />
              History
            </TabsTrigger>
            <TabsTrigger value="reviews">
              <Star className="h-4 w-4 mr-1" />
              Reviews
            </TabsTrigger>
            <TabsTrigger value="people">
              <User className="h-4 w-4 mr-1" />
              People
            </TabsTrigger>
          </TabsList>

          {/* Gig History */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Gig History
                </CardTitle>
                <CardDescription>All gigs you've posted or worked on</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingTasks ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
                  </div>
                ) : historyTasks.length === 0 ? (
                  <div className="text-center py-8">
                    <Briefcase className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">No gig history yet</p>
                    <Button variant="outline" className="mt-4" onClick={() => navigate('/gigs')}>
                      Find Gigs
                    </Button>
                  </div>
                ) : (
                  <ScrollArea className="max-h-[400px]">
                    <div className="space-y-3">
                      {historyTasks.map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                          onClick={() => navigate(`/gigs/${task.id}`)}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">{task.title}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              <Badge variant="secondary" className="text-xs">{task.category}</Badge>
                              <Badge className={`text-xs ${getStatusColor(task.status)}`}>
                                {task.status.replace('_', ' ')}
                              </Badge>
                              <span>{getStatusLabel(task)}</span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(new Date(task.created_at), 'MMM d, yyyy')}
                              </span>
                            </div>
                          </div>
                          <p className="font-bold text-primary shrink-0 ml-2">
                            {formatNaira(task.price_kobo)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reviews */}
          <TabsContent value="reviews">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Reviews ({reviews.length})
                </CardTitle>
                {averageRating > 0 && (
                  <CardDescription className="flex items-center gap-2">
                    Average: {averageRating.toFixed(1)} / 5
                    <UserRating rating={averageRating} />
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {loadingReviews ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
                  </div>
                ) : reviews.length === 0 ? (
                  <div className="text-center py-8">
                    <Star className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">No reviews yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Complete gigs to receive reviews</p>
                  </div>
                ) : (
                  <ScrollArea className="max-h-[400px]">
                    <div className="space-y-4">
                      {reviews.map((review) => (
                        <div key={review.id} className="flex gap-4 p-4 rounded-lg bg-muted/50">
                          <Avatar className="h-10 w-10 shrink-0">
                            <AvatarImage src={review.reviewer?.avatar_url || undefined} />
                            <AvatarFallback>
                              {review.reviewer?.full_name?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-foreground truncate">
                                {review.reviewer?.full_name || 'Anonymous'}
                              </span>
                              <span className="text-xs text-muted-foreground shrink-0">
                                {format(new Date(review.created_at), 'MMM d, yyyy')}
                              </span>
                            </div>
                            <UserRating rating={review.rating} />
                            {review.task?.title && (
                              <p 
                                className="text-xs text-primary mt-1 cursor-pointer hover:underline"
                                onClick={() => navigate(`/gigs/${review.task_id}`)}
                              >
                                {review.task.title}
                              </p>
                            )}
                            {review.comment && (
                              <p className="text-sm text-muted-foreground mt-2">{review.comment}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Past Users / People */}
          <TabsContent value="people">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  People You've Worked With
                </CardTitle>
                <CardDescription>Search past clients and freelancers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, or university..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {loadingUsers ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
                  </div>
                ) : filteredPastUsers.length === 0 ? (
                  <div className="text-center py-8">
                    <User className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">
                      {userSearchQuery ? 'No matching users found' : 'No past collaborators yet'}
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="max-h-[400px]">
                    <div className="space-y-2">
                      {filteredPastUsers.map((u) => (
                        <div
                          key={u.id}
                          className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                          onClick={() => navigate(`/profile/${u.id}`)}
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={u.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {u.full_name?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">
                              {u.full_name || 'Anonymous'}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="truncate">{u.email}</span>
                              {u.university && (
                                <Badge variant="secondary" className="text-xs shrink-0">
                                  <GraduationCap className="h-3 w-3 mr-1" />
                                  {u.university.length > 20 ? u.university.substring(0, 20) + '...' : u.university}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

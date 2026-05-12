import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GigCardSkeleton } from '@/components/ui/skeleton';
import { DeleteGigButton } from '@/components/gigs/DeleteGigButton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Search,
  Filter,
  MapPin,
  Clock,
  Briefcase,
  ArrowLeft,
  User,
  Plus,
  Loader2,
  GraduationCap,
  Check,
} from 'lucide-react';
import { format } from 'date-fns';
import { NIGERIAN_UNIVERSITIES } from '@/lib/nigerianUniversities';
import { motion } from 'framer-motion';

const CATEGORIES = [
  'All Categories',
  'Laundry',
  'Food Delivery',
  'Assignment Help',
  'Tutoring',
  'Errands',
  'Tech Support',
  'Photography',
  'Other',
];

interface Task {
  id: string;
  title: string;
  description: string;
  category: string;
  price_kobo: number;
  status: string;
  location: string | null;
  deadline: string | null;
  poster_id: string;
  assignee_id: string | null;
  created_at: string;
  poster?: {
    full_name: string | null;
    avatar_url: string | null;
    university: string | null;
  };
}

export default function Gigs() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedUniversity, setSelectedUniversity] = useState('All Universities');
  const [applying, setApplying] = useState<string | null>(null);
  const [appliedGigIds, setAppliedGigIds] = useState<Set<string>>(new Set());

  // Fetch user's existing applications on mount
  useEffect(() => {
    if (!user) return;
    const fetchMyApplications = async () => {
      const { data } = await supabase
        .from('task_applications')
        .select('task_id')
        .eq('applicant_id', user.id);
      if (data) {
        setAppliedGigIds(new Set(data.map((a) => a.task_id)));
      }
    };
    fetchMyApplications();
  }, [user]);

  const fetchTasks = async () => {
    setLoading(true);
    
    let query = supabase
      .from('tasks')
      .select(`
        *,
        poster:profiles!tasks_poster_id_fkey(full_name, avatar_url, university)
      `)
      .eq('status', 'open')
      .order('created_at', { ascending: false });

    if (selectedCategory !== 'All Categories') {
      query = query.eq('category', selectedCategory);
    }

    if (searchQuery) {
      query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
    }

    const { data, error } = await query;

    if (!error && data) {
      let filteredData = data as Task[];
      if (selectedUniversity !== 'All Universities') {
        filteredData = filteredData.filter(task => 
          task.poster?.university === selectedUniversity
        );
      }
      setTasks(filteredData);
    } else {
      console.error('Error fetching tasks:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTasks();
  }, [selectedCategory, searchQuery, selectedUniversity]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('gigs-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        () => fetchTasks()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedCategory, searchQuery, selectedUniversity]);

  const handleApply = async (task: Task) => {
    if (!user) {
      toast.error('Please sign in to apply for gigs');
      navigate('/auth');
      return;
    }

    setApplying(task.id);
    
    try {
      const { data: created, error } = await supabase
        .from('task_applications')
        .insert({ task_id: task.id, applicant_id: user.id })
        .select('id')
        .single();

      if (error) {
        if (error.code === '23505') {
          setAppliedGigIds((prev) => new Set(prev).add(task.id));
          toast.info('You have already applied for this gig.');
          return;
        }
        throw error;
      }

      // Immediate UI update
      setAppliedGigIds((prev) => new Set(prev).add(task.id));
      toast.success('Application submitted!');

      // Background notifications
      const bgTasks = async () => {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', user.id)
            .single();

          // Notify applicant
          await supabase.from('notifications').insert({
            user_id: user.id,
            title: 'Application Submitted',
            body: `You have successfully applied for the gig: ${task.title}`,
            data: { taskId: task.id, applicationId: created.id },
          });

          // Notify poster
          await supabase.from('notifications').insert({
            user_id: task.poster_id,
            title: 'New Application',
            body: `${profile?.full_name || 'Someone'} applied to your gig: ${task.title}`,
            data: { taskId: task.id, applicationId: created.id },
          });

          // Push notification to poster
          supabase.functions.invoke('send-push-notification', {
            body: {
              userId: task.poster_id,
              title: 'New Application',
              body: `Someone wants to do: ${task.title}`,
              data: { taskId: task.id, applicationId: created.id },
            },
          }).catch(console.error);
        } catch (bgErr) {
          console.error('Background notification error:', bgErr);
        }
      };
      bgTasks();

    } catch (err) {
      console.error('Error applying:', err);
      toast.error('Failed to apply. The gig may no longer be available.');
    } finally {
      setApplying(null);
    }
  };

  const formatNaira = (kobo: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(kobo / 100);
  };

  const renderActionButton = (task: Task) => {
    // Poster sees their own badge + delete
    if (user?.id === task.poster_id) {
      return (
        <div className="flex items-center gap-2">
          <Badge variant="outline">Your Post</Badge>
          <div onClick={(e) => e.stopPropagation()}>
            <DeleteGigButton
              gigId={task.id}
              gigTitle={task.title}
              onDeleted={fetchTasks}
              variant="icon"
            />
          </div>
        </div>
      );
    }

    // Already applied
    if (appliedGigIds.has(task.id)) {
      return (
        <Button size="sm" variant="outline" disabled className="gap-1">
          <Check className="h-3 w-3" />
          Applied
        </Button>
      );
    }

    // Apply button
    return (
      <Button
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          handleApply(task);
        }}
        disabled={applying === task.id || !user}
      >
        {applying === task.id ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          'Apply'
        )}
      </Button>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gradient-hero">
        <div className="container max-w-4xl py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="text-primary-foreground hover:bg-primary-foreground/10"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-primary-foreground">Browse Gigs</h1>
                <p className="text-sm text-primary-foreground/70">Find tasks to earn money</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {user ? (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate('/profile')}
                    className="text-primary-foreground hover:bg-primary-foreground/10"
                  >
                    <User className="h-5 w-5" />
                  </Button>
                  <Button
                    size="sm"
                    className="bg-accent text-accent-foreground hover:bg-gold-dark"
                    onClick={() => navigate('/post-gig')}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Post
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  className="bg-accent text-accent-foreground hover:bg-gold-dark"
                  onClick={() => navigate('/auth')}
                >
                  Sign In
                </Button>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search gigs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card border-0"
            />
          </div>
        </div>
      </header>

      <main className="container max-w-4xl py-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select value={selectedUniversity} onValueChange={setSelectedUniversity}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                <SelectItem value="All Universities">All Universities</SelectItem>
                {NIGERIAN_UNIVERSITIES.map((uni) => (
                  <SelectItem key={uni} value={uni}>{uni}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results count */}
        <p className="text-sm text-muted-foreground">
          {loading ? 'Loading...' : `${tasks.length} gig${tasks.length !== 1 ? 's' : ''} available`}
        </p>

        {/* Task List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <GigCardSkeleton key={i} />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Briefcase className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">No gigs found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || selectedCategory !== 'All Categories'
                  ? 'Try adjusting your filters'
                  : 'Be the first to post a gig!'}
              </p>
              <Button onClick={() => navigate('/post-gig')}>
                <Plus className="h-4 w-4 mr-2" />
                Post a Gig
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => (
              <motion.div 
                key={task.id}
                whileHover={{ scale: 1.02, rotateX: 2, rotateY: 2 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                style={{ perspective: 1000 }}
              >
                <Card 
                  className="hover:shadow-md transition-shadow cursor-pointer glass"
                  onClick={() => navigate(`/gigs/${task.id}`)}
                >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-foreground truncate">
                          {task.title}
                        </h3>
                        <Badge variant="secondary" className="shrink-0">
                          {task.category}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {task.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {task.poster?.full_name || 'Anonymous'}
                        </span>
                        {task.poster?.university && (
                          <span className="flex items-center gap-1">
                            <GraduationCap className="h-3 w-3" />
                            {task.poster.university.length > 30 
                              ? task.poster.university.substring(0, 30) + '...' 
                              : task.poster.university}
                          </span>
                        )}
                        {task.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {task.location}
                          </span>
                        )}
                        {task.deadline && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(task.deadline), 'MMM d, h:mm a')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xl font-bold text-primary mb-2">
                        {formatNaira(task.price_kobo)}
                      </p>
                      {renderActionButton(task)}
                    </div>
                  </div>
                </CardContent>
              </Card>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* FAB */}
      <Button
        size="lg"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg"
        onClick={() => navigate('/post-gig')}
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
}

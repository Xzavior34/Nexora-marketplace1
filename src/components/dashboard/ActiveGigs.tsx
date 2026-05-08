import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Briefcase, Clock, MapPin, ArrowRight, Hammer, FileText } from 'lucide-react';
import { format } from 'date-fns';

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
}

interface ActiveGigsProps {
  userId: string;
}

export default function ActiveGigs({ userId }: ActiveGigsProps) {
  const navigate = useNavigate();
  const [doingTasks, setDoingTasks] = useState<Task[]>([]);
  const [postedTasks, setPostedTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    // Gigs I'm doing (assignee)
    const { data: doing } = await supabase
      .from('tasks')
      .select('*')
      .eq('assignee_id', userId)
      .in('status', ['assigned', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(10);

    // Gigs I posted
    const { data: posted } = await supabase
      .from('tasks')
      .select('*')
      .eq('poster_id', userId)
      .in('status', ['open', 'assigned', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(10);

    setDoingTasks((doing as Task[]) || []);
    setPostedTasks((posted as Task[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (userId) fetchTasks();
  }, [userId]);

  // Realtime: refresh when this user's tasks change
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`active-gigs-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `poster_id=eq.${userId}` }, () => fetchTasks())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `assignee_id=eq.${userId}` }, () => fetchTasks())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);
  const formatNaira = (kobo: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(kobo / 100);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-accent/20 text-accent-foreground border-accent';
      case 'assigned': return 'bg-primary/10 text-primary border-primary/30';
      case 'in_progress': return 'bg-blue-100 text-blue-700 border-blue-300';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const renderTaskList = (tasks: Task[], emptyLabel: string) => {
    if (tasks.length === 0) {
      return (
        <div className="text-center py-8">
          <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <Briefcase className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">{emptyLabel}</p>
          <div className="mt-4 flex gap-2 justify-center">
            <Button size="sm" onClick={() => navigate('/post-gig')}>Post a Gig</Button>
            <Button size="sm" variant="outline" onClick={() => navigate('/gigs')}>Browse Gigs</Button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="p-4 rounded-lg border border-border hover:border-primary/30 transition-colors cursor-pointer"
            onClick={() => navigate(`/gigs/${task.id}`)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-foreground truncate">{task.title}</h3>
                  <Badge variant="outline" className={getStatusColor(task.status)}>
                    {task.status.replace('_', ' ')}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-1 mb-2">{task.description}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {task.location && (
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{task.location}</span>
                  )}
                  {task.deadline && (
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{format(new Date(task.deadline), 'MMM d')}</span>
                  )}
                </div>
              </div>
              <p className="font-bold text-primary shrink-0">{formatNaira(task.price_kobo)}</p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle>Active Gigs</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {[1, 2].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-5 w-5" />
          Active Gigs
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => navigate('/gigs')}>
          View All <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="doing" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="doing" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Hammer className="h-3.5 w-3.5" />
              Gigs I'm Doing
              {doingTasks.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{doingTasks.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="posted" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <FileText className="h-3.5 w-3.5" />
              Gigs I Posted
              {postedTasks.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{postedTasks.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="doing">
            {renderTaskList(doingTasks, 'No gigs you\'re working on')}
          </TabsContent>
          <TabsContent value="posted">
            {renderTaskList(postedTasks, 'No gigs posted yet')}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

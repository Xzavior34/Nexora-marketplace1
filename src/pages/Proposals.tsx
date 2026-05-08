import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText,
  MessageCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Briefcase,
  ArrowRight,
} from 'lucide-react';
import { format } from 'date-fns';

interface Application {
  id: string;
  task_id: string;
  applicant_id: string;
  status: string;
  created_at: string;
  task?: {
    id: string;
    title: string;
    price_kobo: number;
    category: string;
    status: string;
    poster_id: string;
  };
}

export default function Proposals() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchApplications();
    }
  }, [user]);

  const fetchApplications = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('task_applications')
      .select(`
        id,
        task_id,
        applicant_id,
        status,
        created_at,
        task:tasks(id, title, price_kobo, category, status, poster_id)
      `)
      .eq('applicant_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching applications:', error);
    } else {
      setApplications(data as unknown as Application[]);
    }
    setLoading(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle2 className="h-4 w-4 text-primary" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
      accepted: 'bg-green-500/10 text-green-600 border-green-500/20',
      rejected: 'bg-red-500/10 text-red-600 border-red-500/20',
    };
    return variants[status] || 'bg-muted text-muted-foreground';
  };

  const formatNaira = (kobo: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(kobo / 100);
  };

  const pendingApps = applications.filter(a => a.status === 'pending');
  const acceptedApps = applications.filter(a => a.status === 'accepted');
  const rejectedApps = applications.filter(a => a.status === 'rejected');

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-10 w-48 mb-6" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const ApplicationCard = ({ app }: { app: Application }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {getStatusIcon(app.status)}
              <h3 className="font-semibold text-foreground truncate">
                {app.task?.title || 'Gig not found'}
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline" className="text-xs shrink-0">
                {app.task?.category}
              </Badge>
              <span className="shrink-0">{formatNaira(app.task?.price_kobo || 0)}</span>
              <span className="hidden sm:inline">•</span>
              <span className="shrink-0">{format(new Date(app.created_at), 'MMM d, yyyy')}</span>
            </div>
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-2 mt-2 sm:mt-0">
            <Badge className={getStatusBadge(app.status)}>
              {app.status}
            </Badge>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(`/gigs/${app.task_id}`)}
              >
                <MessageCircle className="h-4 w-4 mr-1" />
                Chat
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="px-2"
                onClick={() => navigate(`/gigs/${app.task_id}`)}
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">My Proposals</h1>
          <p className="text-muted-foreground">Track your gig applications and chat with posters</p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : applications.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">No proposals yet</h2>
              <p className="text-muted-foreground mb-4">
                Start applying to gigs to see them here
              </p>
              <Button onClick={() => navigate('/gigs')}>
                <Briefcase className="h-4 w-4 mr-2" />
                Browse Gigs
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="all" className="space-y-4">
            <TabsList className="w-full justify-start overflow-x-auto h-10">
              <TabsTrigger value="all">All ({applications.length})</TabsTrigger>
              <TabsTrigger value="pending">Pending ({pendingApps.length})</TabsTrigger>
              <TabsTrigger value="accepted">Accepted ({acceptedApps.length})</TabsTrigger>
              <TabsTrigger value="rejected">Rejected ({rejectedApps.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-3">
              {applications.map((app) => (
                <ApplicationCard key={app.id} app={app} />
              ))}
            </TabsContent>

            <TabsContent value="pending" className="space-y-3">
              {pendingApps.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No pending proposals</p>
              ) : (
                pendingApps.map((app) => (
                  <ApplicationCard key={app.id} app={app} />
                ))
              )}
            </TabsContent>

            <TabsContent value="accepted" className="space-y-3">
              {acceptedApps.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No accepted proposals</p>
              ) : (
                acceptedApps.map((app) => (
                  <ApplicationCard key={app.id} app={app} />
                ))
              )}
            </TabsContent>

            <TabsContent value="rejected" className="space-y-3">
              {rejectedApps.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No rejected proposals</p>
              ) : (
                rejectedApps.map((app) => (
                  <ApplicationCard key={app.id} app={app} />
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}

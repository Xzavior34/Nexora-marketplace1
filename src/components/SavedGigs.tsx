import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Bookmark, BookmarkCheck, Loader2 } from 'lucide-react';

interface SavedGig {
  id: string;
  task_id: string;
  task: {
    id: string;
    title: string;
    price_kobo: number;
    category: string;
    status: string;
  };
}

export function SavedGigs() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [savedGigs, setSavedGigs] = useState<SavedGig[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchSavedGigs();
    }
  }, [user]);

  const fetchSavedGigs = async () => {
    const { data, error } = await supabase
      .from('saved_gigs')
      .select(`
        id,
        task_id,
        task:tasks(id, title, price_kobo, category, status)
      `)
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const rows = data as unknown as SavedGig[];
      const valid = rows.filter((r) => !!r.task);
      const missing = rows.filter((r) => !r.task);

      // Auto-clean saved gigs that point to deleted tasks
      if (missing.length > 0) {
        const ids = missing.map((m) => m.id);
        await supabase.from('saved_gigs').delete().in('id', ids);
      }

      setSavedGigs(valid);
    }

    setLoading(false);
  };

  const handleRemove = async (savedGigId: string) => {
    setRemoving(savedGigId);
    
    const { error } = await supabase
      .from('saved_gigs')
      .delete()
      .eq('id', savedGigId);

    if (!error) {
      setSavedGigs(prev => prev.filter(g => g.id !== savedGigId));
      toast.success('Removed from saved gigs');
    } else {
      toast.error('Failed to remove');
    }
    setRemoving(null);
  };

  const formatNaira = (kobo: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(kobo / 100);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map(i => <Skeleton key={i} className="h-20 w-full" />)}
      </div>
    );
  }

  if (savedGigs.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Bookmark className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No saved gigs yet</p>
          <Button variant="link" onClick={() => navigate('/gigs')} className="mt-2">
            Browse gigs to save
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {savedGigs.map((saved) => (
        <Card 
          key={saved.id}
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate(`/gigs/${saved.task_id}`)}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium truncate">{saved.task?.title}</h4>
                <Badge variant="secondary" className="shrink-0 text-xs">
                  {saved.task?.category}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="font-medium text-primary">
                  {formatNaira(saved.task?.price_kobo || 0)}
                </span>
                <Badge 
                  variant={saved.task?.status === 'open' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {saved.task?.status}
                </Badge>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                handleRemove(saved.id);
              }}
              disabled={removing === saved.id}
            >
              {removing === saved.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <BookmarkCheck className="h-4 w-4 text-primary" />
              )}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

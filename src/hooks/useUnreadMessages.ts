import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export function useUnreadMessages() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    const fetchUnread = async () => {
      // Count messages where user is involved but didn't send the last message
      // Simple approach: count distinct conversations with unread messages
      const { data: tasks } = await (supabase as any)
        .from('task_applications_with_poster')
        .select('task_id, applicant_id, poster_id')
        .or(`applicant_id.eq.${user.id},poster_id.eq.${user.id}`);

      if (!tasks || tasks.length === 0) {
        setUnreadCount(0);
        return;
      }

      const taskIds = tasks.map((t: any) => t.task_id);
      
      // Get the latest message per task where sender is not the current user
      const { data: messages } = await supabase
        .from('messages')
        .select('task_id, sender_id, created_at')
        .in('task_id', taskIds)
        .neq('sender_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      // Simple heuristic: count unique tasks with recent messages not from this user
      const uniqueTasks = new Set(messages?.map(m => m.task_id) || []);
      setUnreadCount(uniqueTasks.size > 0 ? Math.min(uniqueTasks.size, 9) : 0);
    };

    fetchUnread();

    // Listen for new messages
    const channel = supabase
      .channel(`unread-messages-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, (payload) => {
        if (payload.new && (payload.new as any).sender_id !== user.id) {
          setUnreadCount(prev => prev + 1);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return unreadCount;
}

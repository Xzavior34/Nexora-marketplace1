import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const HEARTBEAT_INTERVAL = 2 * 60 * 1000; // 2 minutes in milliseconds

/**
 * Hook to track user online status by updating last_seen_at every 2 minutes.
 * This enables the smart messaging system to know if a user is online.
 */
export const useOnlineStatus = () => {
  const { user } = useAuth();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isUpdatingRef = useRef(false);

  const updateLastSeen = useCallback(async () => {
    if (!user?.id || isUpdatingRef.current) return;

    isUpdatingRef.current = true;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', user.id);

      if (error) {
        console.error('Failed to update last_seen_at:', error);
      }
    } catch (err) {
      console.error('Error updating online status:', err);
    } finally {
      isUpdatingRef.current = false;
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      // Clear interval if user logs out
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Update immediately when user becomes active
    updateLastSeen();

    // Set up interval for periodic updates
    intervalRef.current = setInterval(updateLastSeen, HEARTBEAT_INTERVAL);

    // Also update on visibility change (when user returns to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateLastSeen();
      }
    };

    // Update on user activity (throttled via the interval)
    const handleActivity = () => {
      // The interval handles regular updates, but we update immediately
      // when user returns from being away
      if (document.visibilityState === 'visible') {
        updateLastSeen();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleActivity);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleActivity);
    };
  }, [user?.id, updateLastSeen]);

  return { updateLastSeen };
};

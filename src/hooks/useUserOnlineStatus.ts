import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

interface OnlineStatusMap {
  [userId: string]: boolean;
}

/**
 * Hook to check if specific users are online based on their last_seen_at timestamp.
 * Returns a map of userId -> isOnline boolean.
 */
export const useUserOnlineStatus = (userIds: string[]) => {
  const [onlineStatus, setOnlineStatus] = useState<OnlineStatusMap>({});
  const [loading, setLoading] = useState(true);

  const checkOnlineStatus = useCallback(async () => {
    if (userIds.length === 0) {
      setOnlineStatus({});
      setLoading(false);
      return;
    }

    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, last_seen_at')
        .in('id', userIds);

      if (error) {
        console.error('Error fetching online status:', error);
        return;
      }

      const now = Date.now();
      const statusMap: OnlineStatusMap = {};

      for (const profile of profiles || []) {
        if (profile.last_seen_at) {
          const lastSeenAt = new Date(profile.last_seen_at).getTime();
          statusMap[profile.id] = (now - lastSeenAt) < ONLINE_THRESHOLD_MS;
        } else {
          statusMap[profile.id] = false;
        }
      }

      setOnlineStatus(statusMap);
    } catch (err) {
      console.error('Error checking online status:', err);
    } finally {
      setLoading(false);
    }
  }, [userIds.join(',')]);

  useEffect(() => {
    checkOnlineStatus();

    // Refresh online status every 30 seconds
    const interval = setInterval(checkOnlineStatus, 30000);

    return () => clearInterval(interval);
  }, [checkOnlineStatus]);

  return { onlineStatus, loading, refresh: checkOnlineStatus };
};

/**
 * Check if a single user is online
 */
export const isUserOnline = (lastSeenAt: string | null): boolean => {
  if (!lastSeenAt) return false;
  const now = Date.now();
  const lastSeen = new Date(lastSeenAt).getTime();
  return (now - lastSeen) < ONLINE_THRESHOLD_MS;
};

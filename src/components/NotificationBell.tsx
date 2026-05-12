import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';

export function NotificationBell() {
  const navigate = useNavigate();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, subscribeToPush } = useNotifications();
  const [open, setOpen] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  const handleSubscribe = async () => {
    setSubscribing(true);
    await subscribeToPush();
    setSubscribing(false);
  };

  const handleNotificationClick = async (notification: typeof notifications[0]) => {
    await markAsRead(notification.id);
    
    const data = notification.data as Record<string, string> | null;
    const title = notification.title?.toLowerCase() || '';
    const body = notification.body?.toLowerCase() || '';

    // NEW: Smart Routing - Check if it's marketplace/product related first
    const isMarketplace = 
      title.includes('product') || 
      title.includes('marketplace') || 
      body.includes('product') ||
      data?.productId ||
      data?.orderId;

    // Route based on priority
    if (data?.type === 'free_spin' && data?.taskId) {
      navigate(`/spin-to-win?taskId=${data.taskId}`);
    } else if (isMarketplace || title.includes('message') || data?.conversationId || data?.messageTaskId) {
      navigate('/messages');
    } else if (data?.applicationId && data?.taskId) {
      navigate(`/gigs/${data.taskId}`);
    } else if (data?.taskId) {
      navigate(`/gigs/${data.taskId}`);
    } else if (data?.profileId) {
      navigate(`/profile/${data.profileId}`);
    } else if (title.includes('withdrawal') || title.includes('payment')) {
      navigate('/dashboard');
    } else if (title.includes('review') || title.includes('rating')) {
      navigate('/profile');
    } else {
      // Default fallback
      navigate('/dashboard');
    }
    
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative group">
          <motion.div
            animate={unreadCount > 0 ? { rotate: [0, -10, 10, -10, 10, 0] } : {}}
            transition={{ duration: 0.5, repeat: unreadCount > 0 ? Infinity : 0, repeatDelay: 3 }}
            whileHover={{ scale: 1.1, rotate: 15 }}
          >
            <Bell className="h-5 w-5" />
          </motion.div>
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
              variant="destructive"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle>Notifications</SheetTitle>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                <CheckCheck className="h-4 w-4 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
        </SheetHeader>

        {'Notification' in window && Notification.permission === 'default' && (
          <Card className="mb-4">
            <CardContent className="py-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-sm">Enable push notifications</p>
                  <p className="text-xs text-muted-foreground">Get notified about updates instantly</p>
                </div>
                <Button size="sm" onClick={handleSubscribe} disabled={subscribing}>
                  {subscribing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enable'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <ScrollArea className="h-[calc(100vh-150px)]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((notification) => (
                <Card 
                  key={notification.id}
                  className={`cursor-pointer transition-colors ${
                    !notification.read ? 'bg-primary/5 border-primary/20' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`h-2 w-2 mt-2 rounded-full shrink-0 ${
                        !notification.read ? 'bg-primary' : 'bg-transparent'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{notification.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {notification.body}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

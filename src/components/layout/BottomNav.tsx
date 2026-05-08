import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Briefcase, Plus, MessageCircle, ShoppingBag, FileText, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface BottomNavProps {
  unreadMessages?: number;
}

const navItems = [
  { path: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { path: '/gigs', label: 'Gigs', icon: Briefcase },
  { path: '/marketplace', label: 'Shop', icon: ShoppingBag },
  { path: '/post-gig', label: 'Post', icon: Plus, isCenter: true },
  { path: '/leaderboard', label: 'Ranks', icon: Trophy },
  { path: '/messages', label: 'Inbox', icon: MessageCircle },
  { path: '/proposals', label: 'Jobs', icon: FileText },
];

export function BottomNav({ unreadMessages = 0 }: BottomNavProps) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const hiddenPaths = ['/', '/auth', '/verify-email', '/terms', '/privacy', '/reset-password'];
  if (!user || hiddenPaths.includes(location.pathname)) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      {/* Soft top fade for depth */}
      <div className="absolute inset-x-0 -top-4 h-4 bg-gradient-to-t from-background/80 to-transparent pointer-events-none" />
      <div className="bg-background/85 backdrop-blur-xl border-t border-border/60 shadow-[0_-4px_24px_-8px_hsl(158_25%_12%_/0.08)]">
        <div className="flex items-end justify-between h-[68px] px-1 safe-area-pb">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            const showBadge = item.path === '/messages' && unreadMessages > 0;

            if (item.isCenter) {
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="flex flex-col items-center justify-center -mt-6 px-1 group"
                  aria-label={item.label}
                >
                  <div className={cn(
                    'w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300',
                    'bg-gradient-to-br from-primary to-forest-dark text-primary-foreground',
                    'shadow-[0_8px_24px_-6px_hsl(158_32%_24%_/0.45)]',
                    'group-active:scale-90 group-hover:shadow-[0_10px_28px_-6px_hsl(158_32%_24%_/0.55)]',
                    isActive && 'ring-2 ring-accent/60 ring-offset-2 ring-offset-background'
                  )}>
                    <Icon className="h-5 w-5" strokeWidth={2.4} />
                  </div>
                  <span className="text-[9px] mt-1 font-semibold text-primary tracking-wide">{item.label}</span>
                </button>
              );
            }

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="relative flex flex-col items-center justify-center gap-1 min-w-[40px] flex-1 py-2 group"
                aria-label={item.label}
              >
                {/* Animated active pill */}
                <div
                  className={cn(
                    'absolute top-1 left-1/2 -translate-x-1/2 h-1 w-6 rounded-full bg-primary',
                    'transition-all duration-300 ease-out',
                    isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
                  )}
                />
                <div className="relative">
                  <Icon
                    className={cn(
                      'h-[22px] w-[22px] transition-all duration-300',
                      isActive
                        ? 'text-primary scale-110'
                        : 'text-muted-foreground group-active:scale-95'
                    )}
                    strokeWidth={isActive ? 2.4 : 1.8}
                  />
                  {showBadge && (
                    <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-accent text-accent-foreground text-[9px] font-bold flex items-center justify-center shadow-sm ring-2 ring-background">
                      {unreadMessages > 9 ? '9+' : unreadMessages}
                    </span>
                  )}
                </div>
                <span
                  className={cn(
                    'text-[9.5px] font-medium tracking-wide transition-colors duration-300',
                    isActive ? 'text-primary font-semibold' : 'text-muted-foreground'
                  )}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

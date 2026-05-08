import { cn } from '@/lib/utils';

interface OnlineIndicatorProps {
  isOnline: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showPulse?: boolean;
}

/**
 * Green dot indicator that shows when a user is online.
 * Positioned absolutely, meant to be placed inside a relative container.
 */
export const OnlineIndicator = ({ 
  isOnline, 
  size = 'md',
  className,
  showPulse = true 
}: OnlineIndicatorProps) => {
  if (!isOnline) return null;

  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  const borderClasses = {
    sm: 'ring-1',
    md: 'ring-2',
    lg: 'ring-2',
  };

  return (
    <span 
      className={cn(
        'absolute rounded-full bg-emerald-500 ring-background',
        sizeClasses[size],
        borderClasses[size],
        showPulse && 'animate-pulse',
        className
      )}
      aria-label="Online"
    />
  );
};

/**
 * Avatar wrapper that includes online indicator in the bottom-right corner.
 */
interface AvatarWithStatusProps {
  children: React.ReactNode;
  isOnline: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const AvatarWithStatus = ({ 
  children, 
  isOnline, 
  size = 'md',
  className 
}: AvatarWithStatusProps) => {
  const indicatorPosition = {
    sm: 'bottom-0 right-0',
    md: 'bottom-0 right-0',
    lg: '-bottom-0.5 -right-0.5',
  };

  return (
    <div className={cn('relative inline-block', className)}>
      {children}
      <OnlineIndicator 
        isOnline={isOnline} 
        size={size}
        className={indicatorPosition[size]}
      />
    </div>
  );
};

import { Check, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

const STAGES = [
  { key: 'open', label: 'Posted' },
  { key: 'assigned', label: 'Hired' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
];

const ORDER: Record<string, number> = {
  open: 0,
  assigned: 1,
  in_progress: 2,
  completed: 3,
  cancelled: -1,
  disputed: 2,
};

interface MilestoneTrackerProps {
  status: string;
  className?: string;
}

export function MilestoneTracker({ status, className }: MilestoneTrackerProps) {
  const currentIndex = ORDER[status] ?? 0;
  const isCancelled = status === 'cancelled';
  const isDisputed = status === 'disputed';

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between gap-1">
        {STAGES.map((stage, i) => {
          const reached = i <= currentIndex;
          const isCurrent = i === currentIndex && !isCancelled;
          return (
            <div key={stage.key} className="flex-1 flex flex-col items-center min-w-0">
              <div className="w-full flex items-center">
                {i > 0 && (
                  <div
                    className={cn(
                      'h-0.5 flex-1 transition-colors duration-500',
                      reached && !isCancelled ? 'bg-primary' : 'bg-border'
                    )}
                  />
                )}
                <div
                  className={cn(
                    'h-7 w-7 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 border-2',
                    isCancelled
                      ? 'bg-muted border-muted-foreground/30 text-muted-foreground'
                      : isDisputed && i === currentIndex
                      ? 'bg-destructive border-destructive text-destructive-foreground animate-pulse'
                      : reached
                      ? 'bg-primary border-primary text-primary-foreground'
                      : 'bg-background border-border text-muted-foreground',
                    isCurrent && 'ring-4 ring-primary/15'
                  )}
                >
                  {reached && !isCancelled ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Circle className="h-2 w-2 fill-current" />
                  )}
                </div>
                {i < STAGES.length - 1 && (
                  <div
                    className={cn(
                      'h-0.5 flex-1 transition-colors duration-500',
                      i < currentIndex && !isCancelled ? 'bg-primary' : 'bg-border'
                    )}
                  />
                )}
              </div>
              <span
                className={cn(
                  'text-[10px] sm:text-xs mt-2 font-medium text-center truncate w-full',
                  reached && !isCancelled ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
      {isCancelled && (
        <p className="text-xs text-center text-destructive mt-3 font-medium">Task was cancelled</p>
      )}
      {isDisputed && (
        <p className="text-xs text-center text-destructive mt-3 font-medium">
          ⚠️ In Dispute — Escrow frozen pending review
        </p>
      )}
    </div>
  );
}

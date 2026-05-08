import { cn } from "@/lib/utils";

/**
 * Premium shimmer skeleton — quiet luxury baseline.
 * Replaces all <Loader2 /> spinners across the app.
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl bg-muted/70",
        "before:absolute before:inset-0 before:-translate-x-full",
        "before:animate-[shimmer_1.8s_infinite]",
        "before:bg-gradient-to-r before:from-transparent before:via-background/60 before:to-transparent",
        className
      )}
      {...props}
    />
  );
}

/* ---------- Content-shaped presets ---------- */

export function GigCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3 shadow-sm">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-1/2" />
          <Skeleton className="h-2.5 w-1/3" />
        </div>
      </div>
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-3/4" />
      <div className="flex items-center justify-between pt-2">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-8 w-24 rounded-xl" />
      </div>
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex items-center justify-between pt-1">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-6 w-6 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function MessageRowSkeleton() {
  return (
    <div className="flex items-center gap-3 p-4 border-b border-border/40">
      <Skeleton className="h-12 w-12 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex justify-between">
          <Skeleton className="h-3.5 w-1/3" />
          <Skeleton className="h-2.5 w-12" />
        </div>
        <Skeleton className="h-3 w-4/5" />
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-2 shadow-sm">
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-7 w-3/4" />
      <Skeleton className="h-2.5 w-2/5" />
    </div>
  );
}

export function ProfileHeaderSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4">
      <Skeleton className="h-20 w-20 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-3 w-1/4" />
      </div>
    </div>
  );
}

export function ListSkeleton({ count = 4, Item = GigCardSkeleton }: { count?: number; Item?: React.ComponentType }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <Item key={i} />
      ))}
    </div>
  );
}

export function GridSkeleton({ count = 6, Item = ProductCardSkeleton }: { count?: number; Item?: React.ComponentType }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <Item key={i} />
      ))}
    </div>
  );
}

export { Skeleton };

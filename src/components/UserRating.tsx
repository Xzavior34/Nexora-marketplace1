import { Star } from 'lucide-react';

interface UserRatingProps {
  rating: number;
  count?: number;
  showCount?: boolean;
  size?: 'sm' | 'md';
}

export function UserRating({ rating, count = 0, showCount = true, size = 'sm' }: UserRatingProps) {
  const starSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  
  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${starSize} ${
              star <= rating
                ? 'fill-amber-400 text-amber-400'
                : star - 0.5 <= rating
                ? 'fill-amber-400/50 text-amber-400'
                : 'text-muted-foreground/30'
            }`}
          />
        ))}
      </div>
      {showCount && (
        <span className="text-xs text-muted-foreground">
          {rating > 0 ? rating.toFixed(1) : 'No ratings'}
          {count > 0 && ` (${count})`}
        </span>
      )}
    </div>
  );
}

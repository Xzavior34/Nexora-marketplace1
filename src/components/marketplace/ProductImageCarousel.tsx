import { useState } from 'react';
import { ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductImageCarouselProps {
  images: string[];
  alt: string;
  className?: string;
}

export function ProductImageCarousel({ images, alt, className }: ProductImageCarouselProps) {
  const [index, setIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const valid = images.filter(Boolean);

  if (valid.length === 0) {
    return (
      <div className={cn('w-full h-full flex items-center justify-center bg-muted', className)}>
        <ImageIcon className="h-10 w-10 text-muted-foreground" />
      </div>
    );
  }

  const prev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIndex((i) => (i - 1 + valid.length) % valid.length);
  };
  const next = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIndex((i) => (i + 1) % valid.length);
  };

  const onTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX);
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const delta = e.changedTouches[0].clientX - touchStart;
    if (Math.abs(delta) > 40 && valid.length > 1) {
      setIndex((i) => (delta < 0 ? (i + 1) % valid.length : (i - 1 + valid.length) % valid.length));
    }
    setTouchStart(null);
  };

  return (
    <div
      className={cn('relative w-full h-full overflow-hidden group/carousel touch-pan-y select-none', className)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <img
        src={valid[index]}
        alt={alt}
        loading="lazy"
        draggable={false}
        className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
      />
      {valid.length > 1 && (
        <>
          <button
            onClick={prev}
            aria-label="Previous image"
            className="absolute left-1.5 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-background/80 backdrop-blur shadow-md flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={next}
            aria-label="Next image"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-background/80 backdrop-blur shadow-md flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1">
            {valid.map((_, i) => (
              <span
                key={i}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  i === index ? 'w-4 bg-white' : 'w-1.5 bg-white/60'
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

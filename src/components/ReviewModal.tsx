import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, Star } from 'lucide-react';

interface ReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  revieweeId: string;
  revieweeName: string;
  onSuccess?: () => void;
}

export function ReviewModal({ 
  open, 
  onOpenChange, 
  taskId, 
  revieweeId, 
  revieweeName,
  onSuccess 
}: ReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    setLoading(true);
    
    try {
      const { error } = await supabase.from('reviews').insert({
        task_id: taskId,
        reviewer_id: (await supabase.auth.getUser()).data.user?.id,
        reviewee_id: revieweeId,
        rating,
        comment: comment.trim() || null,
      });

      if (error) throw error;

      toast.success('Review submitted! Thank you for your feedback.');
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      console.error('Review error:', err);
      if (err.message?.includes('duplicate')) {
        toast.error('You have already reviewed this task');
      } else {
        toast.error('Failed to submit review');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rate Your Experience</DialogTitle>
          <DialogDescription>
            How was your experience working with {revieweeName}?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Star Rating */}
          <div className="flex justify-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star
                  className={`h-8 w-8 transition-colors ${
                    star <= (hoveredRating || rating)
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-muted-foreground'
                  }`}
                />
              </button>
            ))}
          </div>

          <div className="text-center text-sm text-muted-foreground">
            {rating === 1 && 'Poor'}
            {rating === 2 && 'Fair'}
            {rating === 3 && 'Good'}
            {rating === 4 && 'Very Good'}
            {rating === 5 && 'Excellent'}
          </div>

          {/* Comment */}
          <Textarea
            placeholder="Share details about your experience (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
          />
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Skip
          </Button>
          <Button onClick={handleSubmit} disabled={loading || rating === 0} className="flex-1">
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Submit Review
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

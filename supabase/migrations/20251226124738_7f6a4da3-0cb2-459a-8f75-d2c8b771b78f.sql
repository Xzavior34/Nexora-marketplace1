-- Create reviews table for rating workers after task completion
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(task_id, reviewer_id)
);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view reviews
CREATE POLICY "Anyone can view reviews"
ON public.reviews
FOR SELECT
USING (true);

-- Policy: Users can create reviews for tasks they were involved in
CREATE POLICY "Users can create reviews for completed tasks"
ON public.reviews
FOR INSERT
WITH CHECK (
  auth.uid() = reviewer_id AND
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_id
    AND t.status = 'completed'
    AND (t.poster_id = auth.uid() OR t.assignee_id = auth.uid())
  )
);

-- Add skills array to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS completed_gigs INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS average_rating NUMERIC(2,1) DEFAULT 0;

-- Create saved_gigs table for bookmarking
CREATE TABLE public.saved_gigs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, task_id)
);

-- Enable RLS
ALTER TABLE public.saved_gigs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage their saved gigs
CREATE POLICY "Users can view their saved gigs"
ON public.saved_gigs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can save gigs"
ON public.saved_gigs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave gigs"
ON public.saved_gigs FOR DELETE
USING (auth.uid() = user_id);

-- Enable realtime for reviews
ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;
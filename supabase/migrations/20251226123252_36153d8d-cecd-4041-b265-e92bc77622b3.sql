-- Create messages table for in-app chat between poster and applicants/assignee
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can send messages if they are the poster OR the assignee of the task
CREATE POLICY "Users can insert messages for their tasks"
ON public.messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_id
    AND (t.poster_id = auth.uid() OR t.assignee_id = auth.uid())
  )
);

-- Policy: Users can view messages if they are the poster OR the assignee of the task
CREATE POLICY "Users can view messages for their tasks"
ON public.messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_id
    AND (t.poster_id = auth.uid() OR t.assignee_id = auth.uid())
  )
);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;